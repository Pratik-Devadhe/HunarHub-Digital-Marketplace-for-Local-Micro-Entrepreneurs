const { sendError } = require("../utils/http");

const getEntrepreneurPortfolio = async (req, res) => {
  try {
    res.json({ success: true, portfolio: [] });
  } catch (e) {
    sendError(res, e);
  }
};

const createPortfolioItem = async (req, res) => {
  try {
    const { title, description, image_url, price } = req.body;
    res.status(201).json({
      success: true,
      item: {
        id: Date.now(),
        title,
        description,
        image_url,
        price,
        created_at: new Date().toISOString()
      }
    });
  } catch (e) {
    sendError(res, e);
  }
};

const updatePortfolioItem = async (req, res) => {
  try {
    const { title, description, image_url, price } = req.body;
    res.json({
      success: true,
      item: {
        id: req.params.id,
        title,
        description,
        image_url,
        price
      }
    });
  } catch (e) {
    sendError(res, e);
  }
};

const deletePortfolioItem = async (req, res) => {
  try {
    res.json({ success: true, message: "Portfolio item deleted" });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = {
  getEntrepreneurPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem
};
