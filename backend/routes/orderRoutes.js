const express = require("express");
const { createOrder, getMyOrders, getReceivedOrders, getOrderById, cancelOrder, confirmOrder, processOrder, markOrderReady, completeOrder } = require("../controllers/orderController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// POST /
router.post("/", authenticateUser, requireCustomer, createOrder);
// GET my
router.get("/my", authenticateUser, requireCustomer, getMyOrders);
// GET received
router.get("/received", authenticateUser, requireEntrepreneur, getReceivedOrders);
// GET :id
router.get("/:id", authenticateUser, getOrderById);
// PUT :id/cancel
router.put("/:id/cancel", authenticateUser, requireCustomer, cancelOrder);
// PUT :id/confirm
router.put("/:id/confirm", authenticateUser, requireEntrepreneur, confirmOrder);
// PUT :id/process
router.put("/:id/process", authenticateUser, requireEntrepreneur, processOrder);
// PUT :id/ready
router.put("/:id/ready", authenticateUser, requireEntrepreneur, markOrderReady);
// PUT :id/complete
router.put("/:id/complete", authenticateUser, requireEntrepreneur, completeOrder);

module.exports = router;