const express = require("express");
const {
  createQuote,
  getQuotesForRequest,
  acceptQuote,
  rejectQuote
} = require("../controllers/quoteController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const router = express.Router();

const allowArtisan = allowRoles("ENTREPRENEUR", "ADMIN");
const allowCustomer = allowRoles("CUSTOMER", "ADMIN");

// POST /quotes (Artisan submits quote)
router.post("/", authenticateUser, allowArtisan, createQuote);

// GET /quotes/request/:service_request_id (View quotes for request)
router.get("/request/:service_request_id", authenticateUser, getQuotesForRequest);

// PUT /quotes/:id/accept (Customer accepts quote)
router.put("/:id/accept", authenticateUser, allowCustomer, acceptQuote);

// PUT /quotes/:id/reject (Customer rejects quote)
router.put("/:id/reject", authenticateUser, allowCustomer, rejectQuote);

module.exports = router;
