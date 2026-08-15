const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const signToken = user => jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
);

const register = async (req, res) => {
    try {
        const { full_name, email, phone, password, role = "CUSTOMER" } = req.body;
        if (!full_name || !email || !password) throw httpError("full_name, email and password are required");
        if (!["CUSTOMER", "ENTREPRENEUR"].includes(role)) throw httpError("Invalid registration role");
        if (password.length < 6) throw httpError("Password must contain at least 6 characters");

        const result = await withTransaction(async client => {
            const exists = await client.query(
                "SELECT id FROM users WHERE LOWER(email)=LOWER($1) OR ($2::text IS NOT NULL AND phone=$2)",
                [email.trim(), phone || null]
            );
            if (exists.rowCount) throw httpError("Email or phone already registered", 409);

            const passwordHash = await bcrypt.hash(password, 12);
            const user = await client.query(
                `INSERT INTO users(full_name,email,phone,password_hash,role)
                 VALUES($1,$2,$3,$4,$5)
                 RETURNING id,full_name,email,phone,role,profile_image,is_active,created_at`,
                [full_name.trim(), email.trim().toLowerCase(), phone || null, passwordHash, role]
            );

            if (role === "ENTREPRENEUR") {
                await client.query(
                    `INSERT INTO entrepreneur_profiles(user_id)
                     VALUES($1)`,
                    [user.rows[0].id]
                );
            }
            return user.rows[0];
        });

        res.status(201).json({ success: true, message: "Registration successful", token: signToken(result), user: result });
    } catch (error) { sendError(res, error); }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) throw httpError("Email and password are required");

        const user = await withTransaction(async client => {
            const r = await client.query(
                `SELECT id,full_name,email,phone,password_hash,role,profile_image,is_active
                 FROM users WHERE LOWER(email)=LOWER($1)`,
                [email.trim()]
            );
            if (!r.rowCount) throw httpError("Invalid email or password", 401);
            if (!r.rows[0].is_active) throw httpError("Account is inactive", 403);
            const ok = await bcrypt.compare(password, r.rows[0].password_hash);
            if (!ok) throw httpError("Invalid email or password", 401);
            delete r.rows[0].password_hash;
            return r.rows[0];
        });

        res.json({ success: true, message: "Login successful", token: signToken(user), user });
    } catch (error) { sendError(res, error); }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await withTransaction(async client => {
            const r = await client.query(
                `SELECT id,full_name,email,phone,role,profile_image,is_active,created_at,updated_at
                 FROM users WHERE id=$1`,
                [id(req.user.id, "user id")]
            );
            if (!r.rowCount) throw httpError("User not found", 404);
            return r.rows[0];
        });
        res.json({ success: true, user });
    } catch (error) { sendError(res, error); }
};

const updateProfile = async (req, res) => {
    try {
        const { full_name, phone, profile_image, password } = req.body;
        const user = await withTransaction(async client => {
            const fields = [];
            const values = [];
            let i = 1;
            if (full_name !== undefined) { fields.push(`full_name=$${i++}`); values.push(full_name.trim()); }
            if (phone !== undefined) { fields.push(`phone=$${i++}`); values.push(phone || null); }
            if (profile_image !== undefined) { fields.push(`profile_image=$${i++}`); values.push(profile_image || null); }
            if (password !== undefined) {
                if (password.length < 6) throw httpError("Password must contain at least 6 characters");
                fields.push(`password_hash=$${i++}`); values.push(await bcrypt.hash(password, 12));
            }
            if (!fields.length) throw httpError("No fields to update");
            fields.push("updated_at=CURRENT_TIMESTAMP");
            values.push(id(req.user.id, "user id"));
            const r = await client.query(
                `UPDATE users SET ${fields.join(", ")} WHERE id=$${i}
                 RETURNING id,full_name,email,phone,role,profile_image,is_active,created_at,updated_at`,
                values
            );
            if (!r.rowCount) throw httpError("User not found", 404);
            return r.rows[0];
        });
        res.json({ success: true, message: "Profile updated", user });
    } catch (error) { sendError(res, error); }
};

module.exports = { register, login, getCurrentUser, updateProfile };
