import nextEnv from "@next/env";
import { getPool } from "../src/lib/db";
import { deleteRecording } from "../src/lib/recordings/storage";
nextEnv.loadEnvConfig(process.cwd());
const pool = getPool();
try {
  await pool.query(
    "UPDATE sounding_recording SET status='cancelled',updated_at=now() WHERE status='uploading' AND created_at<now()-interval '24 hours'",
  );
  const result = await pool.query(
    "SELECT media_key FROM sounding_recording WHERE status='cancelled' AND updated_at<now()-interval '15 minutes' LIMIT 100",
  );
  let removed = 0;
  for (const row of result.rows) {
    if (!/^recordings\/[a-f0-9-]{36}\/original\.(mp4|webm|mp3|m4a|wav)$/.test(row.media_key))
      continue;
    await deleteRecording(row.media_key);
    removed++;
  }
  console.log(
    `Cancelled or abandoned recording objects cleaned: ${removed}. Audit tombstones retained.`,
  );
} catch {
  console.error("Recording cleanup failed; no private paths or credentials printed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
