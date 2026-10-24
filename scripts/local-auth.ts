import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { migrate, seedDemo } from "./auth-db";
// Local-only PostgreSQL engine; never used on Vercel or as a hosted persistence substitute.
if (!existsSync(".env.auth.local"))
  await writeFile(
    ".env.auth.local",
    `BETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\nBETTER_AUTH_URL=http://localhost:3002\nDEMO_EMAIL=demo@sounding.example\nDEMO_PASSWORD=${randomBytes(24).toString("base64url")}\n`,
    { mode: 0o600, flag: "wx" },
  );
const local = await readFile(".env.auth.local", "utf8");
for (const line of local.split("\n")) {
  const at = line.indexOf("=");
  if (at > 0) process.env[line.slice(0, at)] = line.slice(at + 1);
}
const db = await PGlite.create(".local-postgres");
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 55432,
  inspect: false,
  debug: false,
  maxConnections: 16,
});
await server.start();
process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:55432/postgres";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 100,
});
await migrate(pool);
await seedDemo(pool, process.env.DEMO_EMAIL!, process.env.DEMO_PASSWORD!);
await pool.end();
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    process.argv.includes("--production") ? "start" : "dev",
    "--hostname",
    "0.0.0.0",
    "--port",
    "3002",
  ],
  { stdio: "inherit", env: process.env },
);
const stop = async () => {
  child.kill("SIGTERM");
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", () => {
  void stop();
});
