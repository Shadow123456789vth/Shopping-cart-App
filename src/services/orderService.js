import { TABLES } from '../config';
import { tableApi } from './BaseService';
import { getProductsByIds } from './productService';
import { computeTotals, formatAddress, toInt, toNumber } from '../utils/format';

const ORDER_FIELDS = 'sys_id,u_number,u_status,u_subtotal,u_shipping,u_tax,u_total,u_shipping_address,u_payment_method,u_paid_on,sys_created_on';
const ORDER_ITEM_FIELDS = 'sys_id,u_order,u_product,u_product_name,u_image_url,u_unit_price,u_quantity,u_line_total';

export const ORDER_STATUS = {
  pending: { label: 'Pending payment', color: 'warning' },
  payment_failed: { label: 'Payment failed', color: 'error' },
  confirmed: { label: 'Confirmed (Pay on delivery)', color: 'info' },
  paid: { label: 'Paid', color: 'success' },
  shipped: { label: 'Shipped', color: 'info' },
  delivered: { label: 'Delivered', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'default' },
};

const mapOrder = (r) => ({
  id: r.sys_id,
  number: r.u_number,
  status: r.u_status,
  subtotal: toNumber(r.u_subtotal),
  shipping: toNumber(r.u_shipping),
  tax: toNumber(r.u_tax),
  total: toNumber(r.u_total),
  shippingAddress: r.u_shipping_address,
  paymentMethod: r.u_payment_method,
  paidOn: r.u_paid_on,
  createdOn: r.sys_created_on,
});

const mapOrderItem = (r) => ({
  id: r.sys_id,
  orderId: r.u_order,
  productId: r.u_product,
  name: r.u_product_name,
  imageUrl: r.u_image_url,
  unitPrice: toNumber(r.u_unit_price),
  quantity: toInt(r.u_quantity),
  lineTotal: toNumber(r.u_line_total),
});

/**
 * Creates the order + order items from the cart. Prices are re-read from the product table;
 * the "Order item pricing" business rule re-applies them server-side as well.
 */
export async function createOrder({ userId, cartItems, address }) {
  const products = await getProductsByIds(cartItems.map((i) => i.productId));
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  const lines = cartItems.map((item) => {
    const product = byId[item.productId];
    if (!product) throw new Error(`"${item.name}" is no longer available.`);
    if (product.stock < item.quantity) throw new Error(`Only ${product.stock} left of "${product.name}". Update your cart.`);
    return { ...item, price: product.price, name: product.name, imageUrl: product.imageUrl };
  });

  const totals = computeTotals(lines);
  const order = await tableApi.create(TABLES.order, {
    u_user: userId,
    u_status: 'pending',
    u_subtotal: totals.subtotal,
    u_shipping: totals.shipping,
    u_tax: totals.tax,
    u_total: totals.total,
    u_address: address.id,
    u_shipping_address: formatAddress(address),
  }, { fields: ORDER_FIELDS });

  await Promise.all(lines.map((line) => tableApi.create(TABLES.orderItem, {
    u_order: order.sys_id,
    u_product: line.productId,
    u_product_name: line.name,
    u_image_url: line.imageUrl,
    u_unit_price: line.price,
    u_quantity: line.quantity,
    u_line_total: line.price * line.quantity,
  }, { fields: 'sys_id' })));

  return mapOrder(order);
}

async function listOrderItems(orderIds) {
  if (!orderIds.length) return [];
  const { records } = await tableApi.list(TABLES.orderItem, { query: `u_orderIN${orderIds.join(',')}`, fields: ORDER_ITEM_FIELDS });
  return records.map(mapOrderItem);
}

export async function listOrders(userId) {
  const { records } = await tableApi.list(TABLES.order, {
    query: `u_user=${userId}^ORDERBYDESCsys_created_on`,
    fields: ORDER_FIELDS,
    limit: 50,
  });
  const orders = records.map(mapOrder);
  const items = await listOrderItems(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export async function getOrder(id) {
  const [order, items] = await Promise.all([tableApi.get(TABLES.order, id, { fields: ORDER_FIELDS }), listOrderItems([id])]);
  return { ...mapOrder(order), items };
}
