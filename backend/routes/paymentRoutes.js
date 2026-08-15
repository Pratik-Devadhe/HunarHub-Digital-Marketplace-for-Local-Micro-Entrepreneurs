const express = require("express");
const { createPaymentOrder, verifyPayment, getPaymentById, handlePaymentWebhook } = require("../controllers/paymentController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// POST create-order
router.post("/create-order", authenticateUser, createPaymentOrder);
// PUT verify
router.put("/verify", authenticateUser, verifyPayment);
// GET :id
router.get("/:id", authenticateUser, getPaymentById);
// POST webhook
router.post("/webhook", handlePaymentWebhook);

module.exports = router;