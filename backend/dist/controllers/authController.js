"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.logout = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = require("../models/userModel");
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
function setAuthCookie(res, token) {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
        httpOnly: true,
        secure: isProd, // in dev allow http
        sameSite: isProd ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
    });
}
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Brak wymaganych pól" });
        }
        const existing = await userModel_1.User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: "Użytkownik już istnieje" });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await userModel_1.User.create({
            username,
            email: email.toLowerCase(),
            password: hashed,
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
        setAuthCookie(res, token);
        return res.status(201).json({
            user: { id: user._id, username: user.username, email: user.email },
        });
    }
    catch (err) {
        console.error("Register error", err);
        return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Brak email lub hasła" });
        }
        const user = await userModel_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Nieprawidłowe dane logowania" });
        }
        const ok = await bcryptjs_1.default.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ message: "Nieprawidłowe dane logowania" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
        setAuthCookie(res, token);
        return res.json({
            user: { id: user._id, username: user.username, email: user.email },
        });
    }
    catch (err) {
        console.error("Login error", err);
        return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
    }
};
exports.login = login;
const logout = async (_req, res) => {
    res.clearCookie("token", { path: "/" });
    return res.json({ message: "Wylogowano" });
};
exports.logout = logout;
const me = async (req, res) => {
    // augmented by middleware
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Brak autoryzacji" });
    }
    const dbUser = await userModel_1.User.findById(user.id).select("_id username email");
    if (!dbUser) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
    }
    return res.json({ user: { id: dbUser._id, username: dbUser.username, email: dbUser.email } });
};
exports.me = me;
//# sourceMappingURL=authController.js.map