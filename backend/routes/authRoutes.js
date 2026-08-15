const express = require("express");
const { register, login, getCurrentUser, updateProfile } = require("../controllers/authController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// POST register
router.post("/register", register);
// POST login
router.post("/login", login);
// GET me
router.get("/me", authenticateUser, getCurrentUser);
// PUT profile
router.put("/profile", authenticateUser, updateProfile);

module.exports = router;