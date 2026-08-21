const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const createQuote = async (req, res) => {
  try {
    const { service_request_id, proposed_price, estimated_completion, message, materials_included, additional_requirements } = req.body;
    const reqId = id(service_request_id, "service request id");
    const price = Number(proposed_price);

    if (!price || price <= 0) throw httpError("Valid proposed price is required", 400);

    const quote = await withTransaction(async (c) => {
      // Find artisan profile
      const ep = await c.query("SELECT id, business_name FROM entrepreneur_profiles WHERE user_id = $1", [req.user.id]);
      if (!ep.rowCount) throw httpError("Entrepreneur profile not found", 404);
      const epId = ep.rows[0].id;

      // Verify request exists
      const sr = await c.query("SELECT * FROM service_requests WHERE id = $1", [reqId]);
      if (!sr.rowCount) throw httpError("Service request not found", 404);

      // Upsert quote
      const r = await c.query(
        `INSERT INTO quotes (service_request_id, entrepreneur_id, proposed_price, estimated_completion, message, materials_included, additional_requirements, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
         ON CONFLICT (service_request_id, entrepreneur_id)
         DO UPDATE SET
           proposed_price = EXCLUDED.proposed_price,
           estimated_completion = EXCLUDED.estimated_completion,
           message = EXCLUDED.message,
           materials_included = EXCLUDED.materials_included,
           additional_requirements = EXCLUDED.additional_requirements,
           status = 'PENDING',
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [reqId, epId, price, estimated_completion || null, message || null, materials_included || null, additional_requirements || null]
      );

      // Update service request status to QUOTED if still REQUESTED/PENDING
      if (['REQUESTED', 'PENDING'].includes(sr.rows[0].status)) {
        await c.query("UPDATE service_requests SET status = 'QUOTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [reqId]);
      }

      // Create notification for customer
      await c.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'New Quote Received', $2, 'QUOTE')`,
        [sr.rows[0].customer_id, `You received a quote of ₹${price} from ${ep.rows[0].business_name}.`]
      );

      return r.rows[0];
    });

    res.status(201).json({ success: true, quote });
  } catch (e) {
    sendError(res, e);
  }
};

const getQuotesForRequest = async (req, res) => {
  try {
    const reqId = id(req.params.service_request_id, "service request id");
    const quotes = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT q.*, 
                ep.business_name, ep.experience_years, ep.city, ep.average_rating, ep.total_reviews, ep.verification_status,
                ep.is_identity_verified, ep.is_phone_verified, ep.is_artisan_verified, ep.is_business_verified,
                u.full_name as artisan_name, u.profile_image as artisan_image
         FROM quotes q
         JOIN entrepreneur_profiles ep ON ep.id = q.entrepreneur_id
         JOIN users u ON u.id = ep.user_id
         WHERE q.service_request_id = $1
         ORDER BY q.created_at DESC`,
        [reqId]
      );
      return r.rows;
    });

    res.json({ success: true, quotes });
  } catch (e) {
    sendError(res, e);
  }
};

const acceptQuote = async (req, res) => {
  try {
    const quoteId = id(req.params.id, "quote id");

    const result = await withTransaction(async (c) => {
      const qRes = await c.query(
        `SELECT q.*, sr.customer_id, ep.user_id as artisan_user_id
         FROM quotes q
         JOIN service_requests sr ON sr.id = q.service_request_id
         JOIN entrepreneur_profiles ep ON ep.id = q.entrepreneur_id
         WHERE q.id = $1`,
        [quoteId]
      );
      if (!qRes.rowCount) throw httpError("Quote not found", 404);
      const q = qRes.rows[0];

      // Ensure customer owns request
      if (q.customer_id !== req.user.id && req.user.role !== 'ADMIN') {
        throw httpError("Unauthorized to accept this quote", 403);
      }

      // Mark this quote as ACCEPTED, others as REJECTED
      await c.query("UPDATE quotes SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [quoteId]);
      await c.query("UPDATE quotes SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE service_request_id = $1 AND id != $2", [q.service_request_id, quoteId]);

      // Update Service Request status to ACCEPTED and bind entrepreneur & final_price
      await c.query(
        `UPDATE service_requests
         SET status = 'ACCEPTED', entrepreneur_id = $1, final_price = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [q.entrepreneur_id, q.proposed_price, q.service_request_id]
      );

      // Notify Artisan
      await c.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Quote Accepted', 'Your quote has been accepted by the customer! Please check your Service Requests.', 'QUOTE_ACCEPTED')`,
        [q.artisan_user_id]
      );

      return { service_request_id: q.service_request_id, quote_id: quoteId };
    });

    res.json({ success: true, message: "Quote accepted successfully", result });
  } catch (e) {
    sendError(res, e);
  }
};

const rejectQuote = async (req, res) => {
  try {
    const quoteId = id(req.params.id, "quote id");

    await withTransaction(async (c) => {
      const qRes = await c.query(
        `SELECT q.*, sr.customer_id
         FROM quotes q
         JOIN service_requests sr ON sr.id = q.service_request_id
         WHERE q.id = $1`,
        [quoteId]
      );
      if (!qRes.rowCount) throw httpError("Quote not found", 404);
      const q = qRes.rows[0];

      if (q.customer_id !== req.user.id && req.user.role !== 'ADMIN') {
        throw httpError("Unauthorized to reject this quote", 403);
      }

      await c.query("UPDATE quotes SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [quoteId]);
    });

    res.json({ success: true, message: "Quote rejected" });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = {
  createQuote,
  getQuotesForRequest,
  acceptQuote,
  rejectQuote
};
