"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// CORS setup
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const corsOptions = {
    origin: (origin, callback) => {
        const allowed = [CLIENT_URL, "http://localhost:5173", "http://localhost:5174"];
        if (!origin || allowed.includes(origin) || /^http:\/\/localhost:\\d+$/.test(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
// Healthcheck
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Routes
app.use("/api/auth", authRoutes_1.default);
const start = async () => {
    await (0, db_1.connectDB)();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Backend uruchomiony na porcie ${PORT}`);
    });
};
start();
//# sourceMappingURL=index.js.map