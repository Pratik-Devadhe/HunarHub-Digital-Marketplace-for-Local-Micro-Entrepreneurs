const express = require("express");
const { getDashboard, getEntrepreneurs, getEntrepreneurById, approveEntrepreneur, rejectEntrepreneur, getUsers, deactivateUser, getOrders, getServiceRequests, getComplaints, resolveComplaint, getAnalytics } = require("../controllers/adminController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET dashboard
router.get("/dashboard", authenticateUser, requireAdmin, getDashboard);
// GET entrepreneurs
router.get("/entrepreneurs", authenticateUser, requireAdmin, getEntrepreneurs);
// GET entrepreneurs/:id
router.get("/entrepreneurs/:id", authenticateUser, requireAdmin, getEntrepreneurById);
// PUT entrepreneurs/:id/approve
router.put("/entrepreneurs/:id/approve", authenticateUser, requireAdmin, approveEntrepreneur);
// PUT entrepreneurs/:id/reject
router.put("/entrepreneurs/:id/reject", authenticateUser, requireAdmin, rejectEntrepreneur);
// GET users
router.get("/users", authenticateUser, requireAdmin, getUsers);
// PUT users/:id/deactivate
router.put("/users/:id/deactivate", authenticateUser, requireAdmin, deactivateUser);
// GET orders
router.get("/orders", authenticateUser, requireAdmin, getOrders);
// GET service-requests
router.get("/service-requests", authenticateUser, requireAdmin, getServiceRequests);
// GET complaints
router.get("/complaints", authenticateUser, requireAdmin, getComplaints);
// PUT complaints/:id/resolve
router.put("/complaints/:id/resolve", authenticateUser, requireAdmin, resolveComplaint);
// GET analytics
router.get("/analytics", authenticateUser, requireAdmin, getAnalytics);

module.exports = router;