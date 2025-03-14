import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";
import {
  cacheConfig,
  deleteCache,
  notifyServicesForConfigUpdate,
  updateCacheConfig,
  REDIS_URL,
} from "./redis_client";

const ENV = process.env.NODE_ENV || "development";
const CONFIG_PATH = path.resolve(__dirname, `../configs/${ENV}.json`);

let globalConfig: Record<string, any> | null = null;

const loadConfig = (
  serviceName?: string,
  cachedObj?: Record<string, any>
): Record<string, any> => {
  if (serviceName && cachedObj?.[serviceName]) {
    return { [serviceName]: cachedObj[serviceName], global: globalConfig };
  }

  if (serviceName == "global" && cachedObj?.global) {
    return { global: cachedObj.global };
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config file ${CONFIG_PATH} not found.`);
    return {};
  }

  const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

  // Load & cache global config once
  if (!globalConfig) {
    globalConfig = {
      kafka: configData["kafka"] || {},
      redis: { url: configData["redis"] || REDIS_URL },
    };
  }

  if (serviceName) {
    return {
      [serviceName]: configData[serviceName] || {},
      global: globalConfig,
    };
  }

  return { global: globalConfig };
};

// **GET Config API (Service-Specific or Global)**
export const getConfigHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceName = req.params.service;
    var cachedObj = res.locals;
    const config = loadConfig(serviceName, cachedObj);

    if (!config) {
      res.status(404).json({ error: "Configuration not found" });
      return;
    }

    if (serviceName) {
      // Cache only service-specific config (not global)
      await cacheConfig(serviceName, { [serviceName]: config[serviceName] });
    } else {
      // Cache global config separately
      await cacheConfig("global", { global: config.global });
    }

    res.json(config);
  } catch (error) {
    next(error);
    console.error("❌ Error fetching config:", error);
  }
};

// **UPDATE Service-Specific Config API**
export const updateServiceConfigHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const serviceName = req.params.service;
    const newConfig = req.body;

    if (!newConfig) {
      res.status(400).json({ error: "Invalid configuration data" });
      return;
    }

    // Read existing config
    const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

    // Update only service-specific config
    configData[serviceName] = { ...configData[serviceName], ...newConfig };

    // Save updated config
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));

    // Update Redis Cache
    await updateCacheConfig(serviceName, {
      [serviceName]: configData[serviceName],
    });

    // Notify other services about config update
    await notifyServicesForConfigUpdate(serviceName);

    res.json({ message: `${serviceName} configuration updated successfully` });
  } catch (error) {
    console.error("❌ Error updating service config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// **UPDATE Global Config API**
export const updateGlobalConfigHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const newGlobalConfig = req.body;

    if (!newGlobalConfig) {
      res.status(400).json({ error: "Invalid global configuration data" });
      return;
    }

    // Read existing config
    const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

    // Update only global config
    configData["kafka"] = newGlobalConfig.kafka || configData["kafka"];
    configData["redis"] = newGlobalConfig.redis || configData["redis"];

    // Save updated config
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));

    // Update in-memory cache
    globalConfig = {
      kafka: configData["kafka"],
      redis: configData["redis"],
    };

    // Update Redis Cache for global config
    await updateCacheConfig("global", { global: globalConfig });

    // Notify all services about global config update
    await notifyServicesForConfigUpdate("global");

    res.json({ message: "Global configuration updated successfully" });
  } catch (error) {
    console.error("❌ Error updating global config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// **CLEAR Cache API**
export const clearCacheHandler = async (req: Request, res: Response) => {
  try {
    const serviceName = req.params.service || "global";
    await deleteCache(serviceName);
    res.json({ message: `Cache cleared for ${serviceName}` });
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
