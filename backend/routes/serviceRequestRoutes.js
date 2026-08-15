const express = require("express");
const { createServiceRequest, getMyRequests, getReceivedRequests, getRequestById, cancelServiceRequest, acceptServiceRequest, rejectServiceRequest, startServiceRequest, completeServiceRequest } = require("../controllers/serviceRequestController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// POST /
router.post("/", authenticateUser, requireCustomer, createServiceRequest);
// GET my
router.get("/my", authenticateUser, requireCustomer, getMyRequests);
// GET received
router.get("/received", authenticateUser, requireEntrepreneur, getReceivedRequests);
// GET :id
router.get("/:id", authenticateUser, getRequestById);
// PUT :id/cancel
router.put("/:id/cancel", authenticateUser, requireCustomer, cancelServiceRequest);
// PUT :id/accept
router.put("/:id/accept", authenticateUser, requireEntrepreneur, acceptServiceRequest);
// PUT :id/reject
router.put("/:id/reject", authenticateUser, requireEntrepreneur, rejectServiceRequest);
// PUT :id/start
router.put("/:id/start", authenticateUser, requireEntrepreneur, startServiceRequest);
// PUT :id/complete
router.put("/:id/complete", authenticateUser, requireEntrepreneur, completeServiceRequest);

module.exports = router;