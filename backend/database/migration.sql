-- Safe Migration Patch for HunarHub Modernization

-- 1. Extend entrepreneur_profiles with verification flags & extra metadata
ALTER TABLE entrepreneur_profiles
ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_artisan_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_business_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS starting_price NUMERIC(10,2) DEFAULT 250.00,
ADD COLUMN IF NOT EXISTS unavailable_dates TEXT[] DEFAULT '{}';

-- Set sample verification flags for existing entrepreneurs
UPDATE entrepreneur_profiles 
SET is_identity_verified = TRUE, is_phone_verified = TRUE, is_artisan_verified = TRUE, is_business_verified = TRUE 
WHERE verification_status = 'APPROVED';

-- 2. Portfolio Items Table
CREATE TABLE IF NOT EXISTS portfolio_items (
    id BIGSERIAL PRIMARY KEY,
    entrepreneur_id BIGINT NOT NULL REFERENCES entrepreneur_profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    price NUMERIC(10,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Extend Service Requests Table
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS request_entrepreneur_fk;
ALTER TABLE service_requests ALTER COLUMN entrepreneur_id DROP NOT NULL;
ALTER TABLE service_requests ADD CONSTRAINT request_entrepreneur_fk 
    FOREIGN KEY (entrepreneur_id) REFERENCES entrepreneur_profiles(id) ON DELETE CASCADE;

ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS request_service_fk;
ALTER TABLE service_requests ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE service_requests ADD CONSTRAINT request_service_fk 
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS title VARCHAR(150),
ADD COLUMN IF NOT EXISTS reference_image TEXT,
ADD COLUMN IF NOT EXISTS budget_min NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS budget_max NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Relax/update status check on service_requests
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS request_status_check;
ALTER TABLE service_requests ADD CONSTRAINT request_status_check
CHECK (status IN (
    'REQUESTED',
    'PENDING',
    'QUOTED',
    'ACCEPTED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
));

-- 4. Multiple Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
    id BIGSERIAL PRIMARY KEY,
    service_request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    entrepreneur_id BIGINT NOT NULL REFERENCES entrepreneur_profiles(id) ON DELETE CASCADE,
    proposed_price NUMERIC(10,2) NOT NULL,
    estimated_completion VARCHAR(100),
    message TEXT,
    materials_included TEXT,
    additional_requirements TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_quote_per_entrepreneur UNIQUE (service_request_id, entrepreneur_id),
    CONSTRAINT quote_status_check CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CHANGES_REQUESTED'))
);

-- 5. Messages Table for In-App Chat
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_request_id BIGINT REFERENCES service_requests(id) ON DELETE SET NULL,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    image_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Extend Favorites Table to support service_id
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS service_id BIGINT REFERENCES services(id) ON DELETE CASCADE;
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorite_target_check;
ALTER TABLE favorites ADD CONSTRAINT favorite_target_check CHECK (
    entrepreneur_id IS NOT NULL OR product_id IS NOT NULL OR service_id IS NOT NULL
);

-- Unique indexes for favorites
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_user_service ON favorites(user_id, service_id) WHERE service_id IS NOT NULL;

-- 7. Extend Reviews Table with Multi-Criteria Ratings
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS timeliness_rating INTEGER CHECK (timeliness_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS is_verified_order BOOLEAN DEFAULT TRUE;

-- 8. Extend Products table with handmade flag
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_handmade BOOLEAN DEFAULT TRUE;

-- 9. Update order status check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS order_status_check;
ALTER TABLE orders ADD CONSTRAINT order_status_check CHECK (
    status IN ('PENDING', 'ACCEPTED', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED')
);

-- 10. Useful Indexes
CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(service_request_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entrepreneur ON portfolio_items(entrepreneur_id);
