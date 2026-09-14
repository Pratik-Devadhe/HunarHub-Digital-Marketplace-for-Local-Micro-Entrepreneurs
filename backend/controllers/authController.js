const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");
const { normalizePhone } = require("../utils/phone");

const JWT_SECRET = process.env.JWT_SECRET || "hunarhub_super_secret_jwt_key_development_2026";

const signToken = user => jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
);

const fetchEntrepreneurProfile = async (client, userId) => {
    const res = await client.query(
        `SELECT id, business_name, bio, experience_years, verification_status,
                phone, address, city, state, pincode, average_rating, total_reviews,
                is_available, is_identity_verified, is_phone_verified, is_artisan_verified,
                is_business_verified, profile_views, starting_price
         FROM entrepreneur_profiles WHERE user_id = $1`,
        [userId]
    );
    return res.rows[0] || null;
};

const register = async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            password,
            role = "CUSTOMER",
            business_name,
            city,
            address,
            bio,
            experience_years
        } = req.body;

        // 1. Validation
        if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
            throw httpError("Full name is required (minimum 2 characters)", 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
            throw httpError("Please provide a valid email address", 400);
        }

        const cleanPhone = normalizePhone(phone);

        if (!password || typeof password !== "string" || password.length < 6) {
            throw httpError("Password must contain at least 6 characters", 400);
        }

        const normalizedRole = (role || "CUSTOMER").toUpperCase().trim();
        if (!["CUSTOMER", "ENTREPRENEUR"].includes(normalizedRole)) {
            throw httpError("Invalid role. Must be CUSTOMER or ENTREPRENEUR", 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = full_name.trim();

        // 2. Transaction for duplicate check and atomic insert
        const result = await withTransaction(async client => {
            // Distinct check for email
            const emailCheck = await client.query(
                "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
                [cleanEmail]
            );
            if (emailCheck.rowCount > 0) {
                throw httpError("An account with this email address already exists. Please sign in instead.", 409);
            }

            // Distinct check for phone
            if (cleanPhone) {
                const phoneCheck = await client.query(
                    "SELECT id FROM users WHERE phone = $1",
                    [cleanPhone]
                );
                if (phoneCheck.rowCount > 0) {
                    throw httpError("This phone number is already registered. Please sign in or use another number.", 409);
                }
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const userRes = await client.query(
                `INSERT INTO users(full_name, email, phone, password_hash, role)
                 VALUES($1, $2, $3, $4, $5)
                 RETURNING id, full_name, email, phone, role, profile_image, is_active, created_at`,
                [cleanName, cleanEmail, cleanPhone, passwordHash, normalizedRole]
            );

            const newUser = userRes.rows[0];

            let profile = null;
            if (normalizedRole === "ENTREPRENEUR") {
                const epBusinessName = (business_name && typeof business_name === "string" && business_name.trim()) ? business_name.trim() : cleanName;
                const epCity = (city && typeof city === "string" && city.trim()) ? city.trim() : null;
                const epAddress = (address && typeof address === "string" && address.trim()) ? address.trim() : null;
                const epBio = (bio && typeof bio === "string" && bio.trim()) ? bio.trim() : null;
                const epExpYears = experience_years && !isNaN(Number(experience_years)) ? Math.max(0, parseInt(experience_years)) : 0;

                const profileRes = await client.query(
                    `INSERT INTO entrepreneur_profiles(
                         user_id, business_name, bio, experience_years, verification_status,
                         phone, address, city, state, pincode,
                         is_available, is_phone_verified, is_identity_verified
                     )
                     VALUES($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9, true, $10, false)
                     RETURNING id, business_name, bio, experience_years, verification_status,
                               phone, address, city, state, pincode, average_rating, total_reviews,
                               is_available`,
                    [
                        newUser.id,
                        epBusinessName,
                        epBio,
                        epExpYears,
                        cleanPhone,
                        epAddress,
                        epCity,
                        null,
                        null,
                        Boolean(cleanPhone)
                    ]
                );
                profile = profileRes.rows[0];
            }

            return { user: newUser, profile };
        });

        const token = signToken(result.user);
        const responseUser = {
            ...result.user,
            profile: result.profile,
            entrepreneur_id: result.profile?.id || null
        };

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: responseUser,
            entrepreneur: result.profile
        });
    } catch (error) {
        sendError(res, error);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) throw httpError("Email and password are required", 400);

        const cleanEmail = email.trim().toLowerCase();

        const result = await withTransaction(async client => {
            const r = await client.query(
                `SELECT id, full_name, email, phone, password_hash, role, profile_image, is_active
                 FROM users WHERE LOWER(email) = LOWER($1)`,
                [cleanEmail]
            );
            if (!r.rowCount) throw httpError("Invalid email or password", 401);

            const user = r.rows[0];
            if (!user.is_active) throw httpError("Account is inactive. Please contact support.", 403);

            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) throw httpError("Invalid email or password", 401);

            delete user.password_hash;

            let profile = null;
            if (user.role === "ENTREPRENEUR") {
                profile = await fetchEntrepreneurProfile(client, user.id);
            }

            return { user, profile };
        });

        const token = signToken(result.user);
        const responseUser = {
            ...result.user,
            profile: result.profile,
            entrepreneur_id: result.profile?.id || null
        };

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: responseUser,
            entrepreneur: result.profile
        });
    } catch (error) {
        sendError(res, error);
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const result = await withTransaction(async client => {
            const r = await client.query(
                `SELECT id, full_name, email, phone, role, profile_image, is_active, created_at, updated_at
                 FROM users WHERE id = $1`,
                [id(req.user.id, "user id")]
            );
            if (!r.rowCount) throw httpError("User not found", 404);

            const user = r.rows[0];
            let profile = null;
            if (user.role === "ENTREPRENEUR") {
                profile = await fetchEntrepreneurProfile(client, user.id);
            }

            return { user, profile };
        });

        const responseUser = {
            ...result.user,
            profile: result.profile,
            entrepreneur_id: result.profile?.id || null
        };

        res.json({ success: true, user: responseUser, entrepreneur: result.profile });
    } catch (error) {
        sendError(res, error);
    }
};

const updateProfile = async (req, res) => {
    try {
        const { full_name, phone, profile_image, password } = req.body;
        const user = await withTransaction(async client => {
            const fields = [];
            const values = [];
            let i = 1;
            if (full_name !== undefined) {
                if (typeof full_name !== "string" || full_name.trim().length < 2) {
                    throw httpError("Full name must be at least 2 characters", 400);
                }
                fields.push(`full_name=$${i++}`);
                values.push(full_name.trim());
            }
            if (phone !== undefined) {
                const cleanPhone = phone ? normalizePhone(phone) : null;
                fields.push(`phone=$${i++}`);
                values.push(cleanPhone);
            }
            if (profile_image !== undefined) {
                fields.push(`profile_image=$${i++}`);
                values.push(profile_image || null);
            }
            if (password !== undefined) {
                if (password.length < 6) throw httpError("Password must contain at least 6 characters", 400);
                fields.push(`password_hash=$${i++}`);
                values.push(await bcrypt.hash(password, 12));
            }
            if (!fields.length) throw httpError("No fields to update", 400);
            fields.push("updated_at=CURRENT_TIMESTAMP");
            values.push(id(req.user.id, "user id"));
            const r = await client.query(
                `UPDATE users SET ${fields.join(", ")} WHERE id=$${i}
                 RETURNING id, full_name, email, phone, role, profile_image, is_active, created_at, updated_at`,
                values
            );
            if (!r.rowCount) throw httpError("User not found", 404);
            return r.rows[0];
        });
        res.json({ success: true, message: "Profile updated", user });
    } catch (error) {
        sendError(res, error);
    }
};

module.exports = { register, login, getCurrentUser, updateProfile };
