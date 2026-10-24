import nextEnv from "@next/env";
import { Pool } from "pg";
import { migrate, seedDemo } from "./auth-db";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in the ignored environment file.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await migrate(pool);
  if (process.env.DEMO_PASSWORD)
    await seedDemo(
      pool,
      process.env.DEMO_EMAIL ?? "demo@sounding.example",
      process.env.DEMO_PASSWORD,
    );
  console.log("Authentication schema, workspace migrations and configured demo account verified.");
} finally {
  await pool.end();
}
