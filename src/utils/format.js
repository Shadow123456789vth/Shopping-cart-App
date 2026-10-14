import { CURRENCY, FREE_SHIPPING_THRESHOLD, LOCALE, SHIPPING_FEE, TAX_RATE } from '../config';

const priceFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 });

export const formatPrice = (value) => priceFormatter.format(Number(value) || 0);

export const toNumber = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export const toInt = (value) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
};

export const toBool = (value) => value === true || value === 'true' || value === '1';

export const round2 = (n) => Math.round(n * 100) / 100;

export const discountPercent = (price, mrp) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

// Table API (sysparm_display_value=false) returns glide_date_time as UTC "YYYY-MM-DD HH:mm:ss".
export const parseGlideDate = (value) => (value ? new Date(`${value.replace(' ', 'T')}Z`) : null);

export const formatDate = (value) => {
  const d = parseGlideDate(value);
  return d ? d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

export function computeTotals(items) {
  const subtotal = round2(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = round2(subtotal * TAX_RATE);
  return { subtotal, shipping, tax, total: round2(subtotal + shipping + tax) };
}

export const formatAddress = (a) =>
  [a.fullName, a.line1, a.line2, `${a.city}${a.state ? `, ${a.state}` : ''} ${a.postalCode}`, a.country, a.phone && `Phone: ${a.phone}`]
    .filter(Boolean)
    .join('\n');
