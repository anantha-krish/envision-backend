import { Server } from "socket.io";
import { getUnreadCount } from "./src/redis_client";
import { WS_SERVER_PORT } from "./src/config";

const io = new Server(WS_SERVER_PORT, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("subscribe", async (userId) => {
    socket.join(userId);
    const unread = await getUnreadCount(userId);
    socket.emit("unreadCount", unread || 0);
  });

  socket.on("disconnect", () => console.log("User disconnected"));
});

export default io;
