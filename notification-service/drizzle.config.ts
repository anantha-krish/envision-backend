import { defineConfig } from "drizzle-kit";
import { DB_URL } from "./src/config.ts";

export const db = defineConfig({
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "postgresql",
  verbose: true,
  dbCredentials: {
    url: DB_URL,
  },
  strict: true,
});
