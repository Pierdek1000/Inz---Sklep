import { Router } from "express";
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct, listCategories } from "../controllers/productController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";
import { uploadImages } from "../middleware/upload";

const router = Router();

// Public
router.get("/", listProducts);
router.get("/categories", listCategories);
router.get("/:idOrSlug", getProduct);

// Admin/Seller protected
router.post("/upload", requireAuth, requireRole(["admin", "seller"]), uploadImages.array("images", 8), (req, res) => {
	try {
		const files = (req as any).files as Array<any> | undefined;
		const host = `${req.protocol}://${req.get("host")}`;
		const urls = (files || []).map((f) => `${host}/uploads/${f.filename}`);
		res.json({ urls });
	} catch (e) {
		res.status(500).json({ message: "Błąd przesyłania plików" });
	}
});
router.post("/", requireAuth, requireRole(["admin", "seller"]), createProduct);
router.put("/:id", requireAuth, requireRole(["admin", "seller"]), updateProduct);
router.delete("/:id", requireAuth, requireRole(["admin", "seller"]), deleteProduct);

export default router;
