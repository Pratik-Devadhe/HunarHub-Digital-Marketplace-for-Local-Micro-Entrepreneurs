const pool = require('./config/db');

async function dumpAllTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        for (const { table_name } of res.rows) {
            const cols = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table_name]);
            console.log(`\nTABLE: ${table_name}`);
            console.log(cols.rows.map(c => `${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`).join(', '));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
dumpAllTables();
