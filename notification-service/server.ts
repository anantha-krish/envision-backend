import app from "./src/app";
import { SERVER_PORT } from "./src/config";
import { notifyClient } from "./ws_server";

app.listen(SERVER_PORT, () => {
  console.log(`Notification-service running on port ${SERVER_PORT}`);
});
