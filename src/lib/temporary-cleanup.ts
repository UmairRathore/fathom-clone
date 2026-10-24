import type { Pool } from "pg";
/** Durable expiry cleanup; storage deletion is retried before any credential/data deletion. */
export async function cleanupTemporaryAccounts(
  pool: Pool,
  remove: (keys: string[]) => Promise<void>,
  limit = 50,
) {
  await pool.query(`INSERT INTO sounding_temporary_cleanup(user_id,object_keys)
    SELECT t.user_id,coalesce((SELECT jsonb_agg(k) FROM (
      SELECT media_key AS k FROM sounding_recording WHERE owner_id=t.user_id
      UNION SELECT coalesce(g.media_key,'clips/'||g.id||'.wav') AS k FROM sounding_clip_share g JOIN sounding_workspace w ON w.id=g.workspace_id WHERE w.owner_id=t.user_id
    ) objects),'[]'::jsonb) FROM sounding_temporary_account t WHERE t.expires_at<=now()-interval '15 minutes'
    ON CONFLICT(user_id) DO NOTHING`);
  let completed = 0,
    failed = 0;
  for (let i = 0; i < limit; i++) {
    const job = (
      await pool.query(`UPDATE sounding_temporary_cleanup SET lease_until=now()+interval '5 minutes',attempts=attempts+1
      WHERE user_id=(SELECT user_id FROM sounding_temporary_cleanup WHERE next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING *`)
    ).rows[0];
    if (!job) break;
    try {
      // Permanent-account IDs can never be processed, even if a cleanup row were misqueued.
      const permanent = await pool.query(
        'SELECT 1 FROM "user" u WHERE u.id=$1 AND NOT EXISTS(SELECT 1 FROM sounding_temporary_account t WHERE t.user_id=u.id AND t.expires_at<=now())',
        [job.user_id],
      );
      if (permanent.rowCount) throw new Error();
      const keys = job.object_keys as string[];
      if (
        !Array.isArray(keys) ||
        keys.some(
          (k) =>
            typeof k !== "string" ||
            !/^((recordings\/[a-f0-9-]{36}\/original\.(mp4|webm|mp3|m4a|wav))|(clips\/[a-f0-9-]{36}\.wav))$/.test(
              k,
            ),
        )
      )
        throw new Error();
      if (keys.length) await remove(keys);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "UPDATE sounding_ai_budget SET approved_recording_id=null WHERE approved_recording_id IN (SELECT id FROM sounding_recording WHERE owner_id=$1)",
          [job.user_id],
        );
        await client.query(
          "DELETE FROM sounding_ai_request WHERE recording_id IN (SELECT id FROM sounding_recording WHERE owner_id=$1)",
          [job.user_id],
        );
        await client.query(
          'DELETE FROM "user" WHERE id=$1 AND EXISTS(SELECT 1 FROM sounding_temporary_account WHERE user_id=$1 AND expires_at<=now())',
          [job.user_id],
        );
        // Keep a short object-only tombstone and re-delete to cover late in-flight uploads.
        if (job.purge_after && new Date(job.purge_after).getTime() <= Date.now())
          await client.query("DELETE FROM sounding_temporary_cleanup WHERE user_id=$1", [
            job.user_id,
          ]);
        else
          await client.query(
            "UPDATE sounding_temporary_cleanup SET purge_after=coalesce(purge_after,now()+interval '48 hours'),next_attempt_at=now()+interval '24 hours',lease_until=null,last_error=null WHERE user_id=$1",
            [job.user_id],
          );
        await client.query("COMMIT");
      } catch {
        await client.query("ROLLBACK");
        throw new Error();
      } finally {
        client.release();
      }
      completed++;
    } catch {
      await pool.query(
        "UPDATE sounding_temporary_cleanup SET lease_until=null,next_attempt_at=now()+interval '1 hour',last_error='cleanup_retry_required' WHERE user_id=$1",
        [job.user_id],
      );
      failed++;
    }
  }
  await pool.query("DELETE FROM sounding_registration_quota WHERE bucket<now()-interval '2 days'");
  return { completed, failed };
}
