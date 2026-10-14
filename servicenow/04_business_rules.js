/**
 * ShopNow - 04 Business rules (server-side integrity)
 *
 * Run in: Scripts - Background (global) as admin. Idempotent: rules are matched by
 * name + table and their script is refreshed on re-run.
 *
 *  - Force owner:        cart/address/order/payment are always stamped with the caller's user.
 *  - Restrict to owner:  non-admins can only query their own rows.
 *  - Order item pricing: price/name/image are copied from the product, never trusted from the client.
 *  - Finalize order:     after a successful (or COD) payment -> mark order paid/confirmed,
 *                        decrement stock, clear the cart.
 */
(function createShopBusinessRules() {
    var OWNED_TABLES = ['u_shop_cart_item', 'u_shop_address', 'u_shop_order', 'u_shop_payment'];

    var FORCE_OWNER = [
        '(function executeRule(current, previous) {',
        '    if (!gs.hasRole("admin") || current.u_user.nil()) {',
        '        current.u_user = gs.getUserID();',
        '    }',
        '})(current, previous);'
    ].join('\n');

    var RESTRICT_OWNER = [
        '(function executeRule(current, previous) {',
        '    if (!gs.hasRole("admin")) {',
        '        current.addQuery("u_user", gs.getUserID());',
        '    }',
        '})(current, previous);'
    ].join('\n');

    var RESTRICT_ORDER_ITEM = [
        '(function executeRule(current, previous) {',
        '    if (!gs.hasRole("admin")) {',
        '        current.addQuery("u_order.u_user", gs.getUserID());',
        '    }',
        '})(current, previous);'
    ].join('\n');

    var ORDER_ITEM_PRICING = [
        '(function executeRule(current, previous) {',
        '    var order = current.u_order.getRefRecord();',
        '    if (!order.isValidRecord() || (!gs.hasRole("admin") && order.getValue("u_user") != gs.getUserID())) {',
        '        gs.addErrorMessage("Invalid order.");',
        '        current.setAbortAction(true);',
        '        return;',
        '    }',
        '    var product = current.u_product.getRefRecord();',
        '    var active = String(product.getValue("u_active"));',
        '    if (!product.isValidRecord() || active == "0" || active == "false") {',
        '        gs.addErrorMessage("Product is not available.");',
        '        current.setAbortAction(true);',
        '        return;',
        '    }',
        '    var qty = parseInt(current.getValue("u_quantity"), 10) || 0;',
        '    var stock = parseInt(product.getValue("u_stock"), 10) || 0;',
        '    if (qty < 1 || qty > stock) {',
        '        gs.addErrorMessage("Insufficient stock for " + product.getValue("u_name"));',
        '        current.setAbortAction(true);',
        '        return;',
        '    }',
        '    var price = parseFloat(product.getValue("u_price")) || 0;',
        '    current.u_unit_price = price;',
        '    current.u_line_total = Math.round(price * qty * 100) / 100;',
        '    current.u_product_name = product.getValue("u_name");',
        '    current.u_image_url = product.getValue("u_image_url");',
        '})(current, previous);'
    ].join('\n');

    var FINALIZE_ORDER = [
        '(function executeRule(current, previous) {',
        '    var status = current.getValue("u_status");',
        '    var method = current.getValue("u_method");',
        '    var order = new GlideRecord("u_shop_order");',
        '    if (!order.get(current.getValue("u_order"))) return;',
        '    var orderStatus = order.getValue("u_status");',
        '    if (orderStatus != "pending" && orderStatus != "payment_failed") return;',
        '',
        '    if (status == "failed") {',
        '        order.setValue("u_status", "payment_failed");',
        '        order.update();',
        '        return;',
        '    }',
        '    var isCod = (method == "cod" && status == "pending");',
        '    if (status != "success" && !isCod) return;',
        '',
        '    order.setValue("u_status", isCod ? "confirmed" : "paid");',
        '    order.setValue("u_payment_method", method);',
        '    if (!isCod) order.setValue("u_paid_on", new GlideDateTime());',
        '    order.update();',
        '',
        '    var item = new GlideRecord("u_shop_order_item");',
        '    item.addQuery("u_order", order.getUniqueValue());',
        '    item.query();',
        '    while (item.next()) {',
        '        var product = new GlideRecord("u_shop_product");',
        '        if (product.get(item.getValue("u_product"))) {',
        '            var stock = parseInt(product.getValue("u_stock"), 10) || 0;',
        '            var qty = parseInt(item.getValue("u_quantity"), 10) || 0;',
        '            product.setValue("u_stock", Math.max(0, stock - qty));',
        '            product.update();',
        '        }',
        '    }',
        '',
        '    var cart = new GlideRecord("u_shop_cart_item");',
        '    cart.addQuery("u_user", order.getValue("u_user"));',
        '    cart.deleteMultiple();',
        '})(current, previous);'
    ].join('\n');

    function ensureRule(def) {
        var br = new GlideRecord('sys_script');
        br.addQuery('name', def.name);
        br.addQuery('collection', def.table);
        br.query();
        var exists = br.next();
        if (!exists) {
            br.initialize();
            br.setValue('name', def.name);
            br.setValue('collection', def.table);
        }
        br.setValue('when', def.when);
        br.setValue('order', def.order || 100);
        br.setValue('active', true);
        br.setValue('advanced', true);
        br.setValue('action_insert', !!def.insert);
        br.setValue('action_update', !!def.update);
        br.setValue('action_delete', false);
        br.setValue('action_query', !!def.query);
        br.setValue('script', def.script);
        if (exists) br.update(); else br.insert();
        gs.info('[ShopNow] ' + (exists ? 'Updated' : 'Created') + ' BR: ' + def.name + ' on ' + def.table);
    }

    OWNED_TABLES.forEach(function (table) {
        ensureRule({ name: 'ShopNow - Force owner', table: table, when: 'before', insert: true, order: 50, script: FORCE_OWNER });
        ensureRule({ name: 'ShopNow - Restrict to owner', table: table, when: 'before', query: true, script: RESTRICT_OWNER });
    });
    ensureRule({ name: 'ShopNow - Restrict to owner', table: 'u_shop_order_item', when: 'before', query: true, script: RESTRICT_ORDER_ITEM });
    ensureRule({ name: 'ShopNow - Order item pricing', table: 'u_shop_order_item', when: 'before', insert: true, script: ORDER_ITEM_PRICING });
    ensureRule({ name: 'ShopNow - Finalize order on payment', table: 'u_shop_payment', when: 'after', insert: true, script: FINALIZE_ORDER });

    gs.info('[ShopNow] Business rules ready.');
})();
