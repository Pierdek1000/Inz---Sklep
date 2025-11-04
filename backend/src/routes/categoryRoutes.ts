import { Router } from "express";
import { listCategories, createCategory } from "../controllers/categoryController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

// Public
router.get("/", listCategories);

// Admin/Seller protected
router.post("/", requireAuth, requireRole(["admin", "seller"]), createCategory);

export default router;
