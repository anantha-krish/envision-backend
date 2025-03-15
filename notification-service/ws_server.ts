import { createServer } from "http";
import { Server } from "socket.io";
import { getUnreadCount } from "./src/redis_client";
import { WS_SERVER_PORT } from "./src/config";

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

const clients = new Map<string, any>();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (userId) {
    clients.set(userId, socket);
    console.log(`User ${userId} connected.`);
  }

  socket.on("disconnect", () => {
    if (userId) {
      clients.delete(userId);
      console.log(`User ${userId} disconnected.`);
    }
  });
});

// 🔴 Handle process termination (CTRL+C or Docker/PM2 restart)
const shutdown = () => {
  console.log("Shutting down WebSocket server...");

  io.close(() => {
    console.log("WebSocket server closed.");
  });

  httpServer.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force close after 5 seconds if not closed properly
  setTimeout(() => {
    console.error("Forcing shutdown...");
    process.exit(1);
  }, 5000);
};

// ✅ Listen for shutdown signals
process.on("SIGINT", shutdown); // CTRL+C (local)
process.on("SIGTERM", shutdown); // Docker/PM2 stop

httpServer.listen(WS_SERVER_PORT, () => {
  console.log(`WebSocket server running on port ${WS_SERVER_PORT}`);
});

// Handle errors (like port in use)
httpServer.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${WS_SERVER_PORT} is already in use. Retrying...`);
    setTimeout(() => {
      httpServer.close();
      httpServer.listen(WS_SERVER_PORT);
    }, 3000);
  } else {
    console.error("Server error:", err);
  }
});

// Shutdown handler
process.on("SIGINT", () => {
  console.log("Shutting down WebSocket server...");
  io.close(() => {
    console.log("WebSocket server closed.");
    process.exit(0);
  });
});

export const notifyClient = (userId: string, notification: any) => {
  if (clients.has(userId)) {
    clients.get(userId).emit("notification", notification);
  }
};
