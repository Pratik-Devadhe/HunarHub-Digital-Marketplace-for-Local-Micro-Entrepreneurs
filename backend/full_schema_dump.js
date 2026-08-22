const pool = require('./config/db');

async function fullSchemaDump() {
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        
        console.log("=== POSTGRESQL TABLES DUMP ===");
        for (const { table_name } of tablesRes.rows) {
            const cols = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table_name]);
            
            const constraints = await pool.query(`
                SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                  ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = $1;
            `, [table_name]);

            console.log(`\nTable: ${table_name}`);
            console.table(cols.rows);
            if (constraints.rows.length) {
                console.log(`Constraints for ${table_name}:`);
                console.table(constraints.rows);
            }
        }
    } catch (err) {
        console.error("Schema dump failed:", err);
    } finally {
        await pool.end();
    }
}

fullSchemaDump();
