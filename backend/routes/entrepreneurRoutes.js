const express=require("express");
const {getEntrepreneurs,getNearbyEntrepreneurs,getEntrepreneurById,getMyProfile,createProfile,updateProfile,deleteProfile,
getEntrepreneurServices,getEntrepreneurProducts,getEntrepreneurReviews,getEntrepreneurDashboard}=require("../controllers/entrepreneurController");
const {authenticateUser}=require("../middleware/authMiddleware");
const {requireEntrepreneur}=require("../middleware/roleMiddleware");
const router=express.Router();

/*
GET    /entrepreneurs
GET    /entrepreneurs/nearby
GET    /entrepreneurs/profile
GET    /entrepreneurs/dashboard
GET    /entrepreneurs/:id
GET    /entrepreneurs/:id/services
GET    /entrepreneurs/:id/products
GET    /entrepreneurs/:id/reviews
POST   /entrepreneurs/profile
PUT    /entrepreneurs/profile
DELETE /entrepreneurs/profile
*/
router.get("/",getEntrepreneurs);
router.get("/nearby",getNearbyEntrepreneurs);
router.get("/profile",authenticateUser,requireEntrepreneur,getMyProfile);
router.get("/dashboard",authenticateUser,requireEntrepreneur,getEntrepreneurDashboard);
router.get("/:id/services",getEntrepreneurServices);
router.get("/:id/products",getEntrepreneurProducts);
router.get("/:id/reviews",getEntrepreneurReviews);
router.get("/:id",getEntrepreneurById);
router.post("/profile",authenticateUser,requireEntrepreneur,createProfile);
router.put("/profile",authenticateUser,requireEntrepreneur,updateProfile);
router.delete("/profile",authenticateUser,requireEntrepreneur,deleteProfile);
module.exports=router;
