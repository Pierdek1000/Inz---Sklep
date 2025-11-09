import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";
import type { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import userRoutes from "./routes/userRoutes";
import orderRoutes from "./routes/orderRoutes";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS setup
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = [CLIENT_URL, "http://localhost:5173", "http://localhost:5174"];
    if (!origin || allowed.includes(origin) || /^http:\/\/localhost:\\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
// Static files for uploaded images
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

const start = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend uruchomiony na porcie ${PORT}`);
  });
};

start();
