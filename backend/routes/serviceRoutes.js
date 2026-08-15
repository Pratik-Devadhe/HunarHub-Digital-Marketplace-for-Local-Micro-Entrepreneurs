const express = require("express");
const { getServices,getServiceById,getMyServices,createService,updateService,deleteService } = require("../controllers/serviceController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireEntrepreneur } = require("../middleware/roleMiddleware");
const router=express.Router();

/*
GET    /services
GET    /services/my
GET    /services/:id
POST   /services
PUT    /services/:id
DELETE /services/:id
*/
router.get("/",getServices);
router.get("/my",authenticateUser,requireEntrepreneur,getMyServices);
router.get("/:id",getServiceById);
router.post("/",authenticateUser,requireEntrepreneur,createService);
router.put("/:id",authenticateUser,requireEntrepreneur,updateService);
router.delete("/:id",authenticateUser,requireEntrepreneur,deleteService);
module.exports=router;
