const express = require("express");
const { createServiceRequest, getMyRequests, getReceivedRequests, getRequestById, cancelServiceRequest, acceptServiceRequest, rejectServiceRequest, confirmServiceRequest, startServiceRequest, completeServiceRequest } = require("../controllers/serviceRequestController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const router = express.Router();

const allowAll = allowRoles("CUSTOMER", "ENTREPRENEUR", "ADMIN");
const allowArtisan = allowRoles("ENTREPRENEUR", "ADMIN");

/* Routes are mounted from app.js without /api. */
// POST /
router.post("/", authenticateUser, allowAll, createServiceRequest);
// GET my
router.get("/my", authenticateUser, allowAll, getMyRequests);
// GET received
router.get("/received", authenticateUser, allowArtisan, getReceivedRequests);
// GET :id
router.get("/:id", authenticateUser, getRequestById);
// PUT :id/cancel
router.put("/:id/cancel", authenticateUser, allowAll, cancelServiceRequest);
// PUT :id/accept
router.put("/:id/accept", authenticateUser, allowArtisan, acceptServiceRequest);
// PUT :id/reject
router.put("/:id/reject", authenticateUser, allowArtisan, rejectServiceRequest);
// PUT :id/confirm
router.put("/:id/confirm", authenticateUser, allowArtisan, confirmServiceRequest);
// PUT :id/start
router.put("/:id/start", authenticateUser, allowArtisan, startServiceRequest);
// PUT :id/complete
router.put("/:id/complete", authenticateUser, allowArtisan, completeServiceRequest);

module.exports = router;