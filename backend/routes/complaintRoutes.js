const express = require("express");
const { createComplaint, getMyComplaints, getComplaintById } = require("../controllers/complaintController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// POST /
router.post("/", authenticateUser, createComplaint);
// GET my
router.get("/my", authenticateUser, getMyComplaints);
// GET :id
router.get("/:id", authenticateUser, getComplaintById);

module.exports = router;