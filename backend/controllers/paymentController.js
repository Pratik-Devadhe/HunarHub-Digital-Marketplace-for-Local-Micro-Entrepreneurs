const crypto = require("crypto");
let Razorpay;
try { Razorpay = require("razorpay"); } catch (_) {}
const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const isRazorpayConfigured = () => {
  return Boolean(
    Razorpay &&
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes("dummy") &&
    !process.env.RAZORPAY_KEY_SECRET.includes("dummy")
  );
};

const getRazorpayInstance = () => {
  if (!isRazorpayConfigured()) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

const createPaymentOrder = async (req, res) => {
  try {
    const { order_id, service_request_id } = req.body;
    if ((!order_id && !service_request_id) || (order_id && service_request_id)) {
      throw httpError("Provide exactly one order_id or service_request_id", 400);
    }

    const data = await withTransaction(async (c) => {
      let amount, customerId;
      if (order_id) {
        const r = await c.query("SELECT id, total_amount, customer_id, payment_status, status FROM orders WHERE id = $1 FOR UPDATE", [id(order_id, "order id")]);
        if (!r.rowCount) throw httpError("Order not found", 404);
        if (req.user.role !== "ADMIN" && r.rows[0].customer_id !== req.user.id) throw httpError("Access denied", 403);
        if (r.rows[0].payment_status === "PAID") throw httpError("Order already paid", 409);
        amount = Number(r.rows[0].total_amount);
        customerId = r.rows[0].customer_id;
      } else {
        const r = await c.query("SELECT id, estimated_price, final_price, customer_id, status FROM service_requests WHERE id = $1 FOR UPDATE", [id(service_request_id, "service request id")]);
        if (!r.rowCount) throw httpError("Service request not found", 404);
        if (req.user.role !== "ADMIN" && r.rows[0].customer_id !== req.user.id) throw httpError("Access denied", 403);
        if (!["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(r.rows[0].status)) throw httpError("Service request is not payable yet", 409);
        amount = Number(r.rows[0].final_price ?? r.rows[0].estimated_price ?? 0);
        customerId = r.rows[0].customer_id;
      }

      if (amount <= 0) throw httpError("Invalid payment amount", 400);

      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        // Return clear flag indicating online payment is unavailable in demo environment
        return {
          is_configured: false,
          amount,
          customer_id: customerId,
          message: "Online payment is currently unavailable. You can still continue with your booking."
        };
      }

      const rpOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `hh_${Date.now()}_${customerId}`
      });

      return {
        is_configured: true,
        key_id: process.env.RAZORPAY_KEY_ID,
        razorpay_order: rpOrder,
        amount,
        customer_id: customerId
      };
    });

    res.status(201).json({ success: true, ...data });
  } catch (e) {
    sendError(res, e);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id, service_request_id } = req.body;

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      // Payment gateway unavailable: handle gracefully without claiming paid or generating fake IDs
      const paymentResult = await withTransaction(async (c) => {
        if (order_id) {
          await c.query("UPDATE orders SET payment_status = 'NOT_AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id(order_id)]);
        }
        return {
          payment_status: "NOT_AVAILABLE",
          message: "Online payment is currently unavailable. Booking/order remains valid."
        };
      });
      return res.json({ success: true, ...paymentResult });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw httpError("Payment verification fields (order ID, payment ID, signature) are required", 400);
    }

    // Verify HMAC SHA256 signature strictly
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

    if (expected !== razorpay_signature) {
      throw httpError("Invalid payment signature", 400);
    }

    const payment = await withTransaction(async (c) => {
      let amount, customerId;
      if (order_id) {
        const r = await c.query("SELECT id, total_amount, customer_id FROM orders WHERE id = $1 FOR UPDATE", [id(order_id, "order id")]);
        if (!r.rowCount) throw httpError("Order not found", 404);
        if (req.user.role !== "ADMIN" && r.rows[0].customer_id !== req.user.id) throw httpError("Access denied", 403);
        amount = Number(r.rows[0].total_amount);
        customerId = r.rows[0].customer_id;
      } else {
        const r = await c.query("SELECT id, estimated_price, final_price, customer_id FROM service_requests WHERE id = $1 FOR UPDATE", [id(service_request_id, "service request id")]);
        if (!r.rowCount) throw httpError("Service request not found", 404);
        if (req.user.role !== "ADMIN" && r.rows[0].customer_id !== req.user.id) throw httpError("Access denied", 403);
        amount = Number(r.rows[0].final_price ?? r.rows[0].estimated_price ?? 0);
        customerId = r.rows[0].customer_id;
      }

      const r = await c.query(
        `INSERT INTO payments (order_id, service_request_id, customer_id, amount, payment_method, transaction_id, status, paid_at)
         VALUES ($1, $2, $3, $4, 'RAZORPAY', $5, 'SUCCESS', CURRENT_TIMESTAMP) RETURNING *`,
        [order_id || null, service_request_id || null, customerId, amount, razorpay_payment_id]
      );

      if (order_id) {
        await c.query("UPDATE orders SET payment_status = 'PAID', status = CASE WHEN status = 'PENDING' THEN 'CONFIRMED' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [order_id]);
      }

      return r.rows[0];
    });

    res.json({ success: true, message: "Payment verified successfully", payment });
  } catch (e) {
    sendError(res, e);
  }
};

const getPaymentById = async (req, res) => {
  try {
    const row = await withTransaction(async (c) => {
      const r = await c.query("SELECT * FROM payments WHERE id = $1", [id(req.params.id, "payment id")]);
      if (!r.rowCount) throw httpError("Payment not found", 404);
      if (req.user.role !== "ADMIN" && r.rows[0].customer_id !== req.user.id) throw httpError("Access denied", 403);
      return r.rows[0];
    });
    res.json({ success: true, payment: row });
  } catch (e) {
    sendError(res, e);
  }
};

const handlePaymentWebhook = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Webhook endpoint ready" });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = { createPaymentOrder, verifyPayment, getPaymentById, handlePaymentWebhook };

