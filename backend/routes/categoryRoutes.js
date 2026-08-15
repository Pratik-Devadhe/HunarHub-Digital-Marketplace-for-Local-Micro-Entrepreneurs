const express = require("express");
const { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET /
router.get("/", getCategories);
// GET :id
router.get("/:id", getCategoryById);
// POST /
router.post("/", authenticateUser, requireAdmin, createCategory);
// PUT :id
router.put("/:id", authenticateUser, requireAdmin, updateCategory);
// DELETE :id
router.delete("/:id", authenticateUser, requireAdmin, deleteCategory);

module.exports = router;