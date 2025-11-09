import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel";

export interface AuthPayload {
  id: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token as string | undefined;
    if (!token) return res.status(401).json({ message: "Brak tokenu" });
    const secret = (process.env.JWT_SECRET as string) || "devsecret";
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as any).user = { id: payload.id };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Nieautoryzowany" });
  }
};

export const requireRole = (roles: Array<"admin" | "seller">) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as { id: string } | undefined;
      if (!user?.id) return res.status(401).json({ message: "Brak autoryzacji" });
      const dbUser = await User.findById(user.id).select("role");
      if (!dbUser) return res.status(401).json({ message: "Nieautoryzowany" });
      if (!roles.includes(dbUser.role as any)) {
        return res.status(403).json({ message: "Brak uprawnień" });
      }
      next();
    } catch (err) {
      return res.status(401).json({ message: "Nieautoryzowany" });
    }
  };
};

// Opcjonalne dołączenie użytkownika jeśli token jest poprawny; brak błędu gdy brak tokenu
export const attachUserIfPresent = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = (req as any).cookies?.token as string | undefined;
    if (!token) return next();
    const secret = (process.env.JWT_SECRET as string) || "devsecret";
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as any).user = { id: (payload as any).id };
  } catch {
    // ignore invalid token
  }
  next();
};
