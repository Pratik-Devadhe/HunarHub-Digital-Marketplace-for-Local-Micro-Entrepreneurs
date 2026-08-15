-- Required because the original order schema has no entrepreneur_id and
-- order_items has no per-item status. The order controller intentionally
-- enforces one entrepreneur per order.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS entrepreneur_id BIGINT;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS order_entrepreneur_fk;

ALTER TABLE orders
ADD CONSTRAINT order_entrepreneur_fk
FOREIGN KEY (entrepreneur_id)
REFERENCES entrepreneur_profiles(id)
ON DELETE RESTRICT;

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING';

ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_item_status_check;

ALTER TABLE order_items
ADD CONSTRAINT order_item_status_check
CHECK (status IN (
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY',
    'COMPLETED',
    'CANCELLED'
));

-- Strongly recommended consistency indexes/constraints:
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_user_entrepreneur
ON favorites(user_id, entrepreneur_id)
WHERE entrepreneur_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_user_product
ON favorites(user_id, product_id)
WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_entrepreneur
ON orders(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_order_items_status
ON order_items(status);
