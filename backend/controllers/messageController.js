const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT DISTINCT ON (partner_id)
           partner_id,
           u.full_name as partner_name,
           u.profile_image as partner_image,
           u.role as partner_role,
           m.message_text as last_message,
           m.created_at as last_message_time,
           m.service_request_id,
           m.order_id
         FROM (
           SELECT 
             CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as partner_id,
             message_text,
             created_at,
             service_request_id,
             order_id,
             id
           FROM messages
           WHERE sender_id = $1 OR receiver_id = $1
         ) m
         JOIN users u ON u.id = m.partner_id
         ORDER BY partner_id, m.created_at DESC`,
        [userId]
      );
      return r.rows;
    });

    res.json({ success: true, conversations });
  } catch (e) {
    sendError(res, e);
  }
};

const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { with_user_id, service_request_id, order_id } = req.query;

    const messages = await withTransaction(async (c) => {
      let query = `
        SELECT m.*, u_sender.full_name as sender_name, u_sender.profile_image as sender_image
        FROM messages m
        JOIN users u_sender ON u_sender.id = m.sender_id
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
      `;
      const params = [userId];
      let pIdx = 2;

      if (with_user_id) {
        query += ` AND (m.sender_id = $${pIdx} OR m.receiver_id = $${pIdx})`;
        params.push(id(with_user_id));
        pIdx++;
      }
      if (service_request_id) {
        query += ` AND m.service_request_id = $${pIdx}`;
        params.push(id(service_request_id));
        pIdx++;
      }
      if (order_id) {
        query += ` AND m.order_id = $${pIdx}`;
        params.push(id(order_id));
        pIdx++;
      }

      query += ` ORDER BY m.created_at ASC`;
      const r = await c.query(query, params);

      // Mark received messages as read
      if (with_user_id) {
        await c.query(
          "UPDATE messages SET is_read = TRUE WHERE receiver_id = $1 AND sender_id = $2",
          [userId, id(with_user_id)]
        );
      }

      return r.rows;
    });

    res.json({ success: true, messages });
  } catch (e) {
    sendError(res, e);
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, service_request_id, order_id, message_text, image_url } = req.body;

    if (!receiver_id) throw httpError("Receiver ID is required", 400);
    if (!message_text || !message_text.trim()) throw httpError("Message text is required", 400);

    const message = await withTransaction(async (c) => {
      // Verify receiver exists
      const rec = await c.query("SELECT id FROM users WHERE id = $1", [id(receiver_id)]);
      if (!rec.rowCount) throw httpError("Receiver user not found", 404);

      const r = await c.query(
        `INSERT INTO messages (sender_id, receiver_id, service_request_id, order_id, message_text, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          senderId,
          id(receiver_id),
          service_request_id ? id(service_request_id) : null,
          order_id ? id(order_id) : null,
          message_text.trim(),
          image_url || null
        ]
      );

      // Create in-app notification
      await c.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'New Message', $2, 'CHAT')`,
        [id(receiver_id), `${req.user.full_name}: ${message_text.trim().substring(0, 50)}`]
      );

      return r.rows[0];
    });

    res.status(201).json({ success: true, message });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage
};
