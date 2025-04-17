import { createServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { WS_SERVER_PORT } from "./src/config";

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

const clients = new Map<number, Socket>();

io.on("connection", (socket) => {
  const token = socket.handshake.query.token as string;

  if (!token) {
    console.log("❌ Connection rejected: Missing token.");
    socket.disconnect(true);
    return;
  }

  try {
    const secretKey = process.env.ACCESS_TOKEN_SECRET || "my_secret";
    const payload = jwt.verify(token, secretKey) as { user_id: number };

    const userId = payload.user_id;
    console.log(`✅ Token verified for user: ${userId}`);

    clients.set(userId, socket);
    console.log("Current connected clients:", [...clients.keys()]);

    socket.on("disconnect", () => {
      clients.delete(userId);
      console.log(`User ${userId} disconnected.`);
    });
  } catch (error) {
    console.error("❌ Invalid token, disconnecting socket.", error);
    socket.disconnect(true);
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log("🛑 Shutting down WebSocket server...");

  clients.forEach((socket) => socket.disconnect(true));
  clients.clear();

  io.close(() => console.log("✅ WebSocket server closed."));
  httpServer.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚡ Force closing WebSocket server...");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

httpServer.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❗ Port ${WS_SERVER_PORT} is already in use. Retrying...`);
    setTimeout(() => {
      httpServer.close();
      httpServer.listen(WS_SERVER_PORT);
    }, 3000);
  } else {
    console.error("❗ Server error:", err);
  }
});

httpServer.listen(WS_SERVER_PORT, () => {
  console.log(`🚀 WebSocket server running on port ${WS_SERVER_PORT}`);
});

// Notification function with acknowledgment
export const notifyClient = (
  userId: number,
  notification: { type: string; payload: any }
) => {
  const socket = clients.get(userId);

  if (socket) {
    socket.emit("notification_event", notification, (ack: any) => {
      console.log(`📨 Notification sent to ${userId}. Ack:`, ack);
    });
  } else {
    console.warn(`⚠️ User ${userId} is not connected. Notification not sent.`);
  }
};
