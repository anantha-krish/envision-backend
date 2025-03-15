import { createServer } from "http";
import { Server } from "socket.io";
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

// 🔴 Forcefully Close All Connections on Shutdown
const shutdown = () => {
  console.log("Shutting down WebSocket server...");

  // Close all WebSocket connections
  clients.forEach((socket) => socket.disconnect(true));
  clients.clear();

  // Close WebSocket server
  io.close(() => {
    console.log("WebSocket server closed.");
  });

  // Close HTTP server
  httpServer.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force shutdown if not closed properly
  setTimeout(() => {
    console.error("Force closing WebSocket server...");
    process.exit(1);
  }, 5000);
};

// ✅ Listen for shutdown signals
process.on("SIGINT", shutdown); // CTRL+C (local)
process.on("SIGTERM", shutdown); // Docker/PM2 stop

// ✅ Handle errors (like port already in use)
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

httpServer.listen(WS_SERVER_PORT, () => {
  console.log(`WebSocket server running on port ${WS_SERVER_PORT}`);
});

// 🔔 Send notifications
export const notifyClient = (userId: string, notification: any) => {
  if (clients.has(userId)) {
    clients.get(userId).emit("notification", notification);
  }
};
