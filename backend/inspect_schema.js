const pool = require('./config/db');

async function inspectSchema() {
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        console.log("Tables in DB:", tablesRes.rows.map(r => r.table_name));

        for (const table of tablesRes.rows) {
            const colsRes = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = '${table.table_name}';
            `);
            console.log(`\n--- Table: ${table.table_name} ---`);
            console.table(colsRes.rows);
        }

        const usersRes = await pool.query("SELECT * FROM users;");
        console.log("\nUsers in DB:");
        console.table(usersRes.rows.map(u => ({ id: u.id, email: u.email, role: u.role, first_name: u.first_name, last_name: u.last_name })));

    } catch (err) {
        console.error("Schema inspect error:", err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
