import { Router } from "express";
import { listCategories, createCategory, adminListCategories, updateCategory, deleteCategory } from "../controllers/categoryController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

// Public
router.get("/", listCategories);
// Admin list with full information
router.get("/manage", requireAuth, requireRole(["admin", "seller"]), adminListCategories);

// Admin/Seller protected
router.post("/", requireAuth, requireRole(["admin", "seller"]), createCategory);
router.put("/:id", requireAuth, requireRole(["admin", "seller"]), updateCategory);
router.delete("/:id", requireAuth, requireRole(["admin", "seller"]), deleteCategory);

export default router;
