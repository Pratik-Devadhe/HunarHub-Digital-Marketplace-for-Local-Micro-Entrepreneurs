const { sendError } = require("../utils/http");

const createQuote = async (req, res) => {
  try {
    const { service_request_id, proposed_price, message } = req.body;
    res.status(201).json({
      success: true,
      quote: {
        id: Date.now(),
        service_request_id,
        proposed_price,
        message,
        status: "PENDING",
        created_at: new Date().toISOString()
      }
    });
  } catch (e) {
    sendError(res, e);
  }
};

const getQuotesForRequest = async (req, res) => {
  try {
    res.json({ success: true, quotes: [] });
  } catch (e) {
    sendError(res, e);
  }
};

const acceptQuote = async (req, res) => {
  try {
    res.json({ success: true, message: "Quote accepted successfully" });
  } catch (e) {
    sendError(res, e);
  }
};

const rejectQuote = async (req, res) => {
  try {
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
