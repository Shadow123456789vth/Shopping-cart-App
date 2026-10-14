/**
 * ShopNow - 02 Seed categories & products
 *
 * Run in: Scripts - Background (global) as admin, AFTER 01_create_tables.js.
 * Idempotent: categories matched by name, products matched by SKU.
 */
(function seedShopData() {
    var CATEGORIES = [
        { name: 'Electronics', description: 'Phones, audio, laptops and accessories', sort: 10 },
        { name: 'Books', description: 'Bestsellers, tech and fiction', sort: 20 },
        { name: 'Fashion', description: 'Clothing, shoes and watches', sort: 30 },
        { name: 'Home & Kitchen', description: 'Appliances, cookware and decor', sort: 40 },
        { name: 'Sports & Fitness', description: 'Gear for every workout', sort: 50 }
    ];

    // [sku, name, brand, category, price, mrp, stock, rating, ratingCount, featured, description]
    var PRODUCTS = [
        ['EL-1001', 'Wireless Noise Cancelling Headphones', 'SoundMax', 'Electronics', 7999, 12999, 40, 4.5, 2310, true, 'Over-ear Bluetooth headphones with active noise cancellation, 30-hour battery life and fast charging.'],
        ['EL-1002', '5G Smartphone 128GB', 'Nova', 'Electronics', 18999, 22999, 25, 4.3, 5120, true, '6.6" AMOLED display, 50MP triple camera, 5000mAh battery and 33W fast charging.'],
        ['EL-1003', '14" Ultrabook Laptop 16GB RAM', 'Zenbyte', 'Electronics', 62990, 74990, 12, 4.6, 870, true, 'Thin and light laptop with 16GB RAM, 512GB SSD and all-day battery.'],
        ['EL-1004', 'Smart Watch with AMOLED Display', 'Pulse', 'Electronics', 2999, 5999, 60, 4.1, 3400, false, 'Heart-rate, SpO2 and sleep tracking with 100+ sports modes and 7-day battery.'],
        ['EL-1005', 'Portable Bluetooth Speaker', 'SoundMax', 'Electronics', 1999, 3499, 80, 4.4, 1980, false, 'Waterproof IPX7 speaker with deep bass and 12-hour playtime.'],
        ['BK-2001', 'Clean Code', 'Robert C. Martin', 'Books', 549, 899, 100, 4.7, 12040, true, 'A handbook of agile software craftsmanship.'],
        ['BK-2002', 'Atomic Habits', 'James Clear', 'Books', 399, 799, 150, 4.8, 54000, true, 'An easy and proven way to build good habits and break bad ones.'],
        ['BK-2003', 'The Pragmatic Programmer', 'Hunt & Thomas', 'Books', 649, 999, 70, 4.7, 8800, false, 'Your journey to mastery, 20th anniversary edition.'],
        ['FA-3001', 'Men\'s Running Shoes', 'Stride', 'Fashion', 2499, 4999, 45, 4.2, 2650, true, 'Lightweight mesh upper with cushioned sole for daily runs.'],
        ['FA-3002', 'Women\'s Denim Jacket', 'Urbane', 'Fashion', 1799, 2999, 30, 4.3, 940, false, 'Classic fit denim jacket with button closure.'],
        ['FA-3003', 'Analog Leather Strap Watch', 'Timecraft', 'Fashion', 3499, 5499, 20, 4.4, 610, false, 'Minimalist dial with genuine leather strap and 3ATM water resistance.'],
        ['HK-4001', 'Air Fryer 4.2L', 'ChefPro', 'Home & Kitchen', 4999, 8999, 35, 4.5, 7600, true, 'Cook crispy food with up to 90% less oil. 8 presets and digital touch panel.'],
        ['HK-4002', 'Stainless Steel Cookware Set (5 pcs)', 'ChefPro', 'Home & Kitchen', 3299, 5999, 25, 4.3, 1200, false, 'Tri-ply stainless steel, induction compatible.'],
        ['HK-4003', 'Robot Vacuum Cleaner', 'CleanBot', 'Home & Kitchen', 14999, 24999, 10, 4.2, 980, false, 'Smart mapping, app control and auto-recharge.'],
        ['SP-5001', 'Yoga Mat 6mm Anti-Slip', 'FlexFit', 'Sports & Fitness', 799, 1499, 120, 4.4, 4300, false, 'Eco-friendly TPE mat with carry strap.'],
        ['SP-5002', 'Adjustable Dumbbells 20kg Set', 'IronCore', 'Sports & Fitness', 3999, 6499, 18, 4.5, 1500, true, 'Space-saving adjustable dumbbells with quick-lock plates.'],
        ['SP-5003', 'Insulated Water Bottle 1L', 'FlexFit', 'Sports & Fitness', 699, 1199, 200, 4.6, 6200, false, 'Keeps drinks cold for 24 hours and hot for 12.']
    ];

    var categoryIds = {};
    CATEGORIES.forEach(function (c) {
        var cat = new GlideRecord('u_shop_category');
        var exists = cat.get('u_name', c.name);
        if (!exists) {
            cat.initialize();
            cat.setValue('u_name', c.name);
        }
        cat.setValue('u_description', c.description);
        cat.setValue('u_sort_order', c.sort);
        cat.setValue('u_image_url', 'https://picsum.photos/seed/' + encodeURIComponent(c.name) + '/600/400');
        cat.setValue('u_active', true);
        if (exists) {
            cat.update();
            categoryIds[c.name] = cat.getUniqueValue();
        } else {
            categoryIds[c.name] = cat.insert();
        }
    });

    var created = 0, updated = 0;
    PRODUCTS.forEach(function (p) {
        var prod = new GlideRecord('u_shop_product');
        var exists = prod.get('u_sku', p[0]);
        if (!exists) {
            prod.initialize();
            prod.setValue('u_sku', p[0]);
        }
        prod.setValue('u_name', p[1]);
        prod.setValue('u_brand', p[2]);
        prod.setValue('u_category', categoryIds[p[3]]);
        prod.setValue('u_price', p[4]);
        prod.setValue('u_mrp', p[5]);
        prod.setValue('u_stock', p[6]);
        prod.setValue('u_rating', p[7]);
        prod.setValue('u_rating_count', p[8]);
        prod.setValue('u_featured', p[9]);
        prod.setValue('u_description', p[10]);
        prod.setValue('u_image_url', 'https://picsum.photos/seed/' + p[0] + '/600/600');
        prod.setValue('u_active', true);
        if (exists) { prod.update(); updated++; } else { prod.insert(); created++; }
    });

    gs.info('[ShopNow] Seed complete. Products created: ' + created + ', updated: ' + updated);
})();
