const pool = require('./config/db');

async function checkUsers() {
    try {
        const res = await pool.query("SELECT id, name, email, role, password_hash FROM users;");
        console.log("Users in DB:", res.rows);
    } catch (err) {
        console.error("Error querying users:", err);
    } finally {
        await pool.end();
    }
}

checkUsers();
