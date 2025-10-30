import { Router } from "express";
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/productController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

// Public
router.get("/", listProducts);
router.get("/:idOrSlug", getProduct);

// Admin/Seller protected
router.post("/", requireAuth, requireRole(["admin", "seller"]), createProduct);
router.put("/:id", requireAuth, requireRole(["admin", "seller"]), updateProduct);
router.delete("/:id", requireAuth, requireRole(["admin", "seller"]), deleteProduct);

export default router;
