import nextEnv from "@next/env";
import { Pool } from "pg";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  // Expired sessions cascade to their demo workspaces; private user workspaces remain.
  await pool.query('DELETE FROM session WHERE "expiresAt"<now()');
  await pool.query('DELETE FROM verification WHERE "expiresAt"<now()');
  await pool.query("DELETE FROM sounding_demo_quota WHERE bucket<now()-interval '1 day'");
  console.log("Expired authentication and demo data cleaned. Private account data preserved.");
} finally {
  await pool.end();
}
