const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await withTransaction(async (c) => {
      // Find all conversation partners with latest message and unread count
      const queryStr = `
        WITH partners AS (
          SELECT DISTINCT
            CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as partner_id
          FROM messages
          WHERE sender_id = $1 OR receiver_id = $1
        ),
        latest_messages AS (
          SELECT DISTINCT ON (partner_id)
            p.partner_id,
            m.id as message_id,
            m.message_text,
            m.created_at,
            m.sender_id,
            m.is_read
          FROM partners p
          JOIN messages m ON (
            (m.sender_id = $1 AND m.receiver_id = p.partner_id) OR
            (m.sender_id = p.partner_id AND m.receiver_id = $1)
          )
          ORDER BY p.partner_id, m.created_at DESC
        ),
        unread_counts AS (
          SELECT
            sender_id as partner_id,
            COUNT(*)::int as unread_count
          FROM messages
          WHERE receiver_id = $1 AND is_read = false
          GROUP BY sender_id
        )
        SELECT
          u.id as user_id,
          u.full_name,
          u.profile_image,
          u.role,
          lm.message_id,
          lm.message_text as last_message,
          lm.created_at as last_message_at,
          lm.sender_id as last_sender_id,
          COALESCE(uc.unread_count, 0) as unread_count
        FROM partners p
        JOIN users u ON u.id = p.partner_id
        JOIN latest_messages lm ON lm.partner_id = p.partner_id
        LEFT JOIN unread_counts uc ON uc.partner_id = p.partner_id
        ORDER BY lm.created_at DESC`;

      const result = await c.query(queryStr, [userId]);
      return result.rows;
    });

    res.json({ success: true, conversations });
  } catch (e) {
    sendError(res, e);
  }
};

const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.query.other_user_id || req.query.user_id || req.query.with_user_id;
    const serviceRequestId = req.query.service_request_id;
    const orderId = req.query.order_id;

    const messages = await withTransaction(async (c) => {
      let queryStr = "";
      let vals = [];

      if (otherUserId) {
        const partnerId = id(otherUserId, "other user id");
        // Mark unread messages from partner as read
        await c.query(
          "UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false",
          [partnerId, userId]
        );

        queryStr = `
          SELECT m.*,
                 u_from.full_name as sender_name, u_from.profile_image as sender_image,
                 u_to.full_name as receiver_name
          FROM messages m
          JOIN users u_from ON u_from.id = m.sender_id
          JOIN users u_to ON u_to.id = m.receiver_id
          WHERE (m.sender_id = $1 AND m.receiver_id = $2)
             OR (m.sender_id = $2 AND m.receiver_id = $1)
          ORDER BY m.created_at ASC`;
        vals = [userId, partnerId];
      } else if (serviceRequestId) {
        const srId = id(serviceRequestId, "service request id");
        queryStr = `
          SELECT m.*,
                 u_from.full_name as sender_name, u_from.profile_image as sender_image,
                 u_to.full_name as receiver_name
          FROM messages m
          JOIN users u_from ON u_from.id = m.sender_id
          JOIN users u_to ON u_to.id = m.receiver_id
          WHERE m.service_request_id = $1 AND (m.sender_id = $2 OR m.receiver_id = $2)
          ORDER BY m.created_at ASC`;
        vals = [srId, userId];
      } else if (orderId) {
        const oId = id(orderId, "order id");
        queryStr = `
          SELECT m.*,
                 u_from.full_name as sender_name, u_from.profile_image as sender_image,
                 u_to.full_name as receiver_name
          FROM messages m
          JOIN users u_from ON u_from.id = m.sender_id
          JOIN users u_to ON u_to.id = m.receiver_id
          WHERE m.order_id = $1 AND (m.sender_id = $2 OR m.receiver_id = $2)
          ORDER BY m.created_at ASC`;
        vals = [oId, userId];
      } else {
        // Return latest messages for current user
        queryStr = `
          SELECT m.*,
                 u_from.full_name as sender_name, u_from.profile_image as sender_image,
                 u_to.full_name as receiver_name
          FROM messages m
          JOIN users u_from ON u_from.id = m.sender_id
          JOIN users u_to ON u_to.id = m.receiver_id
          WHERE m.sender_id = $1 OR m.receiver_id = $1
          ORDER BY m.created_at DESC
          LIMIT 50`;
        vals = [userId];
      }

      const result = await c.query(queryStr, vals);
      return result.rows;
    });

    res.json({ success: true, messages });
  } catch (e) {
    sendError(res, e);
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverIdRaw = req.body.receiver_id || req.body.recipient_id;
    const messageTextRaw = req.body.message_text || req.body.content || req.body.message;
    const { service_request_id, order_id, image_url } = req.body;

    if (!receiverIdRaw) throw httpError("receiver_id is required", 400);
    const receiverId = id(receiverIdRaw, "receiver id");

    if (!messageTextRaw || typeof messageTextRaw !== "string" || !messageTextRaw.trim()) {
      throw httpError("message_text cannot be empty", 400);
    }

    const message = await withTransaction(async (c) => {
      if (Number(senderId) === Number(receiverId)) {
        throw httpError("Cannot send message to yourself", 400);
      }

      // Verify receiver exists
      const receiverRes = await c.query("SELECT id, role, is_active FROM users WHERE id = $1", [receiverId]);
      if (!receiverRes.rowCount) throw httpError("Recipient user not found", 404);
      const receiver = receiverRes.rows[0];

      const srId = service_request_id ? id(service_request_id, "service request id") : null;
      const ordId = order_id ? id(order_id, "order id") : null;

      // Authorize relationship if neither party is admin
      const senderRole = req.user.role;
      const receiverRole = receiver.role;

      if (senderRole !== "ADMIN" && receiverRole !== "ADMIN") {
        if (srId) {
          // Verify both users are related to this service request
          const srCheck = await c.query(
            `SELECT sr.id, sr.customer_id, ep.user_id as ep_user_id
             FROM service_requests sr
             LEFT JOIN entrepreneur_profiles ep ON ep.id = sr.entrepreneur_id
             WHERE sr.id = $1`,
            [srId]
          );
          if (!srCheck.rowCount) throw httpError("Service request not found", 404);
          const sr = srCheck.rows[0];

          // Check quotes as well for open quote participants
          const quotesCheck = await c.query(
            `SELECT ep.user_id
             FROM quotes q
             JOIN entrepreneur_profiles ep ON ep.id = q.entrepreneur_id
             WHERE q.service_request_id = $1`,
            [srId]
          );
          const quotedUserIds = quotesCheck.rows.map((r) => Number(r.user_id));
          const allowedUserIds = new Set(
            [
              Number(sr.customer_id),
              sr.ep_user_id ? Number(sr.ep_user_id) : null,
              ...quotedUserIds
            ].filter(Boolean)
          );

          if (!allowedUserIds.has(Number(senderId)) || !allowedUserIds.has(Number(receiverId))) {
            throw httpError("You are not authorized to message on this service request", 403);
          }
        } else if (ordId) {
          // Verify both users are related to this order
          const ordCheck = await c.query(
            `SELECT o.id, o.customer_id, ARRAY_AGG(DISTINCT ep.user_id) as ep_user_ids
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id
             WHERE o.id = $1
             GROUP BY o.id, o.customer_id`,
            [ordId]
          );
          if (!ordCheck.rowCount) throw httpError("Order not found", 404);
          const ord = ordCheck.rows[0];
          const allowedUserIds = new Set([
            Number(ord.customer_id),
            ...(ord.ep_user_ids || []).map(Number)
          ]);

          if (!allowedUserIds.has(Number(senderId)) || !allowedUserIds.has(Number(receiverId))) {
            throw httpError("You are not authorized to message on this order", 403);
          }
        } else {
          // Direct chat validation:
          // Customers can message entrepreneurs (marketplace artisan inquiry).
          // Entrepreneurs can message customers who have an existing thread or relationship.
          if (senderRole === "ENTREPRENEUR" && receiverRole === "CUSTOMER") {
            const hasPriorInteraction = await c.query(
              `SELECT 1 FROM messages
               WHERE (sender_id = $1 AND receiver_id = $2)
                  OR (sender_id = $2 AND receiver_id = $1)
               LIMIT 1`,
              [senderId, receiverId]
            );
            if (!hasPriorInteraction.rowCount) {
              const relCheck = await c.query(
                `SELECT 1 FROM orders o
                 JOIN order_items oi ON oi.order_id = o.id
                 JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id
                 WHERE o.customer_id = $2 AND ep.user_id = $1
                 UNION
                 SELECT 1 FROM service_requests sr
                 JOIN entrepreneur_profiles ep ON ep.id = sr.entrepreneur_id
                 WHERE sr.customer_id = $2 AND ep.user_id = $1
                 LIMIT 1`,
                [senderId, receiverId]
              );
              if (!relCheck.rowCount) {
                throw httpError(
                  "Entrepreneurs can only message customers who have initiated contact or have an active order/service request",
                  403
                );
              }
            }
          } else if (senderRole === "CUSTOMER" && receiverRole === "CUSTOMER") {
            throw httpError("Direct messaging between customers is not permitted", 403);
          }
        }
      }

      const result = await c.query(
        `INSERT INTO messages (sender_id, receiver_id, service_request_id, order_id, message_text, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [senderId, receiverId, srId, ordId, messageTextRaw.trim(), image_url || null]
      );

      return result.rows[0];
    });

    res.status(201).json({
      success: true,
      message
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
