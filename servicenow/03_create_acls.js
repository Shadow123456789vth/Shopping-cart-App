/**
 * ShopNow - 03 Role + ACLs for non-admin shoppers
 *
 * Run in: Scripts - Background (global) as admin WITH the security_admin role
 * elevated (User menu > Elevate role > security_admin). Otherwise ACL inserts are rejected.
 *
 * Creates role "u_shop_customer". Assign it to every shopper.
 * Row-level ownership ("only my cart/orders") is enforced by the query business rules
 * in 04_business_rules.js, so these ACLs only need the role check.
 */
(function createShopAcls() {
    var ROLE = 'u_shop_customer';

    var ACCESS = {
        u_shop_category: ['read'],
        u_shop_product: ['read'],
        u_shop_cart_item: ['read', 'create', 'write', 'delete'],
        u_shop_address: ['read', 'create', 'write', 'delete'],
        u_shop_order: ['read', 'create'],
        u_shop_order_item: ['read', 'create'],
        u_shop_payment: ['read', 'create']
    };

    function ensureRole(name) {
        var role = new GlideRecord('sys_user_role');
        if (role.get('name', name)) return role.getUniqueValue();
        role.initialize();
        role.setValue('name', name);
        role.setValue('description', 'ShopNow shopper: browse products, manage own cart, addresses, orders and payments.');
        return role.insert();
    }

    function ensureAcl(aclName, operation, roleId) {
        var acl = new GlideRecord('sys_security_acl');
        acl.addQuery('name', aclName);
        acl.addQuery('operation.name', operation);
        acl.addQuery('type.name', 'record');
        acl.query();
        var aclId;
        if (acl.next()) {
            aclId = acl.getUniqueValue();
        } else {
            acl.initialize();
            acl.setValue('name', aclName);
            acl.type.setDisplayValue('record');
            acl.operation.setDisplayValue(operation);
            acl.setValue('active', true);
            acl.setValue('admin_overrides', true);
            acl.setValue('description', 'ShopNow: ' + operation + ' for ' + ROLE);
            aclId = acl.insert();
            if (!aclId) {
                gs.error('[ShopNow] Could not create ACL ' + aclName + ' (' + operation + '). Is security_admin elevated?');
                return;
            }
            gs.info('[ShopNow] Created ACL ' + aclName + ' / ' + operation);
        }

        var link = new GlideRecord('sys_security_acl_role');
        link.addQuery('sys_security_acl', aclId);
        link.addQuery('sys_user_role', roleId);
        link.query();
        if (!link.hasNext()) {
            link.initialize();
            link.setValue('sys_security_acl', aclId);
            link.setValue('sys_user_role', roleId);
            link.insert();
        }
    }

    var roleId = ensureRole(ROLE);
    for (var table in ACCESS) {
        var ops = ACCESS[table];
        for (var i = 0; i < ops.length; i++) {
            ensureAcl(table, ops[i], roleId);           // table-level
            if (ops[i] !== 'delete') {
                ensureAcl(table + '.*', ops[i], roleId); // all fields
            }
        }
    }
    gs.info('[ShopNow] ACLs ready. Assign role ' + ROLE + ' to shoppers.');
})();
