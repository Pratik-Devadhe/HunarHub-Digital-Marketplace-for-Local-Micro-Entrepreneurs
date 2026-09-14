const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getEntrepreneurPortfolio = async (req, res) => {
  try {
    const entrepreneurId = id(req.params.entrepreneur_id, "entrepreneur id");
    const rows = await withTransaction(async (c) => {
      const result = await c.query(
        `SELECT p.*, c.name as category_name
         FROM portfolio_items p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.entrepreneur_id = $1
         ORDER BY p.created_at DESC`,
        [entrepreneurId]
      );
      return result.rows;
    });

    res.json({ success: true, portfolio: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const createPortfolioItem = async (req, res) => {
  try {
    const { title, description, image_url, category_id, price } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      throw httpError("Title is required", 400);
    }

    const item = await withTransaction(async (c) => {
      // Find entrepreneur profile
      let entrepreneurId;
      if (req.user.role === "ADMIN" && req.body.entrepreneur_id) {
        entrepreneurId = id(req.body.entrepreneur_id, "entrepreneur id");
      } else {
        const ep = await c.query(
          "SELECT id FROM entrepreneur_profiles WHERE user_id = $1",
          [req.user.id]
        );
        if (!ep.rowCount) {
          throw httpError("Entrepreneur profile not found", 404);
        }
        entrepreneurId = ep.rows[0].id;
      }

      const numPrice = price !== undefined && price !== null && price !== "" ? Number(price) : null;
      const catId = category_id ? id(category_id, "category id") : null;

      const result = await c.query(
        `INSERT INTO portfolio_items (entrepreneur_id, title, description, image_url, category_id, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [entrepreneurId, title.trim(), description || null, image_url || null, catId, numPrice]
      );

      return result.rows[0];
    });

    res.status(201).json({
      success: true,
      message: "Portfolio item added successfully",
      item
    });
  } catch (e) {
    sendError(res, e);
  }
};

const updatePortfolioItem = async (req, res) => {
  try {
    const itemId = id(req.params.id, "portfolio item id");
    const { title, description, image_url, category_id, price } = req.body;

    const item = await withTransaction(async (c) => {
      // Check ownership
      const existing = await c.query(
        `SELECT p.*, ep.user_id
         FROM portfolio_items p
         JOIN entrepreneur_profiles ep ON ep.id = p.entrepreneur_id
         WHERE p.id = $1`,
        [itemId]
      );

      if (!existing.rowCount) throw httpError("Portfolio item not found", 404);
      if (req.user.role !== "ADMIN" && existing.rows[0].user_id !== req.user.id) {
        throw httpError("You do not have permission to update this item", 403);
      }

      const current = existing.rows[0];
      const newTitle = title !== undefined ? (title ? title.trim() : current.title) : current.title;
      const newDesc = description !== undefined ? description : current.description;
      const newImage = image_url !== undefined ? image_url : current.image_url;
      const newCategory = category_id !== undefined ? (category_id ? id(category_id, "category id") : null) : current.category_id;
      const newPrice = price !== undefined ? (price !== null && price !== "" ? Number(price) : null) : current.price;

      const result = await c.query(
        `UPDATE portfolio_items
         SET title = $1, description = $2, image_url = $3, category_id = $4, price = $5
         WHERE id = $6
         RETURNING *`,
        [newTitle, newDesc, newImage, newCategory, newPrice, itemId]
      );

      return result.rows[0];
    });

    res.json({
      success: true,
      message: "Portfolio item updated successfully",
      item
    });
  } catch (e) {
    sendError(res, e);
  }
};

const deletePortfolioItem = async (req, res) => {
  try {
    const itemId = id(req.params.id, "portfolio item id");

    await withTransaction(async (c) => {
      const existing = await c.query(
        `SELECT p.*, ep.user_id
         FROM portfolio_items p
         JOIN entrepreneur_profiles ep ON ep.id = p.entrepreneur_id
         WHERE p.id = $1`,
        [itemId]
      );

      if (!existing.rowCount) throw httpError("Portfolio item not found", 404);
      if (req.user.role !== "ADMIN" && existing.rows[0].user_id !== req.user.id) {
        throw httpError("You do not have permission to delete this item", 403);
      }

      await c.query("DELETE FROM portfolio_items WHERE id = $1", [itemId]);
    });

    res.json({ success: true, message: "Portfolio item deleted successfully" });
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
