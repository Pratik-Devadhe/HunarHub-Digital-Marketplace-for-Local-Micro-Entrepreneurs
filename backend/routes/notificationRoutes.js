const express = require("express");
const { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } = require("../controllers/notificationController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET /
router.get("/", authenticateUser, getNotifications);
// PUT :id/read
router.put("/:id/read", authenticateUser, markNotificationRead);
// PUT read-all
router.put("/read-all", authenticateUser, markAllNotificationsRead);
// DELETE :id
router.delete("/:id", authenticateUser, deleteNotification);

module.exports = router;