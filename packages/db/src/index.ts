import { config } from "dotenv";
import { resolve } from "path";
// Load root .env — works whether cwd is root or a package subdirectory
config({ path: resolve(__dirname, "../../../.env") });
config(); // fallback to cwd/.env for Docker/production
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL!;

const queryClient = postgres(connectionString, {
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

export * from "./schema.js";
