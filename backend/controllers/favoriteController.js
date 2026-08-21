const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getFavorites = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT f.*,
                p.name as product_name, p.price as product_price, p.description as product_description,
                (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary LIMIT 1) as product_image,
                ep.business_name, ep.city as ep_city, ep.average_rating as ep_rating, ep.total_reviews as ep_reviews,
                u.full_name as artisan_name, u.profile_image as artisan_image
         FROM favorites f
         LEFT JOIN products p ON p.id = f.product_id
         LEFT JOIN entrepreneur_profiles ep ON ep.id = COALESCE(f.entrepreneur_id, p.entrepreneur_id)
         LEFT JOIN users u ON u.id = ep.user_id
         WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
        [req.user.id]
      )).rows
    );
    res.json({ success: true, favorites: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const addFavorite = async (req, res) => {
  try {
    let { entrepreneur_id, product_id, service_id } = req.body;

    const row = await withTransaction(async (c) => {
      if (service_id && !entrepreneur_id && !product_id) {
        const s = await c.query("SELECT entrepreneur_id FROM services WHERE id = $1", [id(service_id, "service id")]);
        if (!s.rowCount) throw httpError("Service not found", 404);
        entrepreneur_id = s.rows[0].entrepreneur_id;
      }

      const targetCount = [entrepreneur_id, product_id].filter(Boolean).length;
      if (targetCount !== 1) throw httpError("Provide exactly one favorite target (artisan or product)", 400);

      if (entrepreneur_id) {
        const r = await c.query("SELECT id FROM entrepreneur_profiles WHERE id = $1", [entrepreneur_id]);
        if (!r.rowCount) throw httpError("Entrepreneur not found", 404);
      }
      if (product_id) {
        const r = await c.query("SELECT id FROM products WHERE id = $1", [product_id]);
        if (!r.rowCount) throw httpError("Product not found", 404);
      }

      const dup = await c.query(
        `SELECT id FROM favorites
         WHERE user_id = $1
           AND entrepreneur_id IS NOT DISTINCT FROM $2
           AND product_id IS NOT DISTINCT FROM $3`,
        [req.user.id, entrepreneur_id || null, product_id || null]
      );
      if (dup.rowCount) throw httpError("Item is already in your favorites", 409);

      return (await c.query(
        "INSERT INTO favorites (user_id, entrepreneur_id, product_id) VALUES ($1, $2, $3) RETURNING *",
        [req.user.id, entrepreneur_id || null, product_id || null]
      )).rows[0];
    });

    res.status(201).json({ success: true, favorite: row });
  } catch (e) {
    sendError(res, e);
  }
};

const removeFavorite = async (req, res) => {
  try {
    await withTransaction(async (c) => {
      const r = await c.query("DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id", [id(req.params.id), req.user.id]);
      if (!r.rowCount) throw httpError("Favorite not found", 404);
    });
    res.json({ success: true, message: "Favorite removed" });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
