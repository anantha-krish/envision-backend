import app from "./src/app";
import { SERVER_PORT } from "./src/config/env";

app.listen(SERVER_PORT, () => {
  console.log(`File service running on port ${SERVER_PORT}`);
});
