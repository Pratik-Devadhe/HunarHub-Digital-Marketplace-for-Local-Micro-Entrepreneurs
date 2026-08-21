const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getDashboard = async (req, res) => {
  try {
    const data = await withTransaction(async (c) => {
      const q = async (sql) => (await c.query(sql)).rows[0];
      return {
        users: await q("SELECT COUNT(*)::int count FROM users"),
        entrepreneurs: await q("SELECT COUNT(*)::int count FROM entrepreneur_profiles"),
        approved_entrepreneurs: await q("SELECT COUNT(*)::int count FROM entrepreneur_profiles WHERE verification_status='APPROVED'"),
        products: await q("SELECT COUNT(*)::int count FROM products"),
        services: await q("SELECT COUNT(*)::int count FROM services"),
        orders: await q("SELECT COUNT(*)::int count FROM orders"),
        requests: await q("SELECT COUNT(*)::int count FROM service_requests"),
        complaints: await q("SELECT COUNT(*)::int count FROM complaints WHERE status IN ('OPEN','UNDER_REVIEW')")
      };
    });
    res.json({ success: true, dashboard: data });
  } catch (e) {
    sendError(res, e);
  }
};

const getEntrepreneurs = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT ep.*, u.full_name, u.email, u.phone FROM entrepreneur_profiles ep JOIN users u ON u.id = ep.user_id ORDER BY ep.created_at DESC`
      )).rows
    );
    res.json({ success: true, entrepreneurs: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getEntrepreneurById = async (req, res) => {
  try {
    const row = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT ep.*, u.full_name, u.email, u.phone FROM entrepreneur_profiles ep JOIN users u ON u.id = ep.user_id WHERE ep.id = $1`,
        [id(req.params.id, "entrepreneur id")]
      );
      if (!r.rowCount) throw httpError("Entrepreneur not found", 404);
      return r.rows[0];
    });
    res.json({ success: true, entrepreneur: row });
  } catch (e) {
    sendError(res, e);
  }
};

const setVerification = async (req, res, status) => {
  try {
    const row = await withTransaction(async (c) => {
      const r = await c.query(
        `UPDATE entrepreneur_profiles SET verification_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [status, id(req.params.id, "entrepreneur id")]
      );
      if (!r.rowCount) throw httpError("Entrepreneur not found", 404);
      await c.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)",
        [r.rows[0].user_id, `Verification ${status.toLowerCase()}`, `Your entrepreneur profile has been ${status.toLowerCase()}.`, "ADMIN"]
      );
      return r.rows[0];
    });
    res.json({ success: true, entrepreneur: row });
  } catch (e) {
    sendError(res, e);
  }
};

const approveEntrepreneur = (req, res) => setVerification(req, res, "APPROVED");
const rejectEntrepreneur = (req, res) => setVerification(req, res, "REJECTED");

const updateVerificationBadges = async (req, res) => {
  try {
    const epId = id(req.params.id, "entrepreneur id");
    const { verification_status = 'APPROVED' } = req.body;

    const row = await withTransaction(async (c) => {
      const r = await c.query(
        `UPDATE entrepreneur_profiles SET
           verification_status = COALESCE($1, verification_status),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [verification_status, epId]
      );
      if (!r.rowCount) throw httpError("Entrepreneur not found", 404);

      await c.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Verification Status Updated', 'Your verification status has been updated by admin.', 'ADMIN')`,
        [r.rows[0].user_id]
      );
      return r.rows[0];
    });

    res.json({ success: true, entrepreneur: row });
  } catch (e) {
    sendError(res, e);
  }
};

const getUsers = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT id, full_name, email, phone, role, profile_image, is_active, created_at FROM users ORDER BY created_at DESC`
      )).rows
    );
    res.json({ success: true, users: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const deactivateUser = async (req, res) => {
  try {
    const row = await withTransaction(async (c) => {
      const r = await c.query(
        "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, is_active",
        [id(req.params.id)]
      );
      if (!r.rowCount) throw httpError("User not found", 404);
      return r.rows[0];
    });
    res.json({ success: true, user: row });
  } catch (e) {
    sendError(res, e);
  }
};

const getOrders = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT o.*, u.full_name as customer_name, ep.business_name
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN entrepreneur_profiles ep ON ep.id = oi.entrepreneur_id
         GROUP BY o.id, u.full_name, ep.business_name
         ORDER BY o.created_at DESC`
      )).rows
    );
    res.json({ success: true, orders: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getServiceRequests = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT sr.*, cu.full_name as customer_name, ep.business_name, s.title as service_title
         FROM service_requests sr
         JOIN users cu ON cu.id = sr.customer_id
         LEFT JOIN entrepreneur_profiles ep ON ep.id = sr.entrepreneur_id
         LEFT JOIN services s ON s.id = sr.service_id
         ORDER BY sr.created_at DESC`
      )).rows
    );
    res.json({ success: true, requests: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getComplaints = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) => (await c.query("SELECT * FROM complaints ORDER BY created_at DESC")).rows);
    res.json({ success: true, complaints: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const resolveComplaint = async (req, res) => {
  try {
    const { status = "RESOLVED", admin_response } = req.body;
    if (!["RESOLVED", "REJECTED", "UNDER_REVIEW"].includes(status)) throw httpError("Invalid complaint status");
    const row = await withTransaction(async (c) => {
      const r = await c.query(
        `UPDATE complaints SET status = $1, admin_response = $2, resolved_at = CASE WHEN $1 IN ('RESOLVED','REJECTED') THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE id = $3 RETURNING *`,
        [status, admin_response || null, id(req.params.id, "complaint id")]
      );
      if (!r.rowCount) throw httpError("Complaint not found", 404);
      return r.rows[0];
    });
    res.json({ success: true, complaint: row });
  } catch (e) {
    sendError(res, e);
  }
};

const getAnalytics = async (req, res) => {
  try {
    const data = await withTransaction(async (c) => {
      const monthly = await c.query(
        `SELECT DATE_TRUNC('month', created_at) as month, COUNT(*)::int as orders, COALESCE(SUM(total_amount), 0)::numeric as sales
         FROM orders WHERE status = 'COMPLETED' GROUP BY 1 ORDER BY 1 DESC LIMIT 12`
      );
      const ratings = await c.query("SELECT ROUND(AVG(rating), 2) as average_rating, COUNT(*)::int as total_reviews FROM reviews");
      const earnings = await c.query(
        "SELECT COALESCE(AVG(total), 0)::numeric as avg_order_value FROM (SELECT customer_id, SUM(total_amount) as total FROM orders WHERE status = 'COMPLETED' GROUP BY customer_id) x"
      );
      return { monthly_sales: monthly.rows, ratings: ratings.rows[0], average_customer_order_value: earnings.rows[0].avg_order_value };
    });
    res.json({ success: true, analytics: data });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = {
  getDashboard,
  getEntrepreneurs,
  getEntrepreneurById,
  approveEntrepreneur,
  rejectEntrepreneur,
  updateVerificationBadges,
  getUsers,
  deactivateUser,
  getOrders,
  getServiceRequests,
  getComplaints,
  resolveComplaint,
  getAnalytics
};
