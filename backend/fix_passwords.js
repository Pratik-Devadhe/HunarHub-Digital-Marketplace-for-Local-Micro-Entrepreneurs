const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function fixUserPasswords() {
    try {
        const adminHash = await bcrypt.hash("admin123", 10);
        const passHash = await bcrypt.hash("password123", 10);

        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@hunarhub.com'", [adminHash]);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email != 'admin@hunarhub.com'", [passHash]);

        console.log("Updated test user password hashes successfully!");
    } catch (err) {
        console.error("Error updating passwords:", err);
    } finally {
        await pool.end();
    }
}

fixUserPasswords();
