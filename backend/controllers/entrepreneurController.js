const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");
const { normalizePhone } = require("../utils/phone");

const profileByUser = async (c, userId) => {
  const r = await c.query("SELECT * FROM entrepreneur_profiles WHERE user_id=$1", [userId]);
  if (!r.rowCount) throw httpError("Entrepreneur profile not found", 404);
  return r.rows[0];
};

const getEntrepreneurs = async (req, res) => {
  try {
    const {
      category_id,
      skill_id,
      city,
      lat,
      lng,
      radius,
      min_rating,
      verified_only,
      available_only,
      search,
      sort_by
    } = req.query;

    const vals = [];
    const where = ["ep.verification_status='APPROVED'"];
    let n = 1;

    if (available_only === 'true') {
      where.push("ep.is_available=true");
    }
    if (verified_only === 'true') {
      where.push("ep.verification_status='APPROVED'");
    }
    if (city && city.trim()) {
      where.push(`LOWER(ep.city)=LOWER($${n++})`);
      vals.push(city.trim());
    }
    if (min_rating && !isNaN(Number(min_rating))) {
      where.push(`ep.average_rating >= $${n++}`);
      vals.push(Number(min_rating));
    }
    if (category_id) {
      where.push(`EXISTS(SELECT 1 FROM entrepreneur_skills es JOIN skills s ON s.id=es.skill_id WHERE es.entrepreneur_id=ep.id AND s.category_id=$${n++})`);
      vals.push(id(category_id, "category id"));
    }
    if (skill_id) {
      where.push(`EXISTS(SELECT 1 FROM entrepreneur_skills es WHERE es.entrepreneur_id=ep.id AND es.skill_id=$${n++})`);
      vals.push(id(skill_id, "skill id"));
    }
    if (search && search.trim()) {
      where.push(`(ep.business_name ILIKE $${n} OR ep.bio ILIKE $${n} OR u.full_name ILIKE $${n})`);
      vals.push(`%${search.trim()}%`);
      n++;
    }

    let selectDistance = "NULL as distance_km";
    const hasLocation = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));

    if (hasLocation) {
      const latitude = Number(lat);
      const longitude = Number(lng);
      const distRadius = Number(radius || 50000); // 50km default
      selectDistance = `ROUND((ST_Distance(ep.location, ST_SetSRID(ST_MakePoint($${n}, $${n+1}), 4326)::geography) / 1000.0)::numeric, 2) as distance_km`;
      where.push(`(ep.location IS NULL OR ST_DWithin(ep.location, ST_SetSRID(ST_MakePoint($${n}, $${n+1}), 4326)::geography, $${n+2}))`);
      vals.push(longitude, latitude, distRadius);
      n += 3;
    }

    let orderBy = "ep.average_rating DESC, ep.id DESC";
    if (sort_by === "rating") orderBy = "ep.average_rating DESC, ep.total_reviews DESC";
    else if (sort_by === "nearest" && hasLocation) orderBy = "distance_km ASC NULLS LAST, ep.id DESC";
    else if (sort_by === "price_low") orderBy = "starting_price ASC NULLS LAST";
    else if (sort_by === "experience") orderBy = "ep.experience_years DESC";

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const data = await withTransaction(async (c) => {
      const countRes = await c.query(
        `SELECT COUNT(*)::int as total
         FROM entrepreneur_profiles ep
         JOIN users u ON u.id = ep.user_id
         WHERE ${where.join(" AND ")}`,
        vals
      );
      const total = countRes.rows[0]?.total || 0;

      const queryStr = `
        SELECT ep.id, ep.user_id, u.full_name, u.profile_image, ep.business_name, ep.bio, ep.experience_years,
               ep.city, ep.state, ep.pincode, ep.phone, ep.average_rating, ep.total_reviews, ep.is_available,
               ep.verification_status,
               (SELECT MIN(s.price) FROM services s WHERE s.entrepreneur_id = ep.id AND s.is_active = true) as starting_price,
               ${selectDistance},
               (SELECT COUNT(*)::int FROM service_requests sr WHERE sr.entrepreneur_id = ep.id AND sr.status = 'COMPLETED') as completed_orders_count
        FROM entrepreneur_profiles ep
        JOIN users u ON u.id = ep.user_id
        WHERE ${where.join(" AND ")}
        ORDER BY ${orderBy}
        LIMIT $${n} OFFSET $${n + 1}`;

      const rows = (await c.query(queryStr, [...vals, limit, offset])).rows;
      return {
        entrepreneurs: rows,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      };
    });

    res.json({ success: true, ...data });
  } catch (e) {
    sendError(res, e);
  }
};

const getNearbyEntrepreneurs = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 25000); // 25km
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || radius <= 0) {
      throw httpError("Valid lat, lng and positive radius are required");
    }

    const rows = await withTransaction(async (c) => {
      const queryStr = `
        SELECT ep.id, ep.user_id, u.full_name, u.profile_image, ep.business_name, ep.city, ep.state,
               ep.average_rating, ep.total_reviews, ep.is_available, ep.verification_status,
               (SELECT MIN(s.price) FROM services s WHERE s.entrepreneur_id = ep.id AND s.is_active = true) as starting_price,
               ROUND((ST_Distance(ep.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000.0)::numeric, 2) as distance_km
        FROM entrepreneur_profiles ep
        JOIN users u ON u.id = ep.user_id
        WHERE ep.verification_status = 'APPROVED' AND ep.is_available = true AND ep.location IS NOT NULL
          AND ST_DWithin(ep.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        ORDER BY distance_km ASC`;
      return (await c.query(queryStr, [lng, lat, radius])).rows;
    });

    res.json({ success: true, entrepreneurs: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getEntrepreneurById = async (req, res) => {
  try {
    const entrepreneurId = id(req.params.id, "entrepreneur id");

    const data = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT ep.*, u.full_name, u.email, u.phone as user_phone, u.profile_image,
                (SELECT MIN(s.price) FROM services s WHERE s.entrepreneur_id = ep.id AND s.is_active = true) as starting_price,
                (SELECT COUNT(*)::int FROM service_requests sr WHERE sr.entrepreneur_id = ep.id AND sr.status = 'COMPLETED') as completed_orders_count
         FROM entrepreneur_profiles ep
         JOIN users u ON u.id = ep.user_id
         WHERE ep.id = $1`,
        [entrepreneurId]
      );
      if (!r.rowCount) throw httpError("Entrepreneur not found", 404);

      const entrepreneur = r.rows[0];

      // Fetch services, products, portfolio items, reviews, availability, skills
      const [services, products, portfolio, reviews, availability, skills] = await Promise.all([
        c.query("SELECT * FROM services WHERE entrepreneur_id = $1 AND is_active = true ORDER BY created_at DESC", [entrepreneurId]),
        c.query("SELECT * FROM products WHERE entrepreneur_id = $1 AND is_available = true ORDER BY created_at DESC", [entrepreneurId]),
        c.query("SELECT * FROM portfolio_items WHERE entrepreneur_id = $1 ORDER BY created_at DESC", [entrepreneurId]),
        c.query(
          `SELECT rev.*, u.full_name as customer_name, u.profile_image as customer_image
           FROM reviews rev
           JOIN users u ON u.id = rev.customer_id
           WHERE rev.entrepreneur_id = $1
           ORDER BY rev.created_at DESC`,
          [entrepreneurId]
        ),
        c.query("SELECT * FROM entrepreneur_availability WHERE entrepreneur_id = $1 ORDER BY day_of_week ASC", [entrepreneurId]),
        c.query(
          `SELECT s.id, s.name, s.description, s.category_id, c.name as category_name
           FROM entrepreneur_skills es
           JOIN skills s ON s.id = es.skill_id
           JOIN categories c ON c.id = s.category_id
           WHERE es.entrepreneur_id = $1
           ORDER BY s.name`,
          [entrepreneurId]
        )
      ]);

      return {
        ...entrepreneur,
        services: services.rows,
        products: products.rows,
        portfolio: portfolio.rows,
        reviews: reviews.rows,
        availability: availability.rows,
        skills: skills.rows
      };
    });

    res.json({ success: true, entrepreneur: data });
  } catch (e) {
    sendError(res, e);
  }
};

const createProfile = async (req, res) => {
  try {
    const { business_name, bio, experience_years, phone, address, city, state, pincode, latitude, longitude } = req.body;
    const normalizedPhone = phone ? normalizePhone(phone, false) : null;

    const data = await withTransaction(async (c) => {
      // Ensure user role is updated to ENTREPRENEUR in users table
      await c.query("UPDATE users SET role = 'ENTREPRENEUR', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [req.user.id]);

      const existing = await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id = $1", [req.user.id]);

      let r;
      if (existing.rowCount) {
        // Profile stub exists, update with onboarding details and approve
        r = await c.query(
          `UPDATE entrepreneur_profiles SET
             business_name = COALESCE($1, business_name),
             bio = COALESCE($2, bio),
             experience_years = COALESCE($3, experience_years),
             phone = COALESCE($4, phone),
             address = COALESCE($5, address),
             city = COALESCE($6, city),
             state = COALESCE($7, state),
             pincode = COALESCE($8, pincode),
             verification_status = 'APPROVED',
             is_available = true,
             location = CASE WHEN $9::double precision IS NOT NULL AND $10::double precision IS NOT NULL
               THEN ST_SetSRID(ST_MakePoint($10, $9), 4326)::geography ELSE location END,
             updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $11 RETURNING *`,
          [
            business_name || null,
            bio || null,
            experience_years ? parseInt(experience_years) : 0,
            normalizedPhone,
            address || null,
            city || null,
            state || null,
            pincode || null,
            latitude ?? null,
            longitude ?? null,
            req.user.id
          ]
        );
      } else {
        // Insert new approved entrepreneur profile
        r = await c.query(
          `INSERT INTO entrepreneur_profiles
           (user_id, business_name, bio, experience_years, phone, address, city, state, pincode, verification_status, is_available, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'APPROVED', true,
             CASE WHEN $10::double precision IS NOT NULL AND $11::double precision IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint($11, $10), 4326)::geography ELSE NULL END)
           RETURNING *`,
          [
            req.user.id,
            business_name || null,
            bio || null,
            experience_years ? parseInt(experience_years) : 0,
            normalizedPhone,
            address || null,
            city || null,
            state || null,
            pincode || null,
            latitude ?? null,
            longitude ?? null
          ]
        );
      }

      return r.rows[0];
    });

    res.status(201).json({ success: true, entrepreneur: data });
  } catch (e) {
    sendError(res, e);
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      business_name,
      bio,
      experience_years,
      phone,
      address,
      city,
      state,
      pincode,
      is_available,
      latitude,
      longitude
    } = req.body;
    const normalizedPhone = phone !== undefined ? (phone ? normalizePhone(phone, false) : null) : undefined;

    const data = await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      const r = await c.query(
        `UPDATE entrepreneur_profiles SET
           business_name = COALESCE($1, business_name),
           bio = COALESCE($2, bio),
           experience_years = COALESCE($3, experience_years),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           state = COALESCE($7, state),
           pincode = COALESCE($8, pincode),
           is_available = COALESCE($9, is_available),
           location = CASE WHEN $10::double precision IS NOT NULL AND $11::double precision IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint($11, $10), 4326)::geography ELSE location END,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $12 RETURNING *`,
        [
          business_name ?? null,
          bio ?? null,
          experience_years ?? null,
          normalizedPhone ?? null,
          address ?? null,
          city ?? null,
          state ?? null,
          pincode ?? null,
          is_available ?? null,
          latitude ?? null,
          longitude ?? null,
          ep.id
        ]
      );
      return r.rows[0];
    });

    res.json({ success: true, entrepreneur: data });
  } catch (e) {
    sendError(res, e);
  }
};

const deleteProfile = async (req, res) => {
  try {
    await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      await c.query("DELETE FROM entrepreneur_profiles WHERE id = $1", [ep.id]);
      await c.query("UPDATE users SET role = 'CUSTOMER', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [req.user.id]);
    });
    res.json({ success: true, message: "Entrepreneur profile deleted" });
  } catch (e) {
    sendError(res, e);
  }
};

const getEntrepreneurServices = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        "SELECT s.*, c.name as category_name FROM services s LEFT JOIN categories c ON c.id = s.category_id WHERE s.entrepreneur_id = $1 AND s.is_active = true ORDER BY s.created_at DESC",
        [id(req.params.id, "entrepreneur id")]
      )).rows
    );
    res.json({ success: true, services: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getEntrepreneurProducts = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT p.*, COALESCE(json_agg(pi.image_url) FILTER(WHERE pi.id IS NOT NULL), '[]') images
         FROM products p LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE p.entrepreneur_id = $1 AND p.is_available = true
         GROUP BY p.id ORDER BY p.created_at DESC`,
        [id(req.params.id, "entrepreneur id")]
      )).rows
    );
    res.json({ success: true, products: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getEntrepreneurReviews = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) =>
      (await c.query(
        `SELECT r.*, u.full_name, u.profile_image FROM reviews r JOIN users u ON u.id = r.customer_id
         WHERE r.entrepreneur_id = $1 ORDER BY r.created_at DESC`,
        [id(req.params.id, "entrepreneur id")]
      )).rows
    );
    res.json({ success: true, reviews: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const getEntrepreneurDashboard = async (req, res) => {
  try {
    const data = await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      const [
        services,
        products,
        requests,
        quotes,
        orders,
        prodEarnings,
        svcEarnings,
        completedSvc,
        completedOrd,
        reviews,
        portfolio,
        recentTx
      ] = await Promise.all([
        c.query("SELECT COUNT(*)::int count FROM services WHERE entrepreneur_id = $1 AND is_active = true", [ep.id]),
        c.query("SELECT COUNT(*)::int count FROM products WHERE entrepreneur_id = $1 AND is_available = true", [ep.id]),
        c.query("SELECT COUNT(*)::int count FROM service_requests WHERE entrepreneur_id = $1 AND status IN ('PENDING', 'REQUESTED', 'QUOTED')", [ep.id]),
        c.query("SELECT COUNT(*)::int count FROM quotes WHERE entrepreneur_id = $1 AND status = 'PENDING'", [ep.id]),
        c.query("SELECT COUNT(DISTINCT oi.order_id)::int count FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.entrepreneur_id = $1 AND o.status NOT IN ('CANCELLED')", [ep.id]),
        c.query("SELECT COALESCE(SUM(oi.subtotal), 0)::numeric earnings FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.entrepreneur_id = $1 AND o.status = 'COMPLETED'", [ep.id]),
        c.query("SELECT COALESCE(SUM(COALESCE(final_price, estimated_price, 0)), 0)::numeric earnings FROM service_requests WHERE entrepreneur_id = $1 AND status = 'COMPLETED'", [ep.id]),
        c.query("SELECT COUNT(*)::int count FROM service_requests WHERE entrepreneur_id = $1 AND status = 'COMPLETED'", [ep.id]),
        c.query("SELECT COUNT(DISTINCT oi.order_id)::int count FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.entrepreneur_id = $1 AND o.status = 'COMPLETED'", [ep.id]),
        c.query("SELECT COUNT(*)::int count FROM reviews WHERE entrepreneur_id = $1", [ep.id]),
        c.query("SELECT COUNT(*)::int count FROM portfolio_items WHERE entrepreneur_id = $1", [ep.id]),
        c.query(
          `(SELECT 'SERVICE' as type, sr.id, sr.title, COALESCE(sr.final_price, sr.estimated_price, 0) as amount,
                   sr.updated_at as date, u.full_name as customer_name
            FROM service_requests sr
            JOIN users u ON u.id = sr.customer_id
            WHERE sr.entrepreneur_id = $1 AND sr.status = 'COMPLETED')
           UNION ALL
           (SELECT 'PRODUCT' as type, o.id, p.name as title, oi.subtotal as amount,
                   o.updated_at as date, u.full_name as customer_name
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            JOIN users u ON u.id = o.customer_id
            WHERE oi.entrepreneur_id = $1 AND o.status = 'COMPLETED')
           ORDER BY date DESC LIMIT 15`,
          [ep.id]
        )
      ]);

      const productEarnings = Number(prodEarnings.rows[0]?.earnings || 0);
      const serviceEarnings = Number(svcEarnings.rows[0]?.earnings || 0);
      const totalEarnings = productEarnings + serviceEarnings;

      return {
        entrepreneur: ep,
        counts: {
          services: services.rows[0].count,
          products: products.rows[0].count,
          pending_requests: requests.rows[0].count,
          pending_quotes: quotes.rows[0].count,
          orders: orders.rows[0].count,
          earnings: totalEarnings,
          product_earnings: productEarnings,
          service_earnings: serviceEarnings,
          completed_bookings: completedSvc.rows[0].count,
          completed_orders: completedOrd.rows[0].count,
          portfolio_items: portfolio.rows[0].count,
          total_reviews: reviews.rows[0].count
        },
        recent_transactions: recentTx.rows
      };
    });
    res.json({ success: true, dashboard: data });
  } catch (e) {
    sendError(res, e);
  }
};

const getMyProfile = async (req, res) => {
  try {
    const data = await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      const r = await c.query(
        `SELECT ep.*, u.full_name, u.email, u.phone as user_phone, u.profile_image,
                (SELECT MIN(s.price) FROM services s WHERE s.entrepreneur_id = ep.id AND s.is_active = true) as starting_price
         FROM entrepreneur_profiles ep JOIN users u ON u.id = ep.user_id WHERE ep.id = $1`,
        [ep.id]
      );
      return r.rows[0];
    });
    res.json({ success: true, entrepreneur: data });
  } catch (e) {
    sendError(res, e);
  }
};

const getMySkills = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      const r = await c.query(
        `SELECT s.id, s.name, s.description, s.category_id, c.name as category_name
         FROM entrepreneur_skills es
         JOIN skills s ON s.id = es.skill_id
         JOIN categories c ON c.id = s.category_id
         WHERE es.entrepreneur_id = $1
         ORDER BY s.name`,
        [ep.id]
      );
      return r.rows;
    });
    res.json({ success: true, skills: rows });
  } catch (e) {
    sendError(res, e);
  }
};

const addSkillToProfile = async (req, res) => {
  try {
    const { skill_id } = req.body;
    if (!skill_id) throw httpError("skill_id is required", 400);

    const data = await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      const skillCheck = await c.query(
        `SELECT s.*, c.name as category_name
         FROM skills s
         JOIN categories c ON c.id = s.category_id
         WHERE s.id = $1`,
        [id(skill_id, "skill id")]
      );
      if (!skillCheck.rowCount) throw httpError("Skill not found", 404);

      await c.query(
        `INSERT INTO entrepreneur_skills (entrepreneur_id, skill_id)
         VALUES ($1, $2)
         ON CONFLICT (entrepreneur_id, skill_id) DO NOTHING`,
        [ep.id, skillCheck.rows[0].id]
      );

      return skillCheck.rows[0];
    });

    res.status(201).json({ success: true, skill: data });
  } catch (e) {
    sendError(res, e);
  }
};

const removeSkillFromProfile = async (req, res) => {
  try {
    const skillId = id(req.params.skillId, "skill id");
    await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      await c.query(
        "DELETE FROM entrepreneur_skills WHERE entrepreneur_id = $1 AND skill_id = $2",
        [ep.id, skillId]
      );
    });
    res.json({ success: true, message: "Skill removed from profile" });
  } catch (e) {
    sendError(res, e);
  }
};

const getMyReviews = async (req, res) => {
  try {
    const rows = await withTransaction(async (c) => {
      const ep = await profileByUser(c, req.user.id);
      const r = await c.query(
        `SELECT rev.*, u.full_name as customer_name, u.profile_image as customer_image,
                p.name as product_name, sr.title as service_title
         FROM reviews rev
         JOIN users u ON u.id = rev.customer_id
         LEFT JOIN products p ON p.id = rev.product_id
         LEFT JOIN service_requests sr ON sr.id = rev.service_request_id
         WHERE rev.entrepreneur_id = $1
         ORDER BY rev.created_at DESC`,
        [ep.id]
      );
      return r.rows;
    });
    res.json({ success: true, reviews: rows });
  } catch (e) {
    sendError(res, e);
  }
};

module.exports = {
  getEntrepreneurs,
  getNearbyEntrepreneurs,
  getEntrepreneurById,
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  getEntrepreneurServices,
  getEntrepreneurProducts,
  getEntrepreneurReviews,
  getEntrepreneurDashboard,
  getMySkills,
  addSkillToProfile,
  removeSkillFromProfile,
  getMyReviews
};

