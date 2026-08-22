const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const createOrder = async (req, res) => {
  try {
    const { items, shipping_address } = req.body;
    if (!Array.isArray(items) || !items.length) throw httpError("items array is required");

    const row = await withTransaction(async (c) => {
      const ids = items.map(x => id(x.product_id, "product id"));
      const unique = [...new Set(ids)];
      const products = await c.query(
        `SELECT p.*, ep.user_id as entrepreneur_user_id FROM products p
         JOIN entrepreneur_profiles ep ON ep.id = p.entrepreneur_id
         WHERE p.id = ANY($1::bigint[]) AND p.is_available = true FOR UPDATE`,
        [unique]
      );
      if (products.rowCount !== unique.length) throw httpError("One or more products are unavailable", 409);

      const map = new Map(products.rows.map(p => [Number(p.id), p]));
      let total = 0;
      const prepared = items.map(x => {
        const p = map.get(Number(x.product_id));
        const q = Number(x.quantity);
        if (!Number.isInteger(q) || q <= 0) throw httpError("Invalid quantity");
        if (p.stock_quantity < q) throw httpError(`Insufficient stock for ${p.name}`, 409);
        const subtotal = Number(p.price) * q;
        total += subtotal;
        return { p, q, subtotal };
      });

      const isConfigured = Boolean(
        process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        !process.env.RAZORPAY_KEY_ID.includes("dummy") &&
        !process.env.RAZORPAY_KEY_SECRET.includes("dummy")
      );
      const initialPaymentStatus = isConfigured ? "PENDING" : "NOT_AVAILABLE";

      const order = (await c.query(
        `INSERT INTO orders (customer_id, total_amount, status, payment_status, shipping_address)
         VALUES ($1, $2, 'PENDING', $3, $4) RETURNING *`,
        [req.user.id, total, initialPaymentStatus, shipping_address || null]
      )).rows[0];

      for (const x of prepared) {
        await c.query(
          `INSERT INTO order_items (order_id, product_id, entrepreneur_id, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, x.p.id, x.p.entrepreneur_id, x.q, x.p.price, x.subtotal]
        );
        await c.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [x.q, x.p.id]
        );

        await c.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)",
          [x.p.entrepreneur_user_id, "New order", `Order #${order.id} has been placed`, "ORDER"]
        );
      }

      return order;
    });

    res.status(201).json({ success: true, order: row });
  } catch (e) {
    sendError(res, e);
  }
};

const getMyOrders = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT o.*,
                COALESCE(json_agg(json_build_object(
                  'id', oi.id, 'product_id', oi.product_id, 'entrepreneur_id', oi.entrepreneur_id,
                  'quantity', oi.quantity, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal,
                  'product_name', p.name, 'business_name', ep.business_name
                ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') items
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id
         WHERE o.customer_id = $1
         GROUP BY o.id ORDER BY o.created_at DESC`,
        [req.user.id]
      )).rows
    );
    res.json({ success: true, orders: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getReceivedOrders = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT o.*, u.full_name as customer_name,
                COALESCE(json_agg(json_build_object(
                  'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
                  'unit_price', oi.unit_price, 'subtotal', oi.subtotal, 'product_name', p.name
                ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id
         WHERE ep.user_id = $1
         GROUP BY o.id, u.full_name ORDER BY o.created_at DESC`,
        [req.user.id]
      )).rows
    );
    res.json({ success: true, orders: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getOrderById = async (req, res) => {
  try {
    const row = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT o.*, u.full_name as customer_name,
                COALESCE(json_agg(json_build_object(
                  'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
                  'unit_price', oi.unit_price, 'subtotal', oi.subtotal, 'product_name', p.name,
                  'business_name', ep.business_name
                )) FILTER (WHERE oi.id IS NOT NULL), '[]') items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN products p ON p.id = oi.product_id
         LEFT JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id
         WHERE o.id = $1
         GROUP BY o.id, u.full_name`,
        [id(req.params.id)]
      );
      if (!r.rowCount) throw httpError("Order not found", 404);
      const x = r.rows[0];

      const isOwner = req.user.id === x.customer_id;
      const isEntrepreneur = await c.query(
        "SELECT 1 FROM order_items oi JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id WHERE oi.order_id = $1 AND ep.user_id = $2",
        [x.id, req.user.id]
      );
      if (req.user.role !== "ADMIN" && !isOwner && !isEntrepreneur.rowCount) throw httpError("Access denied", 403);
      return x;
    });
    res.json({ success: true, order: row });
  } catch (e) {
    sendError(res, e);
  }
};

const transitionOrder = async (req, res, nextStatus, allowed, actor) => {
  try {
    const row = await withTransaction(async (c) => {
      const orderId = id(req.params.id, "order id");
      let r;
      if (actor === "customer") {
        r = await c.query("SELECT * FROM orders WHERE id = $1 AND customer_id = $2 FOR UPDATE", [orderId, req.user.id]);
      } else {
        r = await c.query(
          `SELECT o.* FROM orders o
           JOIN order_items oi ON oi.order_id = o.id
           JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id
           WHERE o.id = $1 AND ep.user_id = $2 FOR UPDATE`,
          [orderId, req.user.id]
        );
      }
      if (!r.rowCount) throw httpError("Order not found or access denied", 404);
      const o = r.rows[0];
      if (!allowed.includes(o.status)) throw httpError(`Cannot change order from ${o.status}`, 409);

      if (nextStatus === "CANCELLED") {
        const items = await c.query("SELECT product_id, quantity FROM order_items WHERE order_id = $1 FOR UPDATE", [orderId]);
        for (const item of items.rows) {
          await c.query(
            "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [item.quantity, item.product_id]
          );
        }
      }
      const updated = (await c.query("UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [nextStatus, orderId])).rows[0];

      let targetUserId = o.customer_id;
      if (actor === "customer") {
        const epUser = await c.query(
          "SELECT ep.user_id FROM order_items oi JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id WHERE oi.order_id = $1 LIMIT 1",
          [orderId]
        );
        if (epUser.rowCount) targetUserId = epUser.rows[0].user_id;
      }

      await c.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)",
        [targetUserId, "Order updated", `Order #${orderId} is now ${nextStatus}`, "ORDER"]
      );
      return updated;
    });
    res.json({ success: true, order: row });
  } catch (e) {
    sendError(res, e);
  }
};

const cancelOrder = (req, res) => transitionOrder(req, res, "CANCELLED", ["PENDING", "CONFIRMED"], "customer");
const confirmOrder = (req, res) => transitionOrder(req, res, "CONFIRMED", ["PENDING"], "entrepreneur");
const processOrder = (req, res) => transitionOrder(req, res, "PROCESSING", ["CONFIRMED"], "entrepreneur");
const markOrderReady = (req, res) => transitionOrder(req, res, "READY", ["PROCESSING"], "entrepreneur");
const completeOrder = (req, res) => transitionOrder(req, res, "COMPLETED", ["READY"], "entrepreneur");

module.exports = {
  createOrder,
  getMyOrders,
  getReceivedOrders,
  getOrderById,
  cancelOrder,
  confirmOrder,
  processOrder,
  markOrderReady,
  completeOrder
};
