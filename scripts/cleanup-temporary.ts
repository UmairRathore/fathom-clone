import nextEnv from "@next/env";
import { getPool } from "../src/lib/db";
import { cleanupTemporaryAccounts } from "../src/lib/temporary-cleanup";
import { del } from "@vercel/blob";
nextEnv.loadEnvConfig(process.cwd());
const pool = getPool();
try {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error();
  const result = await cleanupTemporaryAccounts(pool, async (keys) => {
    await del(keys);
  });
  console.log(JSON.stringify(result));
  if (result.failed) process.exitCode = 1;
} catch {
  console.error("Temporary cleanup could not complete. No private details printed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
