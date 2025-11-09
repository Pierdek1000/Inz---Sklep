import { Router } from "express";
import { listUsers, updateUserRole } from "../controllers/userAdminController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

// Wszystkie ścieżki tylko dla admina
router.get("/", requireAuth, requireRole(["admin"]), listUsers);
router.patch("/:id/role", requireAuth, requireRole(["admin"]), updateUserRole);

export default router;
