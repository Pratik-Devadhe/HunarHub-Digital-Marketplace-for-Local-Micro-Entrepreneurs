const express=require("express");
const {
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
} = require("../controllers/entrepreneurController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireEntrepreneur } = require("../middleware/roleMiddleware");
const router = express.Router();

router.get("/", getEntrepreneurs);
router.get("/nearby", getNearbyEntrepreneurs);
router.get("/profile", authenticateUser, requireEntrepreneur, getMyProfile);
router.get("/dashboard", authenticateUser, requireEntrepreneur, getEntrepreneurDashboard);
router.get("/skills", authenticateUser, requireEntrepreneur, getMySkills);
router.post("/skills", authenticateUser, requireEntrepreneur, addSkillToProfile);
router.delete("/skills/:skillId", authenticateUser, requireEntrepreneur, removeSkillFromProfile);
router.get("/my/reviews", authenticateUser, requireEntrepreneur, getMyReviews);
router.get("/:id/services", getEntrepreneurServices);
router.get("/:id/products", getEntrepreneurProducts);
router.get("/:id/reviews", getEntrepreneurReviews);
router.get("/:id", getEntrepreneurById);
router.post("/profile", authenticateUser, requireEntrepreneur, createProfile);
router.put("/profile", authenticateUser, requireEntrepreneur, updateProfile);
router.delete("/profile", authenticateUser, requireEntrepreneur, deleteProfile);
module.exports = router;
