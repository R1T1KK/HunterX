import express, { Request, Response, NextFunction } from "express";
import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { env } from "./config/env.js";
import { HealthResponse } from "./types/index.js";
import { registerRoomHandlers } from "./socket/roomGateway.js";

export const app = express();
export const server = http.createServer(app);

// Configure CORS
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In development or when origin is undefined (mobile apps, curl), allow
    if (!origin || env.NODE_ENV === "development") {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.IO
export const io = new SocketIOServer(server, {
  cors: {
    origin: (_origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket connection gateway
io.on("connection", (socket) => {
  console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);
  registerRoomHandlers(io, socket);
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response<HealthResponse>) => {
  res.status(200).json({
    status: "ok",
    service: "hiderush-server",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested route does not exist.",
    },
  });
});

// Central error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("💥 Unhandled Error:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
  });
});

// Graceful shutdown
let isShuttingDown = false;

export function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`🛑 Received ${signal}. Gracefully shutting down HIDERUSH backend...`);

  io.close(() => {
    console.log("🔒 Closed all Socket.IO connections.");
    server.close(() => {
      console.log("🔒 HTTP server closed.");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("⚠️ Forced shutdown after 10s timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server if executed directly
if (process.env.NODE_ENV !== "test") {
  server.listen(env.PORT, () => {
    console.log(`🚀 [HIDERUSH Server] Running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
    console.log(`🔌 [HIDERUSH Socket.IO] Ready for connections on port ${env.PORT}`);
  });
}
