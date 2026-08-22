require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;

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
app.use("/portfolio", require("./routes/portfolioRoutes"));
app.use("/quotes", require("./routes/quoteRoutes"));
app.use("/messages", require("./routes/messageRoutes"));
app.use("/admin", require("./routes/adminRoutes"));

app.use((req,res)=>res.status(404).json({success:false,message:"Endpoint not found"}));

// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Central Error Handler:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

app.listen(port, () => {
    console.log(`Hunarhub Backend server running on port ${port}`);
});

module.exports=app;
