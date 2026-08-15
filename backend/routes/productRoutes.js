const express = require("express");
const { getProducts, getMyProducts, getProductById, createProduct, updateProduct, deleteProduct, addProductImage, deleteProductImage } = require("../controllers/productController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

/* Routes are mounted from app.js without /api. */
// GET /
router.get("/", getProducts);
// GET my
router.get("/my", authenticateUser, requireEntrepreneur, getMyProducts);
// GET :id
router.get("/:id", getProductById);
// POST /
router.post("/", authenticateUser, requireEntrepreneur, createProduct);
// PUT :id
router.put("/:id", authenticateUser, requireEntrepreneur, updateProduct);
// DELETE :id
router.delete("/:id", authenticateUser, requireEntrepreneur, deleteProduct);
// POST :id/images
router.post("/:id/images", authenticateUser, requireEntrepreneur, addProductImage);
// DELETE :id/images/:imageId
router.delete("/:id/images/:imageId", authenticateUser, requireEntrepreneur, deleteProductImage);

module.exports = router;