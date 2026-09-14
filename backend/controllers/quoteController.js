const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const createQuote = async (req, res) => {
  try {
    const {
      service_request_id,
      proposed_price,
      quote_amount,
      estimated_completion,
      estimated_days,
      message,
      notes,
      materials_included,
      additional_requirements
    } = req.body;

    const requestId = id(service_request_id, "service request id");
    const numPrice = Number(proposed_price || quote_amount);

    if (isNaN(numPrice) || numPrice <= 0) {
      throw httpError("Proposed price must be a positive number", 400);
    }

    const quote = await withTransaction(async (c) => {
      // Find entrepreneur profile
      const ep = await c.query(
        "SELECT id FROM entrepreneur_profiles WHERE user_id = $1",
        [req.user.id]
      );
      if (!ep.rowCount) throw httpError("Entrepreneur profile not found", 404);
      const entrepreneurId = ep.rows[0].id;

      // Verify service request exists and is eligible for quotes
      const sr = await c.query(
        "SELECT id, customer_id, status FROM service_requests WHERE id = $1",
        [requestId]
      );
      if (!sr.rowCount) throw httpError("Service request not found", 404);
      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(sr.rows[0].status)) {
        throw httpError(`Cannot submit quote for request in ${sr.rows[0].status} state`, 400);
      }

      // Upsert quote
      const result = await c.query(
        `INSERT INTO quotes (
           service_request_id, entrepreneur_id, proposed_price,
           estimated_completion, message, materials_included, additional_requirements, status
         )
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
        [
          requestId,
          entrepreneurId,
          numPrice,
          estimated_completion || (estimated_days ? `${estimated_days} days` : null),
          message || notes || null,
          materials_included || null,
          additional_requirements || null
        ]
      );

      // Update service request status to QUOTED if still PENDING or REQUESTED
      await c.query(
        `UPDATE service_requests
         SET status = 'QUOTED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('PENDING', 'REQUESTED')`,
        [requestId]
      );

      return result.rows[0];
    });

    res.status(201).json({
      success: true,
      message: "Quote submitted successfully",
      quote
    });
  } catch (e) {
    sendError(res, e);
  }
};

const getQuotesForRequest = async (req, res) => {
  try {
    const requestId = id(req.params.service_request_id, "service request id");

    const quotes = await withTransaction(async (c) => {
      // Check service request
      const sr = await c.query(
        "SELECT customer_id FROM service_requests WHERE id = $1",
        [requestId]
      );
      if (!sr.rowCount) throw httpError("Service request not found", 404);

      // Fetch quotes
      const result = await c.query(
        `SELECT q.*,
                ep.business_name, ep.average_rating, ep.total_reviews, ep.city,
                u.full_name as artisan_name, u.profile_image as artisan_image
         FROM quotes q
         JOIN entrepreneur_profiles ep ON ep.id = q.entrepreneur_id
         JOIN users u ON u.id = ep.user_id
         WHERE q.service_request_id = $1
         ORDER BY q.created_at DESC`,
        [requestId]
      );
      return result.rows;
    });

    res.json({ success: true, quotes });
  } catch (e) {
    sendError(res, e);
  }
};

const acceptQuote = async (req, res) => {
  try {
    const quoteId = id(req.params.id, "quote id");

    await withTransaction(async (c) => {
      // Find quote and related request
      const qRes = await c.query(
        `SELECT q.*, sr.customer_id
         FROM quotes q
         JOIN service_requests sr ON sr.id = q.service_request_id
         WHERE q.id = $1`,
        [quoteId]
      );
      if (!qRes.rowCount) throw httpError("Quote not found", 404);

      const quote = qRes.rows[0];
      if (req.user.role !== "ADMIN" && Number(quote.customer_id) !== Number(req.user.id)) {
        throw httpError("Only the customer who created this request can accept a quote", 403);
      }

      // Mark this quote accepted
      await c.query("UPDATE quotes SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [quoteId]);

      // Mark all other quotes for this request rejected
      await c.query(
        "UPDATE quotes SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE service_request_id = $1 AND id != $2",
        [quote.service_request_id, quoteId]
      );

      // Update service request
      await c.query(
        `UPDATE service_requests SET
           status = 'ACCEPTED',
           entrepreneur_id = $1,
           final_price = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [quote.entrepreneur_id, quote.proposed_price, quote.service_request_id]
      );
    });

    res.json({
      success: true,
      message: "Quote accepted successfully",
      quote: { id: quoteId, status: "ACCEPTED" }
    });
  } catch (e) {
    sendError(res, e);
  }
};

const rejectQuote = async (req, res) => {
  try {
    const quoteId = id(req.params.id, "quote id");

    await withTransaction(async (c) => {
      const qRes = await c.query(
        `SELECT q.*, sr.customer_id, ep.user_id as entrepreneur_user_id
         FROM quotes q
         JOIN service_requests sr ON sr.id = q.service_request_id
         JOIN entrepreneur_profiles ep ON ep.id = q.entrepreneur_id
         WHERE q.id = $1`,
        [quoteId]
      );
      if (!qRes.rowCount) throw httpError("Quote not found", 404);

      const quote = qRes.rows[0];
      if (
        req.user.role !== "ADMIN" &&
        Number(quote.customer_id) !== Number(req.user.id) &&
        Number(quote.entrepreneur_user_id) !== Number(req.user.id)
      ) {
        throw httpError("You do not have permission to reject this quote", 403);
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
