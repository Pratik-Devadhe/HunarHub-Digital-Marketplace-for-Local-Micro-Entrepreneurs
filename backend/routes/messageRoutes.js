const express = require("express");
const {
  getConversations,
  getMessages,
  sendMessage
} = require("../controllers/messageController");
const { authenticateUser } = require("../middleware/authMiddleware");
const router = express.Router();

// GET /messages/conversations
router.get("/conversations", authenticateUser, getConversations);

// GET /messages
router.get("/", authenticateUser, getMessages);

// POST /messages
router.post("/", authenticateUser, sendMessage);

module.exports = router;
