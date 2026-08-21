const pool = require("../config/db");
const bcrypt = require("bcrypt");

async function seed() {
    const client = await pool.connect();
    try {
        console.log("🌱 Starting database seeding...");
        await client.query("BEGIN");

        // Clean existing tables in reverse dependency order
        console.log("Cleaning old data...");
        await client.query(`
            TRUNCATE TABLE 
                complaints, notifications, favorites, reviews, payments, 
                order_items, orders, service_requests, entrepreneur_availability, 
                product_images, products, services, entrepreneur_skills, 
                skills, entrepreneur_profiles, users 
            RESTART IDENTITY CASCADE
        `);

        // 1. Passwords
        const defaultPasswordHash = await bcrypt.hash("password123", 12);
        const adminPasswordHash = await bcrypt.hash("admin123", 12);

        // 2. Insert Users
        console.log("Inserting users...");
        const usersResult = await client.query(`
            INSERT INTO users (full_name, email, phone, password_hash, role, profile_image)
            VALUES 
                ('System Admin', 'admin@hunarhub.com', '9999999999', $1, 'ADMIN', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
                ('Ramesh Kumar Cobbler', 'ramesh@hunarhub.com', '9876543210', $2, 'ENTREPRENEUR', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
                ('Lakshmi Devi Pottery', 'lakshmi@hunarhub.com', '9876543211', $2, 'ENTREPRENEUR', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
                ('Sunita Sharma Handlooms', 'sunita@hunarhub.com', '9876543212', $2, 'ENTREPRENEUR', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'),
                ('Mohan Vishwakarma Woodcraft', 'mohan@hunarhub.com', '9876543213', $2, 'ENTREPRENEUR', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
                ('Ananya Sharma', 'ananya@gmail.com', '9123456780', $2, 'CUSTOMER', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
                ('Vikram Patel', 'vikram@gmail.com', '9123456781', $2, 'CUSTOMER', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'),
                ('Priya Singh', 'priya@gmail.com', '9123456782', $2, 'CUSTOMER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
            RETURNING id, full_name, email, role;
        `, [adminPasswordHash, defaultPasswordHash]);

        const usersMap = {};
        usersResult.rows.forEach(u => { usersMap[u.email] = u.id; });

        // 3. Entrepreneur Profiles
        console.log("Inserting entrepreneur profiles...");
        const epResult = await client.query(`
            INSERT INTO entrepreneur_profiles 
            (user_id, business_name, bio, experience_years, verification_status, phone, address, city, state, pincode, location, average_rating, total_reviews, is_available)
            VALUES
                ($1, 'Ramesh Leather Crafts & Footwear Repair', 'Master craftsman with over 15 years of expertise in hand-stitched leather boots, jacket restoration, and custom soling.', 15, 'APPROVED', '9876543210', 'Shop 12, Leather Market, Dharavi', 'Mumbai', 'Maharashtra', '400017', ST_SetSRID(ST_MakePoint(72.8561, 19.0402), 4326)::geography, 4.90, 18, true),
                ($2, 'Lakshmi Terracotta Art & Pottery', 'Traditional terracotta artist crafting eco-friendly clay water pitchers, cooking handis, and decorative garden sculptures.', 10, 'APPROVED', '9876543211', 'Plot 45, Artisan Colony, Sangeener', 'Jaipur', 'Rajasthan', '302029', ST_SetSRID(ST_MakePoint(75.7873, 26.9124), 4326)::geography, 4.85, 12, true),
                ($3, 'Sunita Heritage Banarasi Handlooms', 'Authentic Banarasi weaver and tailoring specialist for handloom saree blouses, custom suits, and silk embroidery.', 12, 'APPROVED', '9876543212', 'Ghat Road, Chowk', 'Varanasi', 'Uttar Pradesh', '221001', ST_SetSRID(ST_MakePoint(82.9739, 25.3176), 4326)::geography, 4.95, 24, true),
                ($4, 'Mohan Teak Wood & Carvings', 'Expert carpenter crafting hand-carved solid teak furniture, wooden jewelry boxes, and decorative wall art.', 8, 'APPROVED', '9876543213', '78 Carpenter Lane, Kothrud', 'Pune', 'Maharashtra', '411038', ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography, 4.75, 8, true)
            RETURNING id, user_id, business_name;
        `, [usersMap['ramesh@hunarhub.com'], usersMap['lakshmi@hunarhub.com'], usersMap['sunita@hunarhub.com'], usersMap['mohan@hunarhub.com']]);

        const epMap = {};
        epResult.rows.forEach(ep => { epMap[ep.user_id] = ep.id; });

        // 4. Fetch Categories
        const catResult = await client.query(`SELECT id, name FROM categories`);
        const catMap = {};
        catResult.rows.forEach(c => { catMap[c.name] = c.id; });

        // 5. Insert Skills
        console.log("Inserting skills...");
        const skillsResult = await client.query(`
            INSERT INTO skills (category_id, name, description)
            VALUES
                ($1, 'Shoe Repair & Soling', 'Complete footwear repair, rubber soling, and stitching'),
                ($1, 'Leather Conditioning & Polish', 'Restoration and polish for leather boots, jackets, and bags'),
                ($2, 'Terracotta Molding & Firing', 'Handmade clay pottery, pots, and traditional stoves'),
                ($2, 'Ceramic & Glazed Pottery', 'Decorated and glazed ceramic tableware and vases'),
                ($3, 'Custom Saree Blouse Stitching', 'Tailored stitching for traditional saree blouses and lehengas'),
                ($3, 'Embroidery & Zardozi Work', 'Hand embroidery, thread work, and sequin embellishments'),
                ($4, 'Solid Teak Wood Carving', 'Hand-carved wooden furniture and decorative panels'),
                ($4, 'Wooden Antique Restoration', 'Refurbishing and polishing antique wooden products')
            ON CONFLICT (category_id, name) DO NOTHING
            RETURNING id, name;
        `, [catMap['Cobbler'], catMap['Potter'], catMap['Tailor'], catMap['Wood Worker']]);

        const skillRows = (await client.query(`SELECT id, name FROM skills`)).rows;
        const skillMap = {};
        skillRows.forEach(s => { skillMap[s.name] = s.id; });

        // 6. Entrepreneur Skills (Many to Many)
        console.log("Linking entrepreneur skills...");
        await client.query(`
            INSERT INTO entrepreneur_skills (entrepreneur_id, skill_id)
            VALUES
                ($1, $5), ($1, $6),
                ($2, $7), ($2, $8),
                ($3, $9), ($3, $10),
                ($4, $11), ($4, $12)
            ON CONFLICT DO NOTHING;
        `, [
            epMap[usersMap['ramesh@hunarhub.com']],
            epMap[usersMap['lakshmi@hunarhub.com']],
            epMap[usersMap['sunita@hunarhub.com']],
            epMap[usersMap['mohan@hunarhub.com']],
            skillMap['Shoe Repair & Soling'],
            skillMap['Leather Conditioning & Polish'],
            skillMap['Terracotta Molding & Firing'],
            skillMap['Ceramic & Glazed Pottery'],
            skillMap['Custom Saree Blouse Stitching'],
            skillMap['Embroidery & Zardozi Work'],
            skillMap['Solid Teak Wood Carving'],
            skillMap['Wooden Antique Restoration']
        ]);

        // 7. Insert Services
        console.log("Inserting services...");
        const servicesResult = await client.query(`
            INSERT INTO services (entrepreneur_id, category_id, skill_id, title, description, price, price_type, estimated_duration, is_active)
            VALUES
                ($1, $5, $9, 'Premium Leather Boot Resoling & Restoration', 'Complete sole replacement with premium rubber, stitching repair, and deep leather conditioning.', 599.00, 'FIXED', 120, true),
                ($1, $5, $10, 'Custom Leather Jacket & Bag Repair', 'Zipper replacement, seam stitching, and color restoration for leather accessories.', 899.00, 'STARTING_FROM', 180, true),
                ($2, $6, $11, 'Handmade Eco-Friendly Clay Cookware Set', 'Custom set of traditional unglazed clay cooking pots and tawa.', 650.00, 'FIXED', 90, true),
                ($2, $6, $12, 'Custom Hand-painted Decorative Ceramic Vases', 'Custom design and glaze ceramic vase for home decoration.', 450.00, 'STARTING_FROM', 60, true),
                ($3, $7, $13, 'Designer Banarasi Saree Blouse Stitching', 'Tailor-made designer blouse with custom piping and perfect fit guarantee.', 1200.00, 'FIXED', 240, true),
                ($3, $7, $14, 'Zardozi Hand Embroidery on Fabrics', 'Intricate hand embroidery for bridalwear, dupattas, and festive outfits.', 1500.00, 'NEGOTIABLE', 360, true),
                ($4, $8, $15, 'Custom Teak Wood Stool & Small Furniture', 'Solid teak wood hand-carved low stool with oiled finish.', 2499.00, 'FIXED', 480, true)
            RETURNING id, title, entrepreneur_id;
        `, [
            epMap[usersMap['ramesh@hunarhub.com']],
            epMap[usersMap['lakshmi@hunarhub.com']],
            epMap[usersMap['sunita@hunarhub.com']],
            epMap[usersMap['mohan@hunarhub.com']],
            catMap['Cobbler'], catMap['Potter'], catMap['Tailor'], catMap['Wood Worker'],
            skillMap['Shoe Repair & Soling'], skillMap['Leather Conditioning & Polish'],
            skillMap['Terracotta Molding & Firing'], skillMap['Ceramic & Glazed Pottery'],
            skillMap['Custom Saree Blouse Stitching'], skillMap['Embroidery & Zardozi Work'],
            skillMap['Solid Teak Wood Carving']
        ]);

        const serviceMap = {};
        servicesResult.rows.forEach(s => { serviceMap[s.title] = s.id; });

        // 8. Insert Products
        console.log("Inserting products...");
        const productsResult = await client.query(`
            INSERT INTO products (entrepreneur_id, category_id, name, description, price, stock_quantity, is_available)
            VALUES
                ($1, $5, 'Handcrafted Genuine Leather Belt', '100% full-grain leather belt with heavy-duty brass buckle. Built to last decades.', 599.00, 15, true),
                ($1, $5, 'Handmade Leather Wallet & Card Holder', 'Slim bi-fold leather wallet crafted from vegetable-tanned leather.', 399.00, 25, true),
                ($2, $6, 'Natural Water Cooling Terracotta Pitcher (Matka)', 'Eco-friendly clay pitcher naturally cools drinking water during hot summer days.', 350.00, 20, true),
                ($2, $6, 'Hand-painted Clay Diya Set (Pack of 12)', 'Handcrafted decorative clay diyas painted with natural eco colors.', 199.00, 50, true),
                ($3, $7, 'Handwoven Pure Silk Banarasi Dupatta', 'Exquisite Banarasi silk dupatta featuring gold zari woven motifs.', 1899.00, 8, true),
                ($4, $8, 'Hand-carved Teak Wood Jewelry Box', 'Ornate wooden box with brass inlay and velvet lining inside.', 1299.00, 12, true)
            RETURNING id, name, entrepreneur_id;
        `, [
            epMap[usersMap['ramesh@hunarhub.com']],
            epMap[usersMap['lakshmi@hunarhub.com']],
            epMap[usersMap['sunita@hunarhub.com']],
            epMap[usersMap['mohan@hunarhub.com']],
            catMap['Cobbler'], catMap['Potter'], catMap['Tailor'], catMap['Wood Worker']
        ]);

        const productMap = {};
        productsResult.rows.forEach(p => { productMap[p.name] = p.id; });

        // 9. Product Images
        console.log("Inserting product images...");
        await client.query(`
            INSERT INTO product_images (product_id, image_url, is_primary)
            VALUES
                ($1, 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=500', true),
                ($2, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500', true),
                ($3, 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500', true),
                ($4, 'https://images.unsplash.com/photo-1606760227091-3dd858d9721b?w=500', true),
                ($5, 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500', true),
                ($6, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500', true)
        `, [
            productMap['Handcrafted Genuine Leather Belt'],
            productMap['Handmade Leather Wallet & Card Holder'],
            productMap['Natural Water Cooling Terracotta Pitcher (Matka)'],
            productMap['Hand-painted Clay Diya Set (Pack of 12)'],
            productMap['Handwoven Pure Silk Banarasi Dupatta'],
            productMap['Hand-carved Teak Wood Jewelry Box']
        ]);

        // 10. Entrepreneur Availability
        console.log("Inserting availability...");
        await client.query(`
            INSERT INTO entrepreneur_availability (entrepreneur_id, day_of_week, start_time, end_time, is_available)
            VALUES
                ($1, 1, '09:00:00', '19:00:00', true),
                ($1, 2, '09:00:00', '19:00:00', true),
                ($1, 3, '09:00:00', '19:00:00', true),
                ($1, 4, '09:00:00', '19:00:00', true),
                ($1, 5, '09:00:00', '19:00:00', true),
                ($1, 6, '09:00:00', '19:00:00', true),
                ($2, 1, '10:00:00', '18:00:00', true),
                ($2, 2, '10:00:00', '18:00:00', true),
                ($2, 3, '10:00:00', '18:00:00', true),
                ($2, 4, '10:00:00', '18:00:00', true),
                ($2, 5, '10:00:00', '18:00:00', true),
                ($3, 1, '10:00:00', '20:00:00', true),
                ($3, 2, '10:00:00', '20:00:00', true),
                ($3, 3, '10:00:00', '20:00:00', true),
                ($3, 4, '10:00:00', '20:00:00', true),
                ($3, 5, '10:00:00', '20:00:00', true),
                ($4, 1, '09:30:00', '18:30:00', true),
                ($4, 2, '09:30:00', '18:30:00', true),
                ($4, 3, '09:30:00', '18:30:00', true),
                ($4, 4, '09:30:00', '18:30:00', true),
                ($4, 5, '09:30:00', '18:30:00', true)
        `, [
            epMap[usersMap['ramesh@hunarhub.com']],
            epMap[usersMap['lakshmi@hunarhub.com']],
            epMap[usersMap['sunita@hunarhub.com']],
            epMap[usersMap['mohan@hunarhub.com']]
        ]);

        // 11. Service Requests
        console.log("Inserting service requests...");
        const srResult = await client.query(`
            INSERT INTO service_requests (customer_id, entrepreneur_id, service_id, description, requested_date, requested_time, address, status, estimated_price, final_price, customer_note)
            VALUES
                ($1, $4, $7, 'Need complete sole repair and polish for formal leather shoes.', CURRENT_DATE - INTERVAL '5 days', '11:00:00', 'Flat 402, Sunshine Apartments, Bandra West, Mumbai', 'COMPLETED', 599.00, 599.00, 'Please handle with care.'),
                ($2, $5, $8, 'Custom tailoring for saree blouse with intricate zari border work.', CURRENT_DATE + INTERVAL '2 days', '14:00:00', 'House 12, Civil Lines, Varanasi', 'IN_PROGRESS', 1200.00, 1200.00, 'Blouse piece provided.'),
                ($3, $6, $9, 'Need custom set of terracotta pots for kitchen herbs.', CURRENT_DATE + INTERVAL '4 days', '10:30:00', '34 Rose Garden, Malviya Nagar, Jaipur', 'PENDING', 650.00, 650.00, 'Prefer unglazed clay.')
            RETURNING id, customer_id, entrepreneur_id;
        `, [
            usersMap['ananya@gmail.com'], usersMap['vikram@gmail.com'], usersMap['priya@gmail.com'],
            epMap[usersMap['ramesh@hunarhub.com']], epMap[usersMap['sunita@hunarhub.com']], epMap[usersMap['lakshmi@hunarhub.com']],
            serviceMap['Premium Leather Boot Resoling & Restoration'],
            serviceMap['Designer Banarasi Saree Blouse Stitching'],
            serviceMap['Handmade Eco-Friendly Clay Cookware Set']
        ]);

        const srMap = {};
        srResult.rows.forEach(r => { srMap[r.customer_id] = r.id; });

        // 12. Orders & Order Items
        console.log("Inserting orders...");
        const order1 = (await client.query(`
            INSERT INTO orders (customer_id, entrepreneur_id, total_amount, status, payment_status, shipping_address)
            VALUES ($1, $2, 599.00, 'COMPLETED', 'PAID', 'Flat 402, Sunshine Apartments, Bandra West, Mumbai')
            RETURNING id;
        `, [usersMap['ananya@gmail.com'], epMap[usersMap['ramesh@hunarhub.com']]])).rows[0].id;

        await client.query(`
            INSERT INTO order_items (order_id, product_id, entrepreneur_id, quantity, unit_price, subtotal, status)
            VALUES ($1, $2, $3, 1, 599.00, 599.00, 'COMPLETED');
        `, [order1, productMap['Handcrafted Genuine Leather Belt'], epMap[usersMap['ramesh@hunarhub.com']]]);

        const order2 = (await client.query(`
            INSERT INTO orders (customer_id, entrepreneur_id, total_amount, status, payment_status, shipping_address)
            VALUES ($1, $2, 700.00, 'CONFIRMED', 'PAID', '34 Rose Garden, Malviya Nagar, Jaipur')
            RETURNING id;
        `, [usersMap['priya@gmail.com'], epMap[usersMap['lakshmi@hunarhub.com']]])).rows[0].id;

        await client.query(`
            INSERT INTO order_items (order_id, product_id, entrepreneur_id, quantity, unit_price, subtotal, status)
            VALUES ($1, $2, $3, 2, 350.00, 700.00, 'CONFIRMED');
        `, [order2, productMap['Natural Water Cooling Terracotta Pitcher (Matka)'], epMap[usersMap['lakshmi@hunarhub.com']]]);

        const order3 = (await client.query(`
            INSERT INTO orders (customer_id, entrepreneur_id, total_amount, status, payment_status, shipping_address)
            VALUES ($1, $2, 1899.00, 'PENDING', 'PENDING', 'House 12, Civil Lines, Varanasi')
            RETURNING id;
        `, [usersMap['vikram@gmail.com'], epMap[usersMap['sunita@hunarhub.com']]])).rows[0].id;

        await client.query(`
            INSERT INTO order_items (order_id, product_id, entrepreneur_id, quantity, unit_price, subtotal, status)
            VALUES ($1, $2, $3, 1, 1899.00, 1899.00, 'PENDING');
        `, [order3, productMap['Handwoven Pure Silk Banarasi Dupatta'], epMap[usersMap['sunita@hunarhub.com']]]);

        // 13. Payments
        console.log("Inserting payments...");
        await client.query(`
            INSERT INTO payments (order_id, service_request_id, customer_id, amount, payment_method, transaction_id, status, paid_at)
            VALUES
                ($1, NULL, $3, 599.00, 'RAZORPAY', 'pay_live_mock_101', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '5 days'),
                ($2, NULL, $4, 700.00, 'RAZORPAY', 'pay_live_mock_102', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '1 day'),
                (NULL, $5, $3, 599.00, 'RAZORPAY', 'pay_live_mock_103', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '4 days');
        `, [
            order1, order2, usersMap['ananya@gmail.com'], usersMap['priya@gmail.com'],
            srMap[usersMap['ananya@gmail.com']]
        ]);

        // 14. Reviews
        console.log("Inserting reviews...");
        await client.query(`
            INSERT INTO reviews (customer_id, entrepreneur_id, product_id, service_request_id, rating, comment)
            VALUES
                ($1, $3, $5, NULL, 5, 'Extremely durable and high-grade leather belt. Perfect stitching!'),
                ($1, $3, NULL, $6, 5, 'Ramesh restored my worn-out boots to brand new condition. Highly recommended master cobbler!'),
                ($2, $4, $7, NULL, 5, 'The clay matka keeps water remarkably cool even in peak summer heat.')
        `, [
            usersMap['ananya@gmail.com'], usersMap['priya@gmail.com'],
            epMap[usersMap['ramesh@hunarhub.com']], epMap[usersMap['lakshmi@hunarhub.com']],
            productMap['Handcrafted Genuine Leather Belt'],
            srMap[usersMap['ananya@gmail.com']],
            productMap['Natural Water Cooling Terracotta Pitcher (Matka)']
        ]);

        // 15. Favorites
        console.log("Inserting favorites...");
        await client.query(`
            INSERT INTO favorites (user_id, entrepreneur_id, product_id)
            VALUES
                ($1, $3, NULL),
                ($1, NULL, $4),
                ($2, $5, NULL);
        `, [
            usersMap['ananya@gmail.com'], usersMap['priya@gmail.com'],
            epMap[usersMap['ramesh@hunarhub.com']],
            productMap['Handwoven Pure Silk Banarasi Dupatta'],
            epMap[usersMap['sunita@hunarhub.com']]
        ]);

        // 16. Notifications
        console.log("Inserting notifications...");
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES
                ($1, 'Welcome to HunarHub', 'Discover skilled local micro-entrepreneurs in your neighborhood.', 'SYSTEM', true),
                ($2, 'Order Confirmed', 'Your order #1 has been confirmed by Ramesh Leather Crafts.', 'ORDER', true),
                ($3, 'New Service Request', 'You have received a new service request for custom blouse stitching.', 'SERVICE_REQUEST', false)
        `, [usersMap['ananya@gmail.com'], usersMap['priya@gmail.com'], usersMap['sunita@hunarhub.com']]);

        // 18. Seed Portfolio Items
        console.log("Inserting portfolio items...");
        await client.query(`
            INSERT INTO portfolio_items (entrepreneur_id, title, description, image_url, price)
            VALUES
                ($1, 'Custom Resoling Italian Oxford Shoes', 'Resoling formal men leather shoes with Goodyear welt stitching.', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500', 750.00),
                ($1, 'Handcrafted Leather Travel Duffel Bag', 'Vegetable tanned full-grain leather duffel bag crafted for vintage aesthetic.', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 3499.00),
                ($2, 'Terracotta Traditional Water Pitcher (Matka)', 'Hand-thrown earthen clay matka with stainless steel tap.', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500', 450.00),
                ($2, 'Hand-painted Decorative Terracotta Flower Vases', 'Set of 3 hand-painted clay vases with folk art designs.', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500', 899.00),
                ($3, 'Heavy Banarasi Silk Zardozi Lehenga Blouse', 'Custom embroidered bridal blouse with antique gold zari work.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500', 2500.00),
                ($4, 'Carved Teak Wood Folding Coffee Table', 'Solide teak wood table featuring traditional floral hand carvings.', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=500', 4200.00);
        `, [
            epMap[usersMap['ramesh@hunarhub.com']],
            epMap[usersMap['lakshmi@hunarhub.com']],
            epMap[usersMap['sunita@hunarhub.com']],
            epMap[usersMap['mohan@hunarhub.com']]
        ]);

        // 19. Seed Quotes
        console.log("Inserting sample quotes...");
        await client.query(`
            INSERT INTO quotes (service_request_id, entrepreneur_id, proposed_price, estimated_completion, message, status)
            VALUES
                ($1, $2, 650.00, '2 Days', 'I can deliver custom terracotta cookware with heat-resistant clay within 48 hours.', 'PENDING'),
                ($1, $3, 700.00, '3 Days', 'Including extra glazed lid and natural cooling pot coating.', 'PENDING');
        `, [
            srMap[usersMap['priya@gmail.com']],
            epMap[usersMap['lakshmi@hunarhub.com']],
            epMap[usersMap['mohan@hunarhub.com']]
        ]);

        // 20. Seed Messages
        console.log("Inserting sample messages...");
        await client.query(`
            INSERT INTO messages (sender_id, receiver_id, service_request_id, message_text, is_read)
            VALUES
                ($1, $2, $3, 'Hello Sunita, I have uploaded the reference blouse pattern. Can you finish it by Friday?', true),
                ($2, $1, $3, 'Namaste Ananya ji! Yes, Friday is doable. Please provide the exact sleeve measurement.', true);
        `, [
            usersMap['ananya@gmail.com'],
            usersMap['sunita@hunarhub.com'],
            srMap[usersMap['ananya@gmail.com']]
        ]);

        await client.query("COMMIT");
        console.log("✅ Database seeding completed successfully!");
        console.log("\n🔑 Test Accounts Summary:");
        console.log("-----------------------------------------");
        console.log("ADMIN:        admin@hunarhub.com       / admin123");
        console.log("ENTREPRENEUR: ramesh@hunarhub.com      / password123");
        console.log("ENTREPRENEUR: lakshmi@hunarhub.com     / password123");
        console.log("ENTREPRENEUR: sunita@hunarhub.com      / password123");
        console.log("ENTREPRENEUR: mohan@hunarhub.com       / password123");
        console.log("CUSTOMER:     ananya@gmail.com         / password123");
        console.log("CUSTOMER:     vikram@gmail.com         / password123");
        console.log("CUSTOMER:     priya@gmail.com          / password123");
        console.log("-----------------------------------------");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Error during database seeding:", err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
