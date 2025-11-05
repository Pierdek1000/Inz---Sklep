import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { User } from "../models/userModel";
import crypto from "crypto";
import { sendMail } from "../utils/email";

const JWT_SECRET: Secret = (process.env.JWT_SECRET as string) || "devsecret";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN as any) || "7d";

function setAuthCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd, // in dev allow http
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Brak wymaganych pól" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Użytkownik już istnieje" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashed,
    });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);

    setAuthCookie(res, token);

    return res.status(201).json({
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Register error", err);
    return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ message: "Brak email lub hasła" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Nieprawidłowe dane logowania" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Nieprawidłowe dane logowania" });
    }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);

    setAuthCookie(res, token);

    return res.json({
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  return res.json({ message: "Wylogowano" });
};

export const me = async (req: Request, res: Response) => {
  // augmented by middleware
  const user = (req as any).user as { id: string };
  if (!user) {
    return res.status(401).json({ message: "Brak autoryzacji" });
  }

  const dbUser = await User.findById(user.id).select("_id username email role");
  if (!dbUser) {
    return res.status(404).json({ message: "Użytkownik nie znaleziony" });
  }
  return res.json({ user: { id: dbUser._id, username: dbUser.username, email: dbUser.email, role: dbUser.role } });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ message: "Podaj email" });

    const user = await User.findOne({ email: email.toLowerCase() });
    // To prevent user enumeration, always respond 200
    if (!user) {
      return res.json({ message: "Jeśli konto istnieje, wysłaliśmy instrukcje resetu" });
    }

    // Generate token and store hashed version
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.passwordResetToken = hashed;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 min
    await user.save();

    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    const html = `
      <p>Witaj,</p>
      <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Jeśli to nie ty zignoruj wiadomość. Kliknij poniższy link, aby ustawić nowe hasło:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Link wygaśnie za 30 minut. Jeśli to nie Ty, zignoruj tę wiadomość.</p>
    `;

    try {
      await sendMail({ to: user.email, subject: "Reset hasła", html });
    } catch (e) {
      console.error("Mail send error", e);
      // do not expose error details to user
    }

    return res.json({ message: "Jeśli konto istnieje, wysłaliśmy instrukcje resetu" });
  } catch (err) {
    console.error("Forgot password error", err);
    return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      return res.status(400).json({ message: "Brak tokenu lub hasła" });
    }

    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: "Nieprawidłowy lub wygasły token" });
    }

    // Update password
    const newHash = await bcrypt.hash(password, 10);
    user.password = newHash;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: "Hasło zostało zresetowane. Możesz się zalogować." });
  } catch (err) {
    console.error("Reset password error", err);
    return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};
