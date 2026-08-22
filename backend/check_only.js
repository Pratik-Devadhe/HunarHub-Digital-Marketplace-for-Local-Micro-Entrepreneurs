const pool = require('./config/db');

async function checkOnlyChecks() {
    try {
        const res = await pool.query(`
            SELECT conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) AS constraint_def
            FROM pg_constraint
            WHERE contype = 'c' AND connamespace = 'public'::regnamespace;
        `);
        console.log("=== CHECK CONSTRAINTS ===");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkOnlyChecks();
