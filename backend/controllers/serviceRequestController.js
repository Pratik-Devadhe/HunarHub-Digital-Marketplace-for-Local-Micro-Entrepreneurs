const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const createServiceRequest = async (req, res) => {
  try {
    const {
      entrepreneur_id,
      service_id,
      category_id,
      title,
      description,
      reference_image,
      budget_min,
      budget_max,
      requested_date,
      requested_time,
      address,
      city,
      customer_note
    } = req.body;

    const row = await withTransaction(async (c) => {
      let estPrice = null;
      let targetEntrepreneurId = entrepreneur_id ? id(entrepreneur_id) : null;
      let targetServiceId = service_id ? id(service_id) : null;
      let targetCategoryId = category_id ? id(category_id) : null;

      if (targetServiceId) {
        const svc = await c.query("SELECT * FROM services WHERE id = $1", [targetServiceId]);
        if (svc.rowCount) {
          estPrice = svc.rows[0].price;
          if (!targetEntrepreneurId) targetEntrepreneurId = svc.rows[0].entrepreneur_id;
          if (!targetCategoryId) targetCategoryId = svc.rows[0].category_id;
        }
      }

      if (!estPrice && budget_max) {
        estPrice = Number(budget_max);
      }

      const r = await c.query(
        `INSERT INTO service_requests
         (customer_id, entrepreneur_id, service_id, category_id, title, description, reference_image,
          budget_min, budget_max, estimated_price, requested_date, requested_time, address, city, customer_note, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          req.user.id,
          targetEntrepreneurId,
          targetServiceId,
          targetCategoryId,
          title || "Service Request",
          description || null,
          reference_image || null,
          budget_min ? Number(budget_min) : null,
          budget_max ? Number(budget_max) : null,
          estPrice,
          requested_date || null,
          requested_time || null,
          address || null,
          city || null,
          customer_note || null,
          targetEntrepreneurId ? 'PENDING' : 'REQUESTED'
        ]
      );

      // If targeted entrepreneur, send notification
      if (targetEntrepreneurId) {
        const epUser = await c.query("SELECT user_id FROM entrepreneur_profiles WHERE id = $1", [targetEntrepreneurId]);
        if (epUser.rowCount) {
          await c.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, 'New Service Request', $2, 'SERVICE_REQUEST')`,
            [epUser.rows[0].user_id, `You received a new service request: ${title || 'Service Request'}`]
          );
        }
      }

      return r.rows[0];
    });

    res.status(201).json({ success: true, request: row });
  } catch (e) {
    sendError(res, e);
  }
};

const getMyRequests = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT sr.*,
                c.name as category_name,
                s.title as service_title,
                ep.business_name,
                u.full_name as entrepreneur_name,
                (SELECT COUNT(*)::int FROM quotes q WHERE q.service_request_id = sr.id) as quote_count
         FROM service_requests sr
         LEFT JOIN categories c ON c.id = sr.category_id
         LEFT JOIN services s ON s.id = sr.service_id
         LEFT JOIN entrepreneur_profiles ep ON ep.id = sr.entrepreneur_id
         LEFT JOIN users u ON u.id = ep.user_id
         WHERE sr.customer_id = $1
         ORDER BY sr.created_at DESC`,
        [req.user.id]
      )).rows
    );

    res.json({ success: true, requests: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getReceivedRequests = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) => {
      // Find logged in artisan profile
      const ep = await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id = $1", [req.user.id]);
      if (!ep.rowCount) return [];
      const epId = ep.rows[0].id;

      const r = await c.query(
        `SELECT sr.*,
                c.name as category_name,
                s.title as service_title,
                u.full_name as customer_name,
                u.phone as customer_phone,
                u.email as customer_email,
                q.id as my_quote_id,
                q.proposed_price as my_proposed_price,
                q.status as my_quote_status
         FROM service_requests sr
         LEFT JOIN categories c ON c.id = sr.category_id
         LEFT JOIN services s ON s.id = sr.service_id
         JOIN users u ON u.id = sr.customer_id
         LEFT JOIN quotes q ON q.service_request_id = sr.id AND q.entrepreneur_id = $1
         WHERE sr.entrepreneur_id = $1 OR (sr.entrepreneur_id IS NULL AND sr.status IN ('REQUESTED', 'PENDING', 'QUOTED'))
         ORDER BY sr.created_at DESC`,
        [epId]
      );
      return r.rows;
    });

    res.json({ success: true, requests: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getRequestById = async (req, res) => {
  try {
    const reqId = id(req.params.id, "service request id");
    const row = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT sr.*,
                c.name as category_name,
                s.title as service_title,
                ep.business_name,
                ep.user_id as entrepreneur_user_id,
                cu.full_name as customer_name,
                cu.email as customer_email,
                cu.phone as customer_phone,
                eu.full_name as entrepreneur_name
         FROM service_requests sr
         LEFT JOIN categories c ON c.id = sr.category_id
         LEFT JOIN services s ON s.id = sr.service_id
         LEFT JOIN entrepreneur_profiles ep ON ep.id = sr.entrepreneur_id
         JOIN users cu ON cu.id = sr.customer_id
         LEFT JOIN users eu ON eu.id = ep.user_id
         WHERE sr.id = $1`,
        [reqId]
      );
      if (!r.rowCount) throw httpError("Request not found", 404);
      const x = r.rows[0];

      if (req.user.role !== "ADMIN" && x.customer_id !== req.user.id && x.entrepreneur_user_id !== req.user.id) {
        throw httpError("Access denied", 403);
      }
      return x;
    });

    res.json({ success: true, request: row });
  } catch (e) {
    sendError(res, e);
  }
};

const transition = async (req, res, nextStatus, allowedFrom, actor) => {
  try {
    const reqId = id(req.params.id, "service request id");
    const row = await withTransaction(async (c) => {
      let r;
      if (actor === "customer") {
        r = await c.query("SELECT * FROM service_requests WHERE id = $1 AND customer_id = $2 FOR UPDATE", [reqId, req.user.id]);
      } else {
        r = await c.query(
          `SELECT sr.* FROM service_requests sr
           JOIN entrepreneur_profiles ep ON ep.id = sr.entrepreneur_id
           WHERE sr.id = $1 AND ep.user_id = $2 FOR UPDATE`,
          [reqId, req.user.id]
        );
      }
      if (!r.rowCount) throw httpError("Request not found or access denied", 404);

      if (!allowedFrom.includes(r.rows[0].status)) {
        throw httpError(`Cannot change status from ${r.rows[0].status} to ${nextStatus}`, 409);
      }

      const updated = await c.query(
        "UPDATE service_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [nextStatus, r.rows[0].id]
      );

      const target = actor === "customer"
        ? (await c.query("SELECT ep.user_id FROM service_requests sr JOIN entrepreneur_profiles ep ON ep.id = sr.entrepreneur_id WHERE sr.id = $1", [r.rows[0].id])).rows[0]?.user_id
        : r.rows[0].customer_id;

      if (target) {
        await c.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)",
          [target, "Service Request Updated", `Request #${r.rows[0].id} is now ${nextStatus}`, "SERVICE_REQUEST"]
        );
      }

      return updated.rows[0];
    });

    res.json({ success: true, request: row });
  } catch (e) {
    sendError(res, e);
  }
};

const cancelServiceRequest = (req, res) => transition(req, res, "CANCELLED", ["REQUESTED", "PENDING", "QUOTED", "ACCEPTED", "CONFIRMED"], "customer");
const acceptServiceRequest = (req, res) => transition(req, res, "ACCEPTED", ["REQUESTED", "PENDING", "QUOTED"], "entrepreneur");
const rejectServiceRequest = (req, res) => transition(req, res, "REJECTED", ["REQUESTED", "PENDING", "QUOTED"], "entrepreneur");
const confirmServiceRequest = (req, res) => transition(req, res, "CONFIRMED", ["ACCEPTED"], "entrepreneur");
const startServiceRequest = (req, res) => transition(req, res, "IN_PROGRESS", ["ACCEPTED", "CONFIRMED"], "entrepreneur");
const completeServiceRequest = (req, res) => transition(req, res, "COMPLETED", ["IN_PROGRESS"], "entrepreneur");

module.exports = {
  createServiceRequest,
  getMyRequests,
  getReceivedRequests,
  getRequestById,
  cancelServiceRequest,
  acceptServiceRequest,
  rejectServiceRequest,
  confirmServiceRequest,
  startServiceRequest,
  completeServiceRequest
};
