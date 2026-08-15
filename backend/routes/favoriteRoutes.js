const express = require("express");
const { getFavorites, addFavorite, removeFavorite } = require("../controllers/favoriteController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET /
router.get("/", authenticateUser, getFavorites);
// POST /
router.post("/", authenticateUser, addFavorite);
// DELETE :id
router.delete("/:id", authenticateUser, removeFavorite);

module.exports = router;