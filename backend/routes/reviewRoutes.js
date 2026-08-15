const express = require("express");
const { getReviews, createReview, getReviewById, updateReview, deleteReview } = require("../controllers/reviewController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET entrepreneur/:entrepreneurId
router.get("/entrepreneur/:entrepreneurId", getReviews);
// GET product/:productId
router.get("/product/:productId", getReviews);
// POST /
router.post("/", authenticateUser, createReview);
// GET :id
router.get("/:id", authenticateUser, getReviewById);
// PUT :id
router.put("/:id", authenticateUser, updateReview);
// DELETE :id
router.delete("/:id", authenticateUser, deleteReview);

module.exports = router;