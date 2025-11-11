import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware";
import { ChatPenalty } from "../models/chatPenaltyModel";
import { User } from "../models/userModel";

const router = Router();

// GET /api/chat/penalties - lista aktywnych kar (admin/seller only)
router.get("/penalties", requireAuth, requireRole(["admin", "seller"]), async (req, res) => {
  try {
    const penalties = await ChatPenalty.find().sort({ createdAt: -1 }).lean();
    
    // Wzbogać o dane użytkowników
    const userIds = [...new Set(penalties.map((p) => p.userId))];
    const users = await User.find({ _id: { $in: userIds } }).select("_id username").lean();
    const userMap = new Map(users.map((u) => [String(u._id), u.username]));
    
    const enriched = penalties.map((p) => ({
      id: String(p._id),
      userId: p.userId,
      username: userMap.get(p.userId) || "Unknown",
      type: p.type,
      until: p.until || null,
      createdAt: p.createdAt,
    }));
    
    res.json({ penalties: enriched });
  } catch (err) {
    console.error("GET /api/chat/penalties error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
});

// GET /api/chat/status - status aktualnego użytkownika (timeout/ban)
router.get("/status", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    
    // Sprawdź ban
    const ban = await ChatPenalty.findOne({ userId, type: "ban" });
    if (ban) {
      return res.json({ 
        banned: true, 
        muted: false,
        until: ban.until || null 
      });
    }
    
    // Sprawdź timeout
    const timeout = await ChatPenalty.findOne({ userId, type: "timeout" });
    if (timeout && timeout.until) {
      if (timeout.until.getTime() > Date.now()) {
        return res.json({ 
          banned: false, 
          muted: true,
          until: timeout.until.getTime() 
        });
      } else {
        // Timeout wygasł, usuń
        await ChatPenalty.deleteOne({ _id: timeout._id });
      }
    }
    
    // Brak kar
    res.json({ banned: false, muted: false, until: null });
  } catch (err) {
    console.error("GET /api/chat/status error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
});

export default router;