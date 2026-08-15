const pool = require("../config/db");

async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { withTransaction };
