import dotenv from "dotenv";
dotenv.config();
import app from "./src/app";

const PORT = process.env.SERVER_PORT || 8080;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
