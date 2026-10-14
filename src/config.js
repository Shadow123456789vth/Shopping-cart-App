export const APP_NAME = 'ShopNow';

export const LOCALE = 'en-IN';
export const CURRENCY = 'INR';

export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING_FEE = 40;
export const TAX_RATE = 0; // prices are tax-inclusive; set e.g. 0.18 to add tax at checkout
export const MAX_QTY_PER_ITEM = 10;
export const PAGE_SIZE = 24;

export const TABLES = {
  category: 'u_shop_category',
  product: 'u_shop_product',
  cartItem: 'u_shop_cart_item',
  address: 'u_shop_address',
  order: 'u_shop_order',
  orderItem: 'u_shop_order_item',
  payment: 'u_shop_payment',
};
