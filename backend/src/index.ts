import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";
import type { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "./models/userModel";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import userRoutes from "./routes/userRoutes";
import orderRoutes from "./routes/orderRoutes";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [process.env.CLIENT_URL || "http://localhost:5173"];
      if (!origin || allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS setup
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = [CLIENT_URL, "http://localhost:5173"];
    if (!origin || allowed.includes(origin) || /^http:\/\/localhost:\\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
// Static files for uploaded images
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// --- Socket.IO WebRTC sygnalizacja ---
// Prosty model: jeden nadawca (broadcaster) wielu odbiorców (watchers)
let broadcaster: string | null = null;

io.on("connection", (socket: import("socket.io").Socket) => {
  console.log("[socket] connected", socket.id);

  // Jeśli nadawca już istnieje, poinformuj nowych klientów
  if (broadcaster) {
    socket.emit("broadcaster");
  }

  socket.on("broadcaster", () => {
    broadcaster = socket.id;
    console.log("[socket] broadcaster set", broadcaster);
    socket.broadcast.emit("broadcaster");
  });

  socket.on("watcher", () => {
    console.log("[socket] watcher joined", socket.id, "broadcaster:", broadcaster)
    if (broadcaster) {
      io.to(broadcaster).emit("watcher", socket.id);
    } else {
      socket.emit("broadcaster");
    }
  });

  socket.on("offer", (id: string, description: any) => {
    io.to(id).emit("offer", socket.id, description);
  });

  socket.on("answer", (id: string, description: any) => {
    io.to(id).emit("answer", socket.id, description);
  });

  socket.on("candidate", (id: string, candidate: any) => {
    io.to(id).emit("candidate", socket.id, candidate);
  });

  socket.on("disconnect", () => {
    console.log("[socket] disconnected", socket.id);
    if (socket.id === broadcaster) {
      broadcaster = null;
      socket.broadcast.emit("broadcaster-ended");
    } else if (broadcaster) {
      io.to(broadcaster).emit("disconnectPeer", socket.id);
    }
  });

  // --- Prosty czat tylko dla zalogowanych ---
  socket.on("chat:send", async (text: string) => {
    try {
      const user = await getSocketUser(socket);
      if (!user) {
        socket.emit("chat:error", "UNAUTHORIZED");
        return;
      }
      const clean = (text || "").toString().trim().slice(0, 1000);
      if (!clean) return;
      const message = {
        id: user._id?.toString?.() || user.id,
        username: user.username,
        role: user.role,
        text: clean,
        ts: Date.now(),
      };
      io.emit("chat:new", message);
    } catch (e) {
      socket.emit("chat:error", "INTERNAL_ERROR");
    }
  });
});

const start = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`Backend + Socket.IO uruchomiony na porcie ${PORT}`);
  });
};

start();

// Pomocnicze: pobierz użytkownika z cookie JWT w handshake
function parseCookies(cookieHeader?: string) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.split("=");
    if (!k) return;
    out[k.trim()] = decodeURIComponent(v.join("=")?.trim() || "");
  });
  return out;
}

async function getSocketUser(socket: import("socket.io").Socket) {
  try {
    const cookies = parseCookies((socket.handshake.headers as any)?.cookie as string | undefined);
    const token = cookies["token"];
    if (!token) return null;
    const secret = (process.env.JWT_SECRET as string) || "devsecret";
    const payload = jwt.verify(token, secret) as { id: string };
    if (!payload?.id) return null;
    const dbUser = await User.findById(payload.id).select("username role");
    if (!dbUser) return null;
    return dbUser as any;
  } catch {
    return null;
  }
}
