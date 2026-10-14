import { TABLES } from '../config';
import { tableApi } from './BaseService';
import { toInt, toNumber } from '../utils/format';

const CART_FIELDS = [
  'sys_id', 'u_quantity', 'u_product', 'u_product.u_name', 'u_product.u_brand', 'u_product.u_price',
  'u_product.u_mrp', 'u_product.u_stock', 'u_product.u_image_url',
].join(',');

const mapCartItem = (r) => ({
  id: r.sys_id,
  productId: r.u_product,
  quantity: toInt(r.u_quantity),
  name: r['u_product.u_name'],
  brand: r['u_product.u_brand'],
  price: toNumber(r['u_product.u_price']),
  mrp: toNumber(r['u_product.u_mrp']),
  stock: toInt(r['u_product.u_stock']),
  imageUrl: r['u_product.u_image_url'],
});

export async function listCart(userId) {
  const { records } = await tableApi.list(TABLES.cartItem, {
    query: `u_user=${userId}^ORDERBYsys_created_on`,
    fields: CART_FIELDS,
  });
  return records.map(mapCartItem).filter((i) => i.productId);
}

export const addCartItem = (userId, productId, quantity) =>
  tableApi.create(TABLES.cartItem, { u_user: userId, u_product: productId, u_quantity: quantity }, { fields: 'sys_id' });

export const updateCartItem = (id, quantity) => tableApi.update(TABLES.cartItem, id, { u_quantity: quantity }, { fields: 'sys_id' });

export const removeCartItem = (id) => tableApi.remove(TABLES.cartItem, id);
