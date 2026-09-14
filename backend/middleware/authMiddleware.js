const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");

        if (type !== "Bearer" || !token) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const secret = process.env.JWT_SECRET || "hunarhub_super_secret_jwt_key_development_2026";
        req.user = jwt.verify(token, secret);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

module.exports = { authenticateUser };
