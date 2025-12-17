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
import { Product } from "./models/productModel";
import { ChatPenalty } from "./models/chatPenaltyModel";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import userRoutes from "./routes/userRoutes";
import orderRoutes from "./routes/orderRoutes";
import chatRoutes from "./routes/chatRoutes";

dotenv.config();

const app = express();
app.use(cors({
  origin: true, // To sprawia, ¿e backend "odbija" adres frontendu jako dozwolony, zamiast dawaæ '*'
  credentials: true // To pozwala na przesy³anie ciasteczek i nag³ówków autoryzacyjnych
}));
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // LOGOWANIE - to poka¿e Ci w konsoli serwera, kto próbuje siê po³¹czyæ
      if (origin) console.log("Próba po³¹czenia Socket.IO z:", origin);

      const allowed = [
        process.env.CLIENT_URL, 
        "http://localhost:5173",
        "https://adrianwojewski.duckdns.org" // <--- TO JEST KLUCZOWE! (musi byæ https)
      ];

      // Pozwalamy jeœli:
      // 1. Brak origin (narzêdzia typu Postman)
      // 2. Origin jest na liœcie allowed
      // 3. Origin to localhost (dla testów lokalnych)
      if (
        !origin || 
        allowed.includes(origin) || 
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        callback(null, true);
      } else {
        console.error("Socket.IO zablokowa³:", origin);
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
app.use("/api/chat", chatRoutes);
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));


let broadcaster: string | null = null;
let highlightedProductId: string | null = null;

io.on("connection", (socket: import("socket.io").Socket) => {
  console.log("[socket] connected", socket.id);

 
  if (broadcaster) {
    socket.emit("broadcaster");
  }


  (async () => {
    try {
      if (highlightedProductId) {
        const prod = await Product.findById(highlightedProductId).lean();
        if (prod) {
          const summary = {
            id: String(prod._id),
            name: prod.name,
            slug: prod.slug,
            price: prod.price,
            currency: (prod as any).currency || 'PLN',
            image: Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : null,
            inStock: (prod as any).stock > 0,
          };
          socket.emit("highlight:update", summary);
        }
      }
    } catch {}
  })();

  socket.on("broadcaster", () => {
    broadcaster = socket.id;
    console.log("[socket] broadcaster set", broadcaster);
    socket.broadcast.emit("broadcaster");
    if (highlightedProductId) {
    }
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
      highlightedProductId = null;
      socket.broadcast.emit("broadcaster-ended");
      socket.broadcast.emit("highlight:update", null);
    } else if (broadcaster) {
      io.to(broadcaster).emit("disconnectPeer", socket.id);
    }
  });

 
  socket.on("chat:send", async (text: string) => {
    try {
      const user = await getSocketUser(socket);
      if (!user) {
        socket.emit("chat:error", { code: "UNAUTHORIZED" });
        return;
      }
      const uid = user._id?.toString?.() || (user as any).id;
      

      const ban = await ChatPenalty.findOne({ userId: uid, type: "ban" });
      if (ban) {
        socket.emit("chat:error", { code: "BANNED", until: ban.until || null });
        return;
      }
      
  
      const timeout = await ChatPenalty.findOne({ userId: uid, type: "timeout" });
      if (timeout && timeout.until && timeout.until.getTime() > Date.now()) {
        socket.emit("chat:error", { code: "TIMEOUT_UNTIL", until: timeout.until.getTime() });
        return;
      } else if (timeout && timeout.until && timeout.until.getTime() <= Date.now()) {
        await ChatPenalty.deleteOne({ _id: timeout._id });
      }
      
      const clean = (text || "").toString().trim().slice(0, 1000);
      if (!clean) return;
      const message = {
        id: uid,
        username: user.username,
        role: user.role,
        text: clean,
        ts: Date.now(),
      };
      io.emit("chat:new", message);
    } catch (e) {
      socket.emit("chat:error", { code: "INTERNAL_ERROR" });
    }
  });


  socket.on("chat:timeout", async (payload: { userId?: string; minutes?: number }) => {
    try {
      const actor = await getSocketUser(socket);
      if (!actor || !["admin", "seller"].includes((actor as any).role)) return;
      const target = (payload?.userId || "").trim();

      const minutes = Math.max(1/60, Math.min(60 * 24 * 30, Number(payload?.minutes) || 5));
      if (!target) return;
      
      const actorId = actor._id?.toString?.() || (actor as any).id;
      const until = new Date(Date.now() + minutes * 60_000);
      

      await ChatPenalty.deleteMany({ userId: target });
      

      await ChatPenalty.create({ userId: target, type: "timeout", until, createdBy: actorId });
      
      io.emit("chat:mod:timeout", { userId: target, until: until.getTime() });
    } catch {}
  });


  socket.on("chat:ban", async (payload: { userId?: string }) => {
    try {
      const actor = await getSocketUser(socket);
      if (!actor || !["admin", "seller"].includes((actor as any).role)) return;
      const target = (payload?.userId || "").trim();
      if (!target) return;
      
      const actorId = actor._id?.toString?.() || (actor as any).id;
      

      await ChatPenalty.deleteMany({ userId: target });
      
  
      await ChatPenalty.create({ userId: target, type: "ban", createdBy: actorId });
      
      io.emit("chat:mod:ban", { userId: target });
    } catch {}
  });

 
  socket.on("chat:unban", async (payload: { userId?: string }) => {
    try {
      const actor = await getSocketUser(socket);
      if (!actor || !["admin", "seller"].includes((actor as any).role)) return;
      const target = (payload?.userId || "").trim();
      if (!target) return;
      

      await ChatPenalty.deleteMany({ userId: target });
      
      io.emit("chat:mod:unban", { userId: target });
    } catch {}
  });


  socket.on("highlight:select", async (productId: string) => {
    try {
      if (socket.id !== broadcaster) return; 
      const prod = await Product.findById(productId).lean();
      if (!prod) {
        socket.emit("highlight:update", null);
        highlightedProductId = null;
        return;
      }
      highlightedProductId = String(prod._id);
      const summary = {
        id: String(prod._id),
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        currency: prod.currency || 'PLN',
        image: Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : null,
        inStock: prod.stock > 0,
      };
      io.emit("highlight:update", summary);
    } catch (e) {
   
    }
  });

  socket.on("highlight:clear", () => {
    if (socket.id !== broadcaster) return;
    highlightedProductId = null;
    io.emit("highlight:update", null);
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
