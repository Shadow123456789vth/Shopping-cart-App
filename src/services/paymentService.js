import { TABLES } from '../config';
import { tableApi } from './BaseService';
import { toNumber } from '../utils/format';

const PAYMENT_FIELDS = 'sys_id,u_order,u_amount,u_method,u_status,u_transaction_id,u_card_brand,u_card_last4,u_upi_id,u_failure_reason,sys_created_on';

export const PAYMENT_METHODS = {
  card: 'Credit / Debit Card',
  upi: 'UPI',
  cod: 'Cash on Delivery',
};

const mapPayment = (r) => ({
  id: r.sys_id,
  orderId: r.u_order,
  amount: toNumber(r.u_amount),
  method: r.u_method,
  status: r.u_status,
  transactionId: r.u_transaction_id,
  cardBrand: r.u_card_brand,
  cardLast4: r.u_card_last4,
  upiId: r.u_upi_id,
  failureReason: r.u_failure_reason,
  createdOn: r.sys_created_on,
});

export const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

export function luhnValid(number) {
  const digits = digitsOnly(number);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(number) {
  const n = digitsOnly(number);
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^(60|65|81|82|508)/.test(n)) return 'RuPay';
  return 'Card';
}

export function validateExpiry(mmyy) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(mmyy || '');
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export const UPI_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

/**
 * DEMO payment gateway. Card numbers and CVVs never leave the browser; only brand + last 4
 * are stored. Test declines: card ending 0002, or UPI id "fail@upi".
 * Replace with a real gateway (Razorpay/Stripe) whose result is verified server-side.
 */
async function mockGateway(method, details) {
  await new Promise((r) => setTimeout(r, 1200));
  const txn = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  if (method === 'cod') return { status: 'pending', transactionId: `COD${Date.now()}` };
  if (method === 'card' && digitsOnly(details.cardNumber).endsWith('0002')) {
    return { status: 'failed', transactionId: txn, failureReason: 'Card declined by issuer' };
  }
  if (method === 'upi' && details.upiId.toLowerCase() === 'fail@upi') {
    return { status: 'failed', transactionId: txn, failureReason: 'UPI request rejected' };
  }
  return { status: 'success', transactionId: txn };
}

export async function payForOrder({ order, userId, method, details }) {
  const result = await mockGateway(method, details);
  const record = {
    u_order: order.id,
    u_user: userId,
    u_amount: order.total,
    u_method: method,
    u_status: result.status,
    u_transaction_id: result.transactionId,
    u_failure_reason: result.failureReason || '',
  };
  if (method === 'card') {
    record.u_card_brand = detectCardBrand(details.cardNumber);
    record.u_card_last4 = digitsOnly(details.cardNumber).slice(-4);
  }
  if (method === 'upi') record.u_upi_id = details.upiId;

  // The "Finalize order on payment" business rule updates the order, stock and cart.
  return mapPayment(await tableApi.create(TABLES.payment, record, { fields: PAYMENT_FIELDS }));
}

export async function listPayments(orderId) {
  const { records } = await tableApi.list(TABLES.payment, { query: `u_order=${orderId}^ORDERBYDESCsys_created_on`, fields: PAYMENT_FIELDS });
  return records.map(mapPayment);
}
