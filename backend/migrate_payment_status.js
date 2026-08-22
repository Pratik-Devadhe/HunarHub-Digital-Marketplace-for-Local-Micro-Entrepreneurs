const pool = require('./config/db');

async function addNotAvailableToPaymentStatus() {
    try {
        console.log("Updating order_payment_status_check constraint...");
        await pool.query(`
            ALTER TABLE orders DROP CONSTRAINT IF EXISTS order_payment_status_check;
            ALTER TABLE orders ADD CONSTRAINT order_payment_status_check 
            CHECK (payment_status::text = ANY (ARRAY['NOT_AVAILABLE', 'PENDING', 'PAID', 'FAILED', 'REFUNDED']::text[]));
        `);
        console.log("Successfully updated order_payment_status_check constraint!");

        console.log("Updating payments payment_status_check constraint...");
        await pool.query(`
            ALTER TABLE payments DROP CONSTRAINT IF EXISTS payment_status_check;
            ALTER TABLE payments ADD CONSTRAINT payment_status_check 
            CHECK (status::text = ANY (ARRAY['NOT_AVAILABLE', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']::text[]));
        `);
        console.log("Successfully updated payment_status_check constraint!");
    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        await pool.end();
    }
}
addNotAvailableToPaymentStatus();
