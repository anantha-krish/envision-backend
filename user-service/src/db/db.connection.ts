import { NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DB_URL } from "../config";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: DB_URL,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
