-- ============================================================
-- HUNARHUB DATABASE SCHEMA
-- Digital Marketplace for Local Micro-Entrepreneurs
-- PostgreSQL + PostGIS
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;


-- ============================================================
-- 2. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,

    email VARCHAR(150) UNIQUE NOT NULL,

    phone VARCHAR(15) UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',

    profile_image TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_role_check
        CHECK (role IN (
            'CUSTOMER',
            'ENTREPRENEUR',
            'ADMIN'
        ))
);


-- ============================================================
-- 3. CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) UNIQUE NOT NULL,

    description TEXT,

    image_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 4. ENTREPRENEUR PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS entrepreneur_profiles (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT UNIQUE NOT NULL,

    business_name VARCHAR(150),

    bio TEXT,

    experience_years INTEGER DEFAULT 0,

    verification_status VARCHAR(20)
        NOT NULL DEFAULT 'PENDING',

    phone VARCHAR(15),

    address TEXT,

    city VARCHAR(100),

    state VARCHAR(100),

    pincode VARCHAR(10),

    location GEOGRAPHY(POINT, 4326),

    average_rating NUMERIC(3,2) DEFAULT 0,

    total_reviews INTEGER DEFAULT 0,

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    is_identity_verified BOOLEAN DEFAULT FALSE,

    is_phone_verified BOOLEAN DEFAULT TRUE,

    is_artisan_verified BOOLEAN DEFAULT FALSE,

    is_business_verified BOOLEAN DEFAULT FALSE,

    profile_views INTEGER DEFAULT 0,

    starting_price NUMERIC(10,2) DEFAULT 250.00,

    unavailable_dates TEXT[] DEFAULT '{}',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT entrepreneur_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT entrepreneur_verification_check
        CHECK (
            verification_status IN (
                'PENDING',
                'APPROVED',
                'REJECTED'
            )
        ),

    CONSTRAINT entrepreneur_experience_check
        CHECK (experience_years >= 0)
);


-- ============================================================
-- 5. SKILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
    id BIGSERIAL PRIMARY KEY,

    category_id BIGINT NOT NULL,

    name VARCHAR(100) NOT NULL,

    description TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT skill_category_fk
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_skill_per_category
        UNIQUE (category_id, name)
);


-- ============================================================
-- 6. ENTREPRENEUR SKILLS
-- MANY-TO-MANY
-- ============================================================

CREATE TABLE IF NOT EXISTS entrepreneur_skills (
    entrepreneur_id BIGINT NOT NULL,

    skill_id BIGINT NOT NULL,

    PRIMARY KEY (
        entrepreneur_id,
        skill_id
    ),

    CONSTRAINT entrepreneur_skill_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT entrepreneur_skill_skill_fk
        FOREIGN KEY (skill_id)
        REFERENCES skills(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 6B. PORTFOLIO ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolio_items (
    id BIGSERIAL PRIMARY KEY,

    entrepreneur_id BIGINT NOT NULL,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    image_url TEXT,

    category_id BIGINT,

    price NUMERIC(10,2),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT portfolio_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT portfolio_category_fk
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 7. SERVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,

    entrepreneur_id BIGINT NOT NULL,

    category_id BIGINT,

    skill_id BIGINT,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    price NUMERIC(10,2),

    price_type VARCHAR(20) NOT NULL DEFAULT 'FIXED',

    estimated_duration INTEGER,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT service_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT service_category_fk
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

    CONSTRAINT service_skill_fk
        FOREIGN KEY (skill_id)
        REFERENCES skills(id)
        ON DELETE SET NULL,

    CONSTRAINT service_price_type_check
        CHECK (
            price_type IN (
                'FIXED',
                'STARTING_FROM',
                'NEGOTIABLE'
            )
        ),

    CONSTRAINT service_price_check
        CHECK (
            price IS NULL OR price >= 0
        )
);


-- ============================================================
-- 8. PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,

    entrepreneur_id BIGINT NOT NULL,

    category_id BIGINT,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    price NUMERIC(10,2) NOT NULL,

    stock_quantity INTEGER NOT NULL DEFAULT 0,

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    is_handmade BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT product_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT product_category_fk
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

    CONSTRAINT product_price_check
        CHECK (price >= 0),

    CONSTRAINT product_stock_check
        CHECK (stock_quantity >= 0)
);


-- ============================================================
-- 9. PRODUCT IMAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,

    product_id BIGINT NOT NULL,

    image_url TEXT NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT product_image_product_fk
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 10. ENTREPRENEUR AVAILABILITY
-- ============================================================

CREATE TABLE IF NOT EXISTS entrepreneur_availability (
    id BIGSERIAL PRIMARY KEY,

    entrepreneur_id BIGINT NOT NULL,

    day_of_week INTEGER NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT availability_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT availability_day_check
        CHECK (
            day_of_week BETWEEN 0 AND 6
        ),

    CONSTRAINT availability_time_check
        CHECK (
            end_time > start_time
        )
);


-- ============================================================
-- 11. SERVICE REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS service_requests (
    id BIGSERIAL PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    entrepreneur_id BIGINT,

    service_id BIGINT,

    category_id BIGINT,

    title VARCHAR(150),

    description TEXT,

    reference_image TEXT,

    budget_min NUMERIC(10,2),

    budget_max NUMERIC(10,2),

    location_address TEXT,

    city VARCHAR(100),

    requested_date DATE,

    requested_time TIME,

    address TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    estimated_price NUMERIC(10,2),

    final_price NUMERIC(10,2),

    entrepreneur_note TEXT,

    customer_note TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT request_customer_fk
        FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT request_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT request_service_fk
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE CASCADE,

    CONSTRAINT request_category_fk
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

    CONSTRAINT request_status_check
        CHECK (
            status IN (
                'REQUESTED',
                'PENDING',
                'QUOTED',
                'ACCEPTED',
                'CONFIRMED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED',
                'REJECTED'
            )
        ),

    CONSTRAINT request_estimated_price_check
        CHECK (
            estimated_price IS NULL OR estimated_price >= 0
        ),

    CONSTRAINT request_final_price_check
        CHECK (
            final_price IS NULL OR final_price >= 0
        )
);


-- ============================================================
-- 11B. QUOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS quotes (
    id BIGSERIAL PRIMARY KEY,

    service_request_id BIGINT NOT NULL,

    entrepreneur_id BIGINT NOT NULL,

    proposed_price NUMERIC(10,2) NOT NULL,

    estimated_completion VARCHAR(100),

    message TEXT,

    materials_included TEXT,

    additional_requirements TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT quote_request_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT quote_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_quote_per_entrepreneur
        UNIQUE (service_request_id, entrepreneur_id),

    CONSTRAINT quote_status_check
        CHECK (
            status IN (
                'PENDING',
                'ACCEPTED',
                'REJECTED',
                'CHANGES_REQUESTED'
            )
        )
);


-- ============================================================
-- 11C. MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,

    sender_id BIGINT NOT NULL,

    receiver_id BIGINT NOT NULL,

    service_request_id BIGINT,

    order_id BIGINT,

    message_text TEXT NOT NULL,

    image_url TEXT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT message_sender_fk
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT message_receiver_fk
        FOREIGN KEY (receiver_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT message_service_request_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE SET NULL,

    CONSTRAINT message_order_fk
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 12. ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    entrepreneur_id BIGINT,

    total_amount NUMERIC(10,2) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    shipping_address TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT order_customer_fk
        FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT order_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE RESTRICT,

    CONSTRAINT order_amount_check
        CHECK (total_amount >= 0),

    CONSTRAINT order_status_check
        CHECK (
            status IN (
                'PENDING',
                'ACCEPTED',
                'CONFIRMED',
                'PROCESSING',
                'READY',
                'SHIPPED',
                'DELIVERED',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    CONSTRAINT order_payment_status_check
        CHECK (
            payment_status IN (
                'NOT_AVAILABLE',
                'PENDING',
                'PAID',
                'FAILED',
                'REFUNDED'
            )
        )
);


-- ============================================================
-- 13. ORDER ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,

    order_id BIGINT NOT NULL,

    product_id BIGINT NOT NULL,

    entrepreneur_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL,

    unit_price NUMERIC(10,2) NOT NULL,

    subtotal NUMERIC(10,2) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT order_item_order_fk
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT order_item_product_fk
        FOREIGN KEY (product_id)
        REFERENCES products(id),

    CONSTRAINT order_item_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id),

    CONSTRAINT order_item_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT order_item_price_check
        CHECK (unit_price >= 0),

    CONSTRAINT order_item_subtotal_check
        CHECK (subtotal >= 0),

    CONSTRAINT order_item_status_check
        CHECK (
            status IN (
                'PENDING',
                'CONFIRMED',
                'PROCESSING',
                'READY',
                'COMPLETED',
                'CANCELLED'
            )
        )
);


-- ============================================================
-- 14. PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,

    order_id BIGINT,

    service_request_id BIGINT,

    customer_id BIGINT NOT NULL,

    amount NUMERIC(10,2) NOT NULL,

    payment_method VARCHAR(30),

    transaction_id VARCHAR(200),

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    paid_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT payment_order_fk
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL,

    CONSTRAINT payment_service_request_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE SET NULL,

    CONSTRAINT payment_customer_fk
        FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT payment_amount_check
        CHECK (amount >= 0),

    CONSTRAINT payment_status_check
        CHECK (
            status IN (
                'PENDING',
                'SUCCESS',
                'FAILED',
                'REFUNDED'
            )
        ),

    CONSTRAINT payment_reference_check
        CHECK (
            order_id IS NOT NULL
            OR service_request_id IS NOT NULL
        )
);


-- ============================================================
-- 15. REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    entrepreneur_id BIGINT NOT NULL,

    product_id BIGINT,

    service_request_id BIGINT,

    rating INTEGER NOT NULL,

    comment TEXT,

    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),

    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),

    timeliness_rating INTEGER CHECK (timeliness_rating BETWEEN 1 AND 5),

    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),

    is_verified_order BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT review_customer_fk
        FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT review_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT review_product_fk
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT review_service_request_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT review_rating_check
        CHECK (
            rating BETWEEN 1 AND 5
        )
);


-- ============================================================
-- 16. FAVORITES
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    entrepreneur_id BIGINT,

    product_id BIGINT,

    service_id BIGINT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT favorite_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT favorite_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT favorite_product_fk
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT favorite_service_fk
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE CASCADE,

    CONSTRAINT favorite_target_check
        CHECK (
            entrepreneur_id IS NOT NULL
            OR product_id IS NOT NULL
            OR service_id IS NOT NULL
        )
);


-- ============================================================
-- 17. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    type VARCHAR(50),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT notification_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 18. COMPLAINTS / DISPUTES
-- ============================================================

CREATE TABLE IF NOT EXISTS complaints (
    id BIGSERIAL PRIMARY KEY,

    customer_id BIGINT,

    entrepreneur_id BIGINT,

    order_id BIGINT,

    service_request_id BIGINT,

    subject VARCHAR(200) NOT NULL,

    description TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    admin_response TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    resolved_at TIMESTAMP,

    CONSTRAINT complaint_customer_fk
        FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT complaint_entrepreneur_fk
        FOREIGN KEY (entrepreneur_id)
        REFERENCES entrepreneur_profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT complaint_order_fk
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL,

    CONSTRAINT complaint_service_request_fk
        FOREIGN KEY (service_request_id)
        REFERENCES service_requests(id)
        ON DELETE SET NULL,

    CONSTRAINT complaint_status_check
        CHECK (
            status IN (
                'OPEN',
                'UNDER_REVIEW',
                'RESOLVED',
                'REJECTED'
            )
        )
);


-- ============================================================
-- 19. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_entrepreneur_location
ON entrepreneur_profiles
USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_entrepreneur_city
ON entrepreneur_profiles(city);

CREATE INDEX IF NOT EXISTS idx_entrepreneur_verification
ON entrepreneur_profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_entrepreneur
ON products(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_services_category
ON services(category_id);

CREATE INDEX IF NOT EXISTS idx_services_entrepreneur
ON services(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer
ON orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer
ON service_requests(customer_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_entrepreneur
ON service_requests(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_status
ON service_requests(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_participants
ON messages(sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_quotes_request
ON quotes(service_request_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_entrepreneur
ON portfolio_items(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_orders_entrepreneur
ON orders(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_order_items_status
ON order_items(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fav_user_ep
ON favorites(user_id, entrepreneur_id) WHERE entrepreneur_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fav_user_prod
ON favorites(user_id, product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_entrepreneur
ON reviews(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);


-- ============================================================
-- 20. SAMPLE CATEGORIES
-- ============================================================

INSERT INTO categories (name, description)
VALUES
    ('Cobbler', 'Shoe repair and leather services'),
    ('Potter', 'Traditional pottery and clay products'),
    ('Tailor', 'Clothing stitching and alteration'),
    ('Artisan', 'Handmade traditional crafts'),
    ('Handicraft', 'Handmade decorative and useful products'),
    ('Jewelry', 'Handmade and traditional jewelry'),
    ('Wood Worker', 'Wood carving and handmade wooden products'),
    ('Painter', 'Painting and artistic services'),
    ('Food Vendor', 'Local homemade food and snacks')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- END OF SCHEMA
-- ============================================================