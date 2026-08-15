const express = require("express");
const { getUser, updateUser, deleteUser } = require("../controllers/userController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET :id
router.get("/:id", authenticateUser, getUser);
// PUT :id
router.put("/:id", authenticateUser, updateUser);
// DELETE :id
router.delete("/:id", authenticateUser, deleteUser);

module.exports = router;