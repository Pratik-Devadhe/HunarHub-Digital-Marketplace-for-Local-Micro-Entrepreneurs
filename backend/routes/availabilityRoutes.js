const express = require("express");
const { getAvailabilityByEntrepreneurId, getAvailability, addAvailability, updateAvailability, deleteAvailability } = require("../controllers/availabilityController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET /entrepreneur/:id
router.get("/entrepreneur/:id", getAvailabilityByEntrepreneurId);
// GET /
router.get("/", authenticateUser, requireEntrepreneur, getAvailability);
// POST /
router.post("/", authenticateUser, requireEntrepreneur, addAvailability);
// PUT :id
router.put("/:id", authenticateUser, requireEntrepreneur, updateAvailability);
// DELETE :id
router.delete("/:id", authenticateUser, requireEntrepreneur, deleteAvailability);

module.exports = router;