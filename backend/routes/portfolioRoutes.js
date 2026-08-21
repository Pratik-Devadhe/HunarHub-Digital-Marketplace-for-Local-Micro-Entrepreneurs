const express = require("express");
const {
  getEntrepreneurPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem
} = require("../controllers/portfolioController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const router = express.Router();

const allowArtisan = allowRoles("ENTREPRENEUR", "ADMIN");

// GET /portfolio/entrepreneur/:entrepreneur_id
router.get("/entrepreneur/:entrepreneur_id", getEntrepreneurPortfolio);

// POST /portfolio
router.post("/", authenticateUser, allowArtisan, createPortfolioItem);

// PUT /portfolio/:id
router.put("/:id", authenticateUser, allowArtisan, updatePortfolioItem);

// DELETE /portfolio/:id
router.delete("/:id", authenticateUser, allowArtisan, deletePortfolioItem);

module.exports = router;
