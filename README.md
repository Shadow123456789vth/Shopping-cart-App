# ShopNow – Amazon-style shopping app on ServiceNow

React 18 + MUI 6 storefront (login, product catalogue, cart, checkout with payment, order history). ServiceNow is the database, accessed through the REST Table API.

```
servicenow/            Background scripts: data model, seed data, ACLs, business rules
src/services/          Table API clients (BaseService handles auth headers)
src/context/           Auth, Cart, Notification providers
src/pages/             Login, Home (catalogue), Product, Cart, Checkout, Orders, Order detail
```

## 1. Data model

| Table | Purpose | Key fields |
|---|---|---|
| `u_shop_category` | Product categories | `u_name`, `u_description`, `u_image_url`, `u_sort_order`, `u_active` |
| `u_shop_product` | Catalogue | `u_name`, `u_sku`, `u_brand`, `u_description`, `u_category`→category, `u_price`, `u_mrp`, `u_stock`, `u_image_url`, `u_rating`, `u_rating_count`, `u_featured`, `u_active` |
| `u_shop_cart_item` | One row per product in a user's cart | `u_user`→sys_user, `u_product`→product, `u_quantity` |
| `u_shop_address` | Saved delivery addresses | `u_user`, `u_full_name`, `u_phone`, `u_line1/2`, `u_city`, `u_state`, `u_postal_code`, `u_country`, `u_is_default` |
| `u_shop_order` | Order header (auto-number `ORD0001000`) | `u_number`, `u_user`, `u_status`, `u_subtotal`, `u_shipping`, `u_tax`, `u_total`, `u_address`, `u_shipping_address` (snapshot), `u_payment_method`, `u_paid_on` |
| `u_shop_order_item` | Order lines (price snapshot) | `u_order`→order, `u_product`, `u_product_name`, `u_image_url`, `u_unit_price`, `u_quantity`, `u_line_total` |
| `u_shop_payment` | Payment attempts | `u_order`, `u_user`, `u_amount`, `u_method` (card/upi/cod), `u_status` (initiated/pending/success/failed/refunded), `u_transaction_id`, `u_card_brand`, `u_card_last4`, `u_upi_id`, `u_failure_reason` |

```
u_shop_category 1──< u_shop_product
sys_user 1──< u_shop_cart_item >──1 u_shop_product
sys_user 1──< u_shop_address
sys_user 1──< u_shop_order 1──< u_shop_order_item >──1 u_shop_product
              u_shop_order 1──< u_shop_payment
```

Logins use the platform's own `sys_user` table; there is no separate user table.

## 2. ServiceNow setup (dev402340)

Open **System Definition → Scripts - Background** at https://dev402340.service-now.com, keep scope **global**, then paste and run each file in order:

1. `servicenow/01_create_tables.js`: creates the 7 tables, fields, choice lists and order numbering (GlideRecord on `sys_db_object`, `sys_dictionary`, `sys_choice`, `sys_number`).
2. `servicenow/02_seed_data.js`: 5 categories and 17 products.
3. `servicenow/04_business_rules.js`: server-side integrity:
   - stamps `u_user` with the caller on insert, and restricts queries to the caller's own rows (admins see everything)
   - copies price, name and image from the product onto each order line and checks stock
   - on a successful or COD payment, sets the order to paid/confirmed, decrements stock and clears the cart
4. `servicenow/03_create_acls.js` (only for non-admin shoppers): elevate to **security_admin** first. It creates the role `u_shop_customer` and its ACLs. Assign that role to your shopper users.

All scripts are idempotent, so they're safe to re-run.

## 3. Run locally

```bash
cp .env.example .env.local     # SN_INSTANCE_URL=https://dev402340.service-now.com
npm install
npm run dev                    # http://localhost:5173
```

Sign in with a ServiceNow user name and password (`admin` works on a PDI).

### How local auth works

ServiceNow provides no session token (`window.g_ck`) on localhost, so the app uses HTTP Basic auth through the Vite proxy:

1. **Login** (`src/pages/LoginPage.jsx`, `src/services/authService.js`): the app builds `base64("user:password")` (UTF-8 safe) and sends a test call to `GET /api/now/table/sys_user?user_name=…` with the header `X-Local-Auth: <token>`. If the call succeeds, the token is saved in `window.__localAuth` and `sessionStorage.local_auth`. Signing out clears both.
2. **Proxy** (`vite.config.js`): turns `X-Local-Auth` into `Authorization: Basic …` before forwarding `/api` to the instance. It also strips cookies and `WWW-Authenticate`, so ServiceNow session cookies can't mix accounts and the browser doesn't show its own login popup.
3. **Headers** (`src/services/BaseService.js`): after a form login, the app sends `X-Local-Auth`, which the Vite dev proxy or the Vercel proxy turns into `Authorization: Basic`. When served from `*.service-now.com` it sends `Authorization: Basic` directly. With no form login, a deployed app falls back to the platform session (`window.g_ck` → `X-UserToken`).
4. **Current user**: after a form login, the user name is decoded from the token and looked up in `sys_user`. Otherwise the lookup is `sys_id=javascript:gs.getUserID()`.

The login form is always shown when nobody is signed in, whatever host name you open the app on.

## 4. Payments (demo)

The gateway in `src/services/paymentService.js` is simulated. Card numbers are checked with the Luhn algorithm, and only the brand and last 4 digits are stored. The CVV and full card number never leave the browser.

| Test input | Result |
|---|---|
| `4111 1111 1111 1111`, any future expiry, any CVV | success |
| a valid card ending in `0002` (e.g. `4000 0000 0000 0002`) | declined; the order stays on file and you can retry |
| UPI `name@okbank` / `fail@upi` | success / declined |
| Cash on Delivery | order becomes **Confirmed (COD)** |

For production, swap `mockGateway` for Razorpay or Stripe, and verify the payment server-side (Scripted REST API + webhook) before the order is marked paid. Right now the client reports the payment status itself.

## 5. Deploying inside ServiceNow (optional)

`npm run build` writes `dist/`. The app uses `HashRouter` and relative asset paths, so it can be hosted from a UI Page or Service Portal widget. ServiceNow then injects `g_ck` and the app uses the logged-in session automatically.

## 6. Deploying on Vercel

`vercel.json` rewrites `/api/now/*` to the serverless proxy in `api/proxy.js`, which forwards to the instance like the Vite dev proxy does. Set **`SN_INSTANCE_URL`** (e.g. `https://dev402340.service-now.com`) under Project → Settings → Environment Variables, then redeploy. Every proxied response carries `x-shopnow-auth: basic-forwarded` or `missing`, so DevTools shows whether the login credentials reached the proxy.
