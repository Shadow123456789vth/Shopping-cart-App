/**
 * ShopNow - 01 Create tables & fields
 *
 * Run in: System Definition > Scripts - Background (scope: global) as an admin.
 * Idempotent: re-running skips tables/fields/choices that already exist.
 *
 * Data model
 *   u_shop_category    1 ──< u_shop_product
 *   sys_user           1 ──< u_shop_cart_item >── 1 u_shop_product
 *   sys_user           1 ──< u_shop_address
 *   sys_user           1 ──< u_shop_order 1 ──< u_shop_order_item >── 1 u_shop_product
 *   u_shop_order       1 ──< u_shop_payment
 */
(function createShopDataModel() {
    var TABLES = [
        {
            name: 'u_shop_category', label: 'Shop Category',
            fields: [
                { name: 'u_name', label: 'Name', type: 'string', max: 100, mandatory: true, display: true },
                { name: 'u_description', label: 'Description', type: 'string', max: 1000 },
                { name: 'u_image_url', label: 'Image URL', type: 'url', max: 1024 },
                { name: 'u_sort_order', label: 'Sort Order', type: 'integer', defaultValue: '100' },
                { name: 'u_active', label: 'Active', type: 'boolean', defaultValue: 'true' }
            ]
        },
        {
            name: 'u_shop_product', label: 'Shop Product',
            fields: [
                { name: 'u_name', label: 'Name', type: 'string', max: 200, mandatory: true, display: true },
                { name: 'u_sku', label: 'SKU', type: 'string', max: 40 },
                { name: 'u_brand', label: 'Brand', type: 'string', max: 100 },
                { name: 'u_description', label: 'Description', type: 'string', max: 4000 },
                { name: 'u_category', label: 'Category', type: 'reference', reference: 'u_shop_category' },
                { name: 'u_price', label: 'Price', type: 'decimal', max: 15, mandatory: true },
                { name: 'u_mrp', label: 'MRP (List Price)', type: 'decimal', max: 15 },
                { name: 'u_stock', label: 'Stock', type: 'integer', defaultValue: '0' },
                { name: 'u_image_url', label: 'Image URL', type: 'url', max: 1024 },
                { name: 'u_rating', label: 'Rating', type: 'decimal', max: 15, defaultValue: '0' },
                { name: 'u_rating_count', label: 'Rating Count', type: 'integer', defaultValue: '0' },
                { name: 'u_featured', label: 'Featured', type: 'boolean', defaultValue: 'false' },
                { name: 'u_active', label: 'Active', type: 'boolean', defaultValue: 'true' }
            ]
        },
        {
            name: 'u_shop_cart_item', label: 'Shop Cart Item',
            fields: [
                { name: 'u_user', label: 'User', type: 'reference', reference: 'sys_user', mandatory: true, defaultValue: 'javascript:gs.getUserID();' },
                { name: 'u_product', label: 'Product', type: 'reference', reference: 'u_shop_product', mandatory: true, display: true, cascade: 'delete' },
                { name: 'u_quantity', label: 'Quantity', type: 'integer', defaultValue: '1' }
            ]
        },
        {
            name: 'u_shop_address', label: 'Shop Address',
            fields: [
                { name: 'u_user', label: 'User', type: 'reference', reference: 'sys_user', mandatory: true, defaultValue: 'javascript:gs.getUserID();' },
                { name: 'u_full_name', label: 'Full Name', type: 'string', max: 100, mandatory: true, display: true },
                { name: 'u_phone', label: 'Phone', type: 'string', max: 20 },
                { name: 'u_line1', label: 'Address Line 1', type: 'string', max: 200, mandatory: true },
                { name: 'u_line2', label: 'Address Line 2', type: 'string', max: 200 },
                { name: 'u_city', label: 'City', type: 'string', max: 100, mandatory: true },
                { name: 'u_state', label: 'State', type: 'string', max: 100 },
                { name: 'u_postal_code', label: 'Postal Code', type: 'string', max: 20, mandatory: true },
                { name: 'u_country', label: 'Country', type: 'string', max: 100, defaultValue: 'India' },
                { name: 'u_is_default', label: 'Default', type: 'boolean', defaultValue: 'false' }
            ]
        },
        {
            name: 'u_shop_order', label: 'Shop Order',
            number: { prefix: 'ORD', start: 1000, digits: 7 },
            fields: [
                { name: 'u_number', label: 'Number', type: 'string', max: 40, display: true, defaultValue: 'javascript:getNextObjNumberPadded();' },
                { name: 'u_user', label: 'User', type: 'reference', reference: 'sys_user', mandatory: true, defaultValue: 'javascript:gs.getUserID();' },
                {
                    name: 'u_status', label: 'Status', type: 'string', max: 40, defaultValue: 'pending',
                    choices: [
                        ['pending', 'Pending Payment'], ['payment_failed', 'Payment Failed'], ['confirmed', 'Confirmed (COD)'],
                        ['paid', 'Paid'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']
                    ]
                },
                { name: 'u_subtotal', label: 'Subtotal', type: 'decimal', max: 15, defaultValue: '0' },
                { name: 'u_shipping', label: 'Shipping', type: 'decimal', max: 15, defaultValue: '0' },
                { name: 'u_tax', label: 'Tax', type: 'decimal', max: 15, defaultValue: '0' },
                { name: 'u_total', label: 'Total', type: 'decimal', max: 15, defaultValue: '0' },
                { name: 'u_address', label: 'Address', type: 'reference', reference: 'u_shop_address' },
                { name: 'u_shipping_address', label: 'Shipping Address (snapshot)', type: 'string', max: 1000 },
                {
                    name: 'u_payment_method', label: 'Payment Method', type: 'string', max: 40,
                    choices: [['card', 'Credit / Debit Card'], ['upi', 'UPI'], ['cod', 'Cash on Delivery']]
                },
                { name: 'u_paid_on', label: 'Paid On', type: 'glide_date_time' }
            ]
        },
        {
            name: 'u_shop_order_item', label: 'Shop Order Item',
            fields: [
                { name: 'u_order', label: 'Order', type: 'reference', reference: 'u_shop_order', mandatory: true, cascade: 'delete' },
                { name: 'u_product', label: 'Product', type: 'reference', reference: 'u_shop_product', mandatory: true },
                { name: 'u_product_name', label: 'Product Name', type: 'string', max: 200, display: true },
                { name: 'u_image_url', label: 'Image URL', type: 'url', max: 1024 },
                { name: 'u_unit_price', label: 'Unit Price', type: 'decimal', max: 15 },
                { name: 'u_quantity', label: 'Quantity', type: 'integer', defaultValue: '1' },
                { name: 'u_line_total', label: 'Line Total', type: 'decimal', max: 15 }
            ]
        },
        {
            name: 'u_shop_payment', label: 'Shop Payment',
            fields: [
                { name: 'u_order', label: 'Order', type: 'reference', reference: 'u_shop_order', mandatory: true, cascade: 'delete' },
                { name: 'u_user', label: 'User', type: 'reference', reference: 'sys_user', mandatory: true, defaultValue: 'javascript:gs.getUserID();' },
                { name: 'u_amount', label: 'Amount', type: 'decimal', max: 15 },
                {
                    name: 'u_method', label: 'Method', type: 'string', max: 40,
                    choices: [['card', 'Credit / Debit Card'], ['upi', 'UPI'], ['cod', 'Cash on Delivery']]
                },
                {
                    name: 'u_status', label: 'Status', type: 'string', max: 40, defaultValue: 'initiated',
                    choices: [['initiated', 'Initiated'], ['pending', 'Pending (COD)'], ['success', 'Success'], ['failed', 'Failed'], ['refunded', 'Refunded']]
                },
                { name: 'u_transaction_id', label: 'Transaction ID', type: 'string', max: 100, display: true },
                { name: 'u_card_brand', label: 'Card Brand', type: 'string', max: 40 },
                { name: 'u_card_last4', label: 'Card Last 4', type: 'string', max: 4 },
                { name: 'u_upi_id', label: 'UPI ID', type: 'string', max: 100 },
                { name: 'u_failure_reason', label: 'Failure Reason', type: 'string', max: 255 }
            ]
        }
    ];

    function ensureTable(t) {
        var tbl = new GlideRecord('sys_db_object');
        if (tbl.get('name', t.name)) {
            gs.info('[ShopNow] Table exists: ' + t.name);
            return;
        }
        tbl.initialize();
        tbl.setValue('name', t.name);
        tbl.setValue('label', t.label);
        tbl.setValue('is_extendable', false);
        tbl.insert();
        gs.info('[ShopNow] Created table: ' + t.name);
    }

    function ensureField(tableName, f) {
        var dict = new GlideRecord('sys_dictionary');
        dict.addQuery('name', tableName);
        dict.addQuery('element', f.name);
        dict.query();
        if (dict.next()) {
            gs.info('[ShopNow]   Field exists: ' + tableName + '.' + f.name);
            return;
        }
        dict.initialize();
        dict.setValue('name', tableName);
        dict.setValue('element', f.name);
        dict.setValue('column_label', f.label);
        dict.setValue('internal_type', f.type);
        if (f.max) dict.setValue('max_length', f.max);
        if (f.reference) dict.setValue('reference', f.reference);
        if (f.cascade) dict.setValue('reference_cascade_rule', f.cascade);
        if (f.mandatory) dict.setValue('mandatory', true);
        if (f.display) dict.setValue('display', true);
        if (f.defaultValue) dict.setValue('default_value', f.defaultValue);
        if (f.choices) dict.setValue('choice', 3); // 3 = Dropdown without -- None --
        dict.insert();
        gs.info('[ShopNow]   Created field: ' + tableName + '.' + f.name + ' (' + f.type + ')');
    }

    function ensureChoices(tableName, f) {
        if (!f.choices) return;
        for (var i = 0; i < f.choices.length; i++) {
            var ch = new GlideRecord('sys_choice');
            ch.addQuery('name', tableName);
            ch.addQuery('element', f.name);
            ch.addQuery('value', f.choices[i][0]);
            ch.query();
            if (ch.next()) continue;
            ch.initialize();
            ch.setValue('name', tableName);
            ch.setValue('element', f.name);
            ch.setValue('value', f.choices[i][0]);
            ch.setValue('label', f.choices[i][1]);
            ch.setValue('sequence', (i + 1) * 10);
            ch.setValue('language', 'en');
            ch.insert();
        }
    }

    function ensureNumbering(tableName, n) {
        if (!n) return;
        var num = new GlideRecord('sys_number');
        if (num.get('category', tableName)) return;
        num.initialize();
        num.setValue('category', tableName);
        num.setValue('prefix', n.prefix);
        num.setValue('number', n.start);
        num.setValue('maximum_digits', n.digits);
        num.insert();
        gs.info('[ShopNow]   Auto-numbering ' + n.prefix + ' for ' + tableName);
    }

    // Create every table first so references between them resolve.
    for (var t = 0; t < TABLES.length; t++) ensureTable(TABLES[t]);

    for (var i = 0; i < TABLES.length; i++) {
        var table = TABLES[i];
        ensureNumbering(table.name, table.number);
        for (var j = 0; j < table.fields.length; j++) {
            ensureField(table.name, table.fields[j]);
            ensureChoices(table.name, table.fields[j]);
        }
    }

    gs.info('[ShopNow] Data model ready.');
})();
