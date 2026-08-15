const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req,res)=>res.json({success:true,message:"Welcome to HunarHub API"}));

app.use("/health", require("./routes/healthRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/entrepreneurs", require("./routes/entrepreneurRoutes"));
app.use("/categories", require("./routes/categoryRoutes"));
app.use("/skills", require("./routes/skillRoutes"));
app.use("/services", require("./routes/serviceRoutes"));
app.use("/products", require("./routes/productRoutes"));
app.use("/availability", require("./routes/availabilityRoutes"));
app.use("/service-requests", require("./routes/serviceRequestRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/payments", require("./routes/paymentRoutes"));
app.use("/reviews", require("./routes/reviewRoutes"));
app.use("/favorites", require("./routes/favoriteRoutes"));
app.use("/notifications", require("./routes/notificationRoutes"));
app.use("/complaints", require("./routes/complaintRoutes"));
app.use("/admin", require("./routes/adminRoutes"));

app.use((req,res)=>res.status(404).json({success:false,message:"Endpoint not found"}));

module.exports=app;
