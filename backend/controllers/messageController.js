const { sendError } = require("../utils/http");

const getConversations = async (req, res) => {
  try {
    res.json({ success: true, conversations: [] });
  } catch (e) {
    sendError(res, e);
  }
};

const getMessages = async (req, res) => {
  try {
    res.json({ success: true, messages: [] });
  } catch (e) {
    sendError(res, e);
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, service_request_id, order_id, message_text, image_url } = req.body;

    res.status(201).json({
      success: true,
      message: {
        id: Date.now(),
        sender_id: senderId,
        receiver_id: Number(receiver_id),
        service_request_id: service_request_id ? Number(service_request_id) : null,
        order_id: order_id ? Number(order_id) : null,
        message_text,
        image_url: image_url || null,
        created_at: new Date().toISOString()
      }
    });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage
};
