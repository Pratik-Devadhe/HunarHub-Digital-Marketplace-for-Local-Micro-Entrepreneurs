require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;

const app = express();

const allowedOrigins = [
  "https://hunarhub-frontend-seven.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^https:\/\/hunarhub-frontend.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.json({ success: true, message: "Welcome to HunarHub API" }));

const apiRouter = express.Router();
apiRouter.use("/health", require("./routes/healthRoutes"));
apiRouter.use("/auth", require("./routes/authRoutes"));
apiRouter.use("/users", require("./routes/userRoutes"));
apiRouter.use("/entrepreneurs", require("./routes/entrepreneurRoutes"));
apiRouter.use("/categories", require("./routes/categoryRoutes"));
apiRouter.use("/skills", require("./routes/skillRoutes"));
apiRouter.use("/services", require("./routes/serviceRoutes"));
apiRouter.use("/products", require("./routes/productRoutes"));
apiRouter.use("/availability", require("./routes/availabilityRoutes"));
apiRouter.use("/service-requests", require("./routes/serviceRequestRoutes"));
apiRouter.use("/orders", require("./routes/orderRoutes"));
apiRouter.use("/payments", require("./routes/paymentRoutes"));
apiRouter.use("/reviews", require("./routes/reviewRoutes"));
apiRouter.use("/favorites", require("./routes/favoriteRoutes"));
apiRouter.use("/notifications", require("./routes/notificationRoutes"));
apiRouter.use("/complaints", require("./routes/complaintRoutes"));
apiRouter.use("/portfolio", require("./routes/portfolioRoutes"));
apiRouter.use("/quotes", require("./routes/quoteRoutes"));
apiRouter.use("/messages", require("./routes/messageRoutes"));
apiRouter.use("/admin", require("./routes/adminRoutes"));

app.use("/api", apiRouter);
app.use(apiRouter);

app.use((req,res)=>res.status(404).json({success:false,message:"Endpoint not found"}));

// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Central Error Handler:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    error: err.message || "Internal server error"
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`HunarHub Backend server running on port ${port}`);
  });
}

module.exports = app;
