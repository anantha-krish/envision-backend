import express, { Request, Response, NextFunction } from "express";
import {
  clearCacheHandler,
  getConfigHandler,
  updateGlobalConfigHandler,
  updateServiceConfigHandler,
} from "./src/configController";
import { SERVER_PORT } from "./src/env";
import { getCachedConfig, registerService } from "./src/redis_client";

const app = express();
app.use(express.json());

export const checkCache = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceName = req.params.service;

    // 🔹 Fetch service-specific and global config together
    const [serviceConfig, globalConfig] = await Promise.all([
      getCachedConfig(serviceName),
      getCachedConfig("global"),
    ]);
    // Merge service-specific config with global config
    const mergedConfig = {
      ...(serviceConfig && JSON.parse(serviceConfig)),
      ...(globalConfig && JSON.parse(globalConfig)),
    };

    if (serviceConfig && globalConfig) {
      console.log(`✅ Cache hit for ${serviceName} and global config`);

      res.json(mergedConfig);
      return;
    }

    // Pass the merged config to the next handler
    res.locals.serviceConfig = mergedConfig.serviceConfig;
    res.locals.globalConfig = mergedConfig.globalConfig;
    console.log(`⚠️ Cache miss for ${serviceName}, fetching from file...`);
    next();
  } catch (error) {
    console.error("❌ Error checking cache:", error);
    next(); // Continue if Redis fails
  }
};

registerService();
// Register every 30 seconds to ensure availability
setInterval(registerService, 30000);
app.put("/api/global", updateGlobalConfigHandler);
app
  .get("/api/:service", checkCache, getConfigHandler)
  .put("/api/:service", updateServiceConfigHandler);

app.delete("/api/:service/cache", clearCacheHandler);

// Health Check
app.get("/", (req, res) => {
  res.send("Config Service is running...");
});

// Start Server
app.listen(SERVER_PORT, () => {
  console.log(`Config Service running on port ${SERVER_PORT}`);
});
