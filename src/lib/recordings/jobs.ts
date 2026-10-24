import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Owner } from "../workspace-store";
import { workspaceKey } from "../workspace-store";
import { defaultState } from "../state";
import { uploadSchema, ProcessingError, type Transcription, type Analysis } from "./schema";
import { inspectRecording } from "./media";
import { processedMeeting } from "./meeting";
import { validateEvidence, type AIProvider } from "./ai";
export type RecordingJob = {
  id: string;
  owner_id: string;
  workspace_id: string;
  title: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  media_key: string;
  media_duration: number;
  media_type: "audio" | "video";
  status: string;
  transcript: Transcription | null;
  analysis: Analysis | null;
  error_code: string | null;
  retryable: boolean;
  transcription_attempts: number;
  analysis_attempts: number;
  lease_until: Date | null;
  run_id: string | null;
  created_at: Date;
  completed_at: Date | null;
};
export function jobView(job: RecordingJob) {
  return {
    id: job.id,
    title: job.title,
    filename: job.filename,
    size: job.size_bytes,
    duration: job.media_duration,
    status: job.status,
    error: job.error_code,
    retryable: job.retryable,
    createdAt: job.created_at,
    completedAt: job.completed_at,
  };
}
export async function getRecording(
  pool: Pool,
  owner: Owner,
  id: string,
): Promise<RecordingJob | null> {
  if (owner.demo) return null;
  const result = await pool.query(
    `SELECT r.* FROM sounding_recording r JOIN session s ON s.id=$2 AND s."userId"=r.owner_id AND s."expiresAt">now() AND sounding_account_active(s."userId") WHERE r.id=$1 AND r.owner_id=$3 AND r.status <> 'cancelled'`,
    [id, owner.sessionId, owner.userId],
  );
  return result.rows[0] ?? null;
}
export async function listRecordings(pool: Pool, owner: Owner): Promise<RecordingJob[]> {
  if (owner.demo) return [];
  return (
    await pool.query(
      `SELECT r.* FROM sounding_recording r JOIN session s ON s.id=$1 AND s."userId"=r.owner_id AND s."expiresAt">now() AND sounding_account_active(s."userId") WHERE r.owner_id=$2 AND r.status <> 'cancelled' ORDER BY r.created_at DESC LIMIT 30`,
      [owner.sessionId, owner.userId],
    )
  ).rows;
}
export async function createRecording(
  pool: Pool,
  owner: Owner,
  value: unknown,
): Promise<RecordingJob> {
  if (owner.demo) throw new ProcessingError("private_account_required");
  const parsed = uploadSchema.safeParse(value);
  if (!parsed.success) throw new ProcessingError("invalid_upload");
  const file = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [owner.userId]);
    const session = await client.query(
      'SELECT id FROM session WHERE id=$1 AND "userId"=$2 AND "expiresAt">now() AND sounding_account_active("userId")',
      [owner.sessionId, owner.userId],
    );
    if (!session.rowCount) throw new ProcessingError("unauthorized");
    const exists = await client.query(
      "SELECT * FROM sounding_recording WHERE owner_id=$1 AND request_key=$2",
      [owner.userId, file.requestKey],
    );
    if (exists.rowCount) {
      await client.query("COMMIT");
      return exists.rows[0];
    }
    const quota = await client.query(
      "SELECT count(*)::int AS count FROM sounding_recording WHERE owner_id=$1 AND created_at > now()-interval '24 hours'",
      [owner.userId],
    );
    if (quota.rows[0].count >= 3) throw new ProcessingError("user_upload_limit");
    const id = randomUUID(),
      extension = file.filename.split(".").at(-1)!.toLowerCase();
    const result = await client.query(
      `INSERT INTO sounding_recording(id,owner_id,workspace_id,request_key,title,filename,mime_type,size_bytes,media_key,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'uploading') RETURNING *`,
      [
        id,
        owner.userId,
        workspaceKey(owner),
        file.requestKey,
        file.title,
        file.filename,
        file.mime,
        file.size,
        `recordings/${id}/original.${extension}`,
      ],
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function completeRecording(
  pool: Pool,
  owner: Owner,
  id: string,
  read: (key: string) => Promise<Uint8Array>,
) {
  const job = await getRecording(pool, owner, id);
  if (!job) throw new ProcessingError("not_found");
  if (job.status !== "uploading") return job;
  const bytes = await read(job.media_key);
  if (bytes.length !== job.size_bytes) throw new ProcessingError("size_mismatch");
  const media = await inspectRecording(bytes);
  const sha = createHash("sha256").update(bytes).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [owner.userId]);
    const existing = await client.query(
      "SELECT * FROM sounding_recording WHERE owner_id=$1 AND sha256=$2 AND status <> 'cancelled'",
      [owner.userId, sha],
    );
    if (existing.rowCount) {
      if (existing.rows[0].id === id) {
        await client.query("COMMIT");
        return existing.rows[0] as RecordingJob;
      }
      await client.query(
        "UPDATE sounding_recording SET status='cancelled',updated_at=now() WHERE id=$1 AND owner_id=$2",
        [id, owner.userId],
      );
      await client.query("COMMIT");
      return existing.rows[0] as RecordingJob;
    }
    const result = await client.query(
      `UPDATE sounding_recording SET status='uploaded',sha256=$1,media_duration=$2,media_type=$3,updated_at=now() WHERE id=$4 AND owner_id=$5 AND status='uploading' RETURNING *`,
      [sha, media.duration, media.mediaType, id, owner.userId],
    );
    await client.query("COMMIT");
    return result.rows[0] ?? (await getRecording(pool, owner, id));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function processRecording(
  pool: Pool,
  owner: Owner,
  id: string,
  provider: AIProvider,
  read: (key: string) => Promise<Uint8Array>,
  options: { approved: boolean; retryApproved?: boolean },
) {
  let job = await getRecording(pool, owner, id);
  if (!job) throw new ProcessingError("not_found");
  if (job.status === "ready") return job;
  if (job.lease_until) {
    if (new Date(job.lease_until).getTime() > Date.now()) return job;
    await pool.query(
      "UPDATE sounding_recording SET status='failed',error_code='provider_request_uncertain',retryable=false,lease_until=null WHERE id=$1 AND owner_id=$2",
      [id, owner.userId],
    );
    return (await getRecording(pool, owner, id))!;
  }
  if (!options.approved) throw new ProcessingError("spending_approval_required");
  if (job.status === "failed") {
    if (
      !options.retryApproved ||
      !job.retryable ||
      job.analysis_attempts >= 2 ||
      job.transcription_attempts >= 2
    )
      throw new ProcessingError("retry_approval_required");
    await pool.query(
      "UPDATE sounding_recording SET status=$1,error_code=null,retryable=false WHERE id=$2 AND owner_id=$3 AND status='failed'",
      [job.transcript ? "generating_insights" : "queued", id, owner.userId],
    );
    job = (await getRecording(pool, owner, id))!;
  }
  if (job.status === "uploaded") {
    await pool.query(
      "UPDATE sounding_recording SET status='queued',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='uploaded'",
      [id, owner.userId],
    );
    return (await getRecording(pool, owner, id))!;
  }
  const transcribing = job.status === "queued";
  if (!transcribing && job.status !== "generating_insights") return job;
  const run = randomUUID();
  const claimed = await pool.query(
    `UPDATE sounding_recording SET status=$1,run_id=$2,lease_until=now()+interval '260 seconds',updated_at=now(),transcription_attempts=transcription_attempts+$3,analysis_attempts=analysis_attempts+$4 WHERE id=$5 AND owner_id=$6 AND status=$7 AND lease_until IS NULL RETURNING *`,
    [
      transcribing ? "transcribing" : "generating_insights",
      run,
      transcribing ? 1 : 0,
      transcribing ? 0 : 1,
      id,
      owner.userId,
      job.status,
    ],
  );
  if (!claimed.rowCount) return (await getRecording(pool, owner, id))!;
  job = claimed.rows[0];
  try {
    if (transcribing) {
      const transcript = await provider.transcribe(
        await read(job!.media_key),
        job!.filename,
        job!.mime_type,
        job!.media_duration,
      );
      await pool.query(
        "UPDATE sounding_recording SET transcript=$1::jsonb,status='generating_insights',lease_until=null,updated_at=now() WHERE id=$2 AND run_id=$3 AND status='transcribing'",
        [JSON.stringify(transcript), id, run],
      );
    } else {
      if (!job!.transcript) throw new ProcessingError("transcript_missing");
      const analysis = validateEvidence(await provider.analyze(job!.transcript), job!.transcript);
      const meeting = processedMeeting(job!, job!.transcript, analysis);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const locked = await client.query(
          "SELECT id FROM sounding_recording WHERE id=$1 AND run_id=$2 AND status='generating_insights' FOR UPDATE",
          [id, run],
        );
        if (!locked.rowCount) throw new ProcessingError("processing_conflict");
        await client.query(
          "INSERT INTO sounding_meeting(workspace_id,id,meeting,state) VALUES($1,$2,$3::jsonb,$4::jsonb) ON CONFLICT DO NOTHING",
          [job!.workspace_id, id, JSON.stringify(meeting), JSON.stringify(defaultState(meeting))],
        );
        await client.query(
          "UPDATE sounding_recording SET analysis=$1::jsonb,status='ready',lease_until=null,completed_at=now(),updated_at=now(),error_code=null WHERE id=$2 AND run_id=$3",
          [JSON.stringify(analysis), id, run],
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
  } catch (e) {
    const error = e instanceof ProcessingError ? e : new ProcessingError("processing_failed");
    await pool.query(
      "UPDATE sounding_recording SET status='failed',error_code=$1,retryable=$2,lease_until=null,updated_at=now() WHERE id=$3 AND run_id=$4 AND status IN ('transcribing','generating_insights')",
      [
        error.code,
        error.retryable ||
          (!transcribing &&
            [
              "invalid_analysis",
              "unsupported_evidence",
              "unsupported_action_detail",
              "analysis_incomplete",
            ].includes(error.code)),
        id,
        run,
      ],
    );
  }
  return (await getRecording(pool, owner, id))!;
}
export async function cancelRecording(pool: Pool, owner: Owner, id: string) {
  const job = await getRecording(pool, owner, id);
  if (!job) throw new ProcessingError("not_found");
  if (job.lease_until) throw new ProcessingError("processing_active");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query(
      "UPDATE sounding_recording SET status='cancelled',updated_at=now() WHERE id=$1 AND owner_id=$2 AND lease_until IS NULL RETURNING id",
      [id, owner.userId],
    );
    if (!deleted.rowCount) throw new ProcessingError("processing_active");
    await client.query("DELETE FROM sounding_meeting WHERE workspace_id=$1 AND id=$2", [
      job.workspace_id,
      id,
    ]);
    await client.query("COMMIT");
    return job.media_key;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
