const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getEntrepreneurPortfolio = async (req, res) => {
  try {
    const entrepreneurId = id(req.params.entrepreneur_id, "entrepreneur id");
    const rows = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT pi.*, c.name as category_name
         FROM portfolio_items pi
         LEFT JOIN categories c ON c.id = pi.category_id
         WHERE pi.entrepreneur_id = $1
         ORDER BY pi.created_at DESC`,
        [entrepreneurId]
      );
      return r.rows;
    });
    res.json({ success: true, portfolio: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const createPortfolioItem = async (req, res) => {
  try {
    const { title, description, image_url, category_id, price } = req.body;
    if (!title || !title.trim()) throw httpError("Title is required", 400);

    const item = await withTransaction(async (c) => {
      const ep = await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id = $1", [req.user.id]);
      if (!ep.rowCount) throw httpError("Entrepreneur profile not found", 404);
      const epId = ep.rows[0].id;

      const r = await c.query(
        `INSERT INTO portfolio_items (entrepreneur_id, title, description, image_url, category_id, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [epId, title.trim(), description || null, image_url || null, category_id ? id(category_id) : null, price ? Number(price) : null]
      );
      return r.rows[0];
    });

    res.status(201).json({ success: true, item });
  } catch (e) {
    sendError(res, e);
  }
};

const updatePortfolioItem = async (req, res) => {
  try {
    const itemId = id(req.params.id, "portfolio item id");
    const { title, description, image_url, category_id, price } = req.body;

    const updated = await withTransaction(async (c) => {
      const ep = await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id = $1", [req.user.id]);
      if (!ep.rowCount) throw httpError("Entrepreneur profile not found", 404);
      const epId = ep.rows[0].id;

      const itemRes = await c.query("SELECT * FROM portfolio_items WHERE id = $1 AND entrepreneur_id = $2", [itemId, epId]);
      if (!itemRes.rowCount) throw httpError("Portfolio item not found or unauthorized", 404);

      const r = await c.query(
        `UPDATE portfolio_items SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           image_url = COALESCE($3, image_url),
           category_id = COALESCE($4, category_id),
           price = COALESCE($5, price)
         WHERE id = $6 RETURNING *`,
        [title || null, description || null, image_url || null, category_id ? id(category_id) : null, price ? Number(price) : null, itemId]
      );
      return r.rows[0];
    });

    res.json({ success: true, item: updated });
  } catch (e) {
    sendError(res, e);
  }
};

const deletePortfolioItem = async (req, res) => {
  try {
    const itemId = id(req.params.id, "portfolio item id");

    await withTransaction(async (c) => {
      const ep = await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id = $1", [req.user.id]);
      if (!ep.rowCount) throw httpError("Entrepreneur profile not found", 404);
      const epId = ep.rows[0].id;

      const del = await c.query("DELETE FROM portfolio_items WHERE id = $1 AND entrepreneur_id = $2 RETURNING id", [itemId, epId]);
      if (!del.rowCount) throw httpError("Portfolio item not found or unauthorized", 404);
    });

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
