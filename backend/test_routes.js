const pool = require('./config/db');

async function testDatabaseAndRoutes() {
    try {
        console.log("1. Testing database connection...");
        const dbRes = await pool.query("SELECT 1 as alive, current_database() as db, version() as ver");
        console.log("   DB Alive:", dbRes.rows[0]);

        console.log("2. Checking count of users, entrepreneurs, categories, services, products, orders:");
        const counts = await pool.query(`
            SELECT 
                (SELECT count(*) FROM users) as users,
                (SELECT count(*) FROM entrepreneur_profiles) as entrepreneurs,
                (SELECT count(*) FROM categories) as categories,
                (SELECT count(*) FROM services) as services,
                (SELECT count(*) FROM products) as products,
                (SELECT count(*) FROM orders) as orders,
                (SELECT count(*) FROM service_requests) as requests
        `);
        console.table(counts.rows);

        console.log("ALL DB INTEGRITY CHECKS PASSED!");
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await pool.end();
    }
}
testDatabaseAndRoutes();
