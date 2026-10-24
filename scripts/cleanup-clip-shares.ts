import nextEnv from "@next/env";
import { Pool } from "pg";
import { deleteRecording } from "../src/lib/recordings/storage";
nextEnv.loadEnvConfig(process.cwd());
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let cleaned = 0;
try {
  const rows = (
    await pool.query(
      "SELECT id,media_key FROM sounding_clip_share WHERE media_key LIKE 'clips/%' AND (revoked_at IS NOT NULL OR expires_at<=now() OR status='failed')",
    )
  ).rows;
  for (const row of rows) {
    if (typeof row.media_key !== "string" || !row.media_key.startsWith("clips/")) continue;
    await deleteRecording(row.media_key);
    await pool.query("UPDATE sounding_clip_share SET media_key=NULL WHERE id=$1", [row.id]);
    cleaned++;
  }
  console.log(
    cleaned +
      " inaccessible derived clip artifacts cleaned. Original recordings were not selected.",
  );
} finally {
  await pool.end();
}
