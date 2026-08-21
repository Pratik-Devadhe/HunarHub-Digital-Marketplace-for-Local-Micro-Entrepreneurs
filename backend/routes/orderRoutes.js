const express = require("express");
const { createOrder, getMyOrders, getReceivedOrders, getOrderById, cancelOrder, confirmOrder, processOrder, markOrderReady, completeOrder } = require("../controllers/orderController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const router = express.Router();

const allowAll = allowRoles("CUSTOMER", "ENTREPRENEUR", "ADMIN");
const allowArtisan = allowRoles("ENTREPRENEUR", "ADMIN");

/* Routes are mounted from app.js without /api. */
// POST /
router.post("/", authenticateUser, allowAll, createOrder);
// GET my
router.get("/my", authenticateUser, allowAll, getMyOrders);
// GET received
router.get("/received", authenticateUser, allowArtisan, getReceivedOrders);
// GET :id
router.get("/:id", authenticateUser, getOrderById);
// PUT :id/cancel
router.put("/:id/cancel", authenticateUser, allowAll, cancelOrder);
// PUT :id/confirm
router.put("/:id/confirm", authenticateUser, allowArtisan, confirmOrder);
// PUT :id/process
router.put("/:id/process", authenticateUser, allowArtisan, processOrder);
// PUT :id/ready
router.put("/:id/ready", authenticateUser, allowArtisan, markOrderReady);
// PUT :id/complete
router.put("/:id/complete", authenticateUser, allowArtisan, completeOrder);

module.exports = router;