import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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
