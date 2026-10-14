import { TABLES } from '../config';
import { sanitizeQueryValue, tableApi } from './BaseService';
import { toBool, toInt, toNumber } from '../utils/format';

const PRODUCT_FIELDS = [
  'sys_id', 'u_name', 'u_sku', 'u_brand', 'u_description', 'u_category', 'u_category.u_name',
  'u_price', 'u_mrp', 'u_stock', 'u_image_url', 'u_rating', 'u_rating_count', 'u_featured',
].join(',');

export const mapProduct = (r) => ({
  id: r.sys_id,
  name: r.u_name,
  sku: r.u_sku,
  brand: r.u_brand,
  description: r.u_description,
  categoryId: r.u_category,
  categoryName: r['u_category.u_name'],
  price: toNumber(r.u_price),
  mrp: toNumber(r.u_mrp),
  stock: toInt(r.u_stock),
  imageUrl: r.u_image_url,
  rating: toNumber(r.u_rating),
  ratingCount: toInt(r.u_rating_count),
  featured: toBool(r.u_featured),
});

export const SORT_OPTIONS = {
  featured: { label: 'Featured', order: 'ORDERBYDESCu_featured^ORDERBYDESCu_rating_count' },
  price_asc: { label: 'Price: Low to High', order: 'ORDERBYu_price' },
  price_desc: { label: 'Price: High to Low', order: 'ORDERBYDESCu_price' },
  rating: { label: 'Avg. Customer Review', order: 'ORDERBYDESCu_rating' },
  newest: { label: 'Newest Arrivals', order: 'ORDERBYDESCsys_created_on' },
};

export async function listProducts({ search, categoryId, sort = 'featured', limit, offset } = {}) {
  const q = ['u_active=true'];
  if (categoryId) q.push(`u_category=${sanitizeQueryValue(categoryId)}`);
  const term = search ? sanitizeQueryValue(search) : '';
  if (term) q.push(`u_nameLIKE${term}^ORu_brandLIKE${term}^ORu_descriptionLIKE${term}`);
  q.push((SORT_OPTIONS[sort] || SORT_OPTIONS.featured).order);

  const { records, total } = await tableApi.list(TABLES.product, { query: q.join('^'), fields: PRODUCT_FIELDS, limit, offset });
  return { products: records.map(mapProduct), total };
}

export async function getProduct(id) {
  return mapProduct(await tableApi.get(TABLES.product, id, { fields: PRODUCT_FIELDS }));
}

export async function getProductsByIds(ids) {
  if (!ids.length) return [];
  const { records } = await tableApi.list(TABLES.product, { query: `sys_idIN${ids.join(',')}`, fields: PRODUCT_FIELDS });
  return records.map(mapProduct);
}

export async function listCategories() {
  const { records } = await tableApi.list(TABLES.category, {
    query: 'u_active=true^ORDERBYu_sort_order^ORDERBYu_name',
    fields: 'sys_id,u_name,u_description,u_image_url',
  });
  return records.map((r) => ({ id: r.sys_id, name: r.u_name, description: r.u_description, imageUrl: r.u_image_url }));
}
