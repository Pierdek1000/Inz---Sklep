"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token)
            return res.status(401).json({ message: "Brak tokenu" });
        const secret = process.env.JWT_SECRET || "devsecret";
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = { id: payload.id };
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Nieautoryzowany" });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=authMiddleware.js.map