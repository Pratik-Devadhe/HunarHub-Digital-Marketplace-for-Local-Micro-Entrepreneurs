const express = require("express");
const { getSkills, getSkillById, getSkillsByCategory, createSkill, updateSkill, deleteSkill } = require("../controllers/skillController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET /
router.get("/", getSkills);
// GET :id
router.get("/:id", getSkillById);
// GET category/:categoryId
router.get("/category/:categoryId", getSkillsByCategory);
// POST /
router.post("/", authenticateUser, requireAdmin, createSkill);
// PUT :id
router.put("/:id", authenticateUser, requireAdmin, updateSkill);
// DELETE :id
router.delete("/:id", authenticateUser, requireAdmin, deleteSkill);

module.exports = router;