import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import type { Meeting, Participant, Segment } from "./domain";
import { clipSchema, validClip, type Clip } from "./journey";
import { getOwnedMeeting, workspaceKey, type Owner } from "./workspace-store";
import { SHARE_TTL } from "./sharing";
export const MAX_CLIP_SECONDS = 120;
export const guestClipSchema = z.object({
  title: z.string(),
  meetingTitle: z.string(),
  clip: clipSchema,
  participants: z.array(
    z.object({ id: z.string(), name: z.string(), role: z.string(), color: z.string() }),
  ),
  segments: z.array(
    z.object({
      id: z.string(),
      speakerId: z.string(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
    }),
  ),
  fictional: z.boolean(),
  hasAudio: z.boolean(),
  expiresAt: z.number(),
});
export type GuestClip = z.infer<typeof guestClipSchema>;
export class ClipError extends Error {}
export function clipToken(id: string, secret = process.env.SHARE_SECRET ?? "") {
  if (secret.length < 32) throw new ClipError("Sharing is not configured.");
  return (
    "v2." +
    createHmac("sha256", secret)
      .update("clip-grant:" + id)
      .digest("base64url")
  );
}
const sameClip = (a: Clip, b: Clip) =>
  a.id === b.id && a.title === b.title && a.start === b.start && a.end === b.end;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export function guestView(meeting: Meeting, clip: Clip, expiresAt: number): GuestClip {
  // Partial utterance text cannot safely be cut without word timestamps. Never disclose it.
  const inside = meeting.segments.filter((s) => s.start >= clip.start && s.end <= clip.end);
  const voices = [...new Set(inside.map((s) => s.speakerId))];
  const participants: Participant[] = voices.map((id, i) => ({
    id: `voice-${i + 1}`,
    name: meeting.participants.find((p) => p.id === id)?.name ?? "Unknown speaker",
    role: "",
    color: "#2563a6",
  }));
  const segments: Segment[] = inside.map((s, i) => ({
    ...s,
    id: `utterance-${i + 1}`,
    speakerId: participants[voices.indexOf(s.speakerId)].id,
  }));
  return {
    title: clip.title,
    meetingTitle: meeting.title,
    clip: { ...clip, id: "shared-clip" },
    participants,
    segments,
    fictional: meeting.source !== "upload",
    hasAudio: !!meeting.mediaUrl,
    expiresAt,
  };
}
type Grant = {
  id: string;
  clip: Clip;
  view: GuestClip;
  status: string;
  media_key: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  token_hash: string;
};
export function grantLink(grant: Pick<Grant, "id" | "expires_at">) {
  const path = `/share/${clipToken(grant.id)}`;
  const origin = process.env.CLIP_SHARE_ORIGIN?.replace(/\/$/, "");
  if (origin && !/^https:\/\/[a-z0-9.-]+$/i.test(origin))
    throw new ClipError("Invalid clip viewer configuration.");
  return {
    path,
    url: origin ? origin + path : undefined,
    expiresAt: new Date(grant.expires_at).getTime(),
  };
}
export async function listClipShares(pool: Pool, owner: Owner, meetingId: string) {
  if (!(await getOwnedMeeting(pool, owner, meetingId))) throw new ClipError("Meeting not found.");
  const rows = (
    await pool.query(
      `SELECT id,clip_id,status,expires_at,revoked_at FROM sounding_clip_share WHERE workspace_id=$1 AND meeting_id=$2 ORDER BY created_at DESC`,
      [workspaceKey(owner), meetingId],
    )
  ).rows;
  return rows.map((g) => ({
    clipId: g.clip_id,
    active: g.status === "ready" && !g.revoked_at && new Date(g.expires_at).getTime() > Date.now(),
    ...(!g.revoked_at && g.status === "ready" && new Date(g.expires_at).getTime() > Date.now()
      ? grantLink(g)
      : { expiresAt: new Date(g.expires_at).getTime() }),
  }));
}
export async function revokeClipShares(
  pool: Pool,
  owner: Owner,
  meetingId: string,
  clipId: string,
) {
  if (!(await getOwnedMeeting(pool, owner, meetingId))) throw new ClipError("Meeting not found.");
  const result = await pool.query(
    `UPDATE sounding_clip_share SET revoked_at=now() WHERE workspace_id=$1 AND meeting_id=$2 AND clip_id=$3 AND revoked_at IS NULL RETURNING media_key`,
    [workspaceKey(owner), meetingId, clipId],
  );
  return result.rows
    .map((row) => row.media_key)
    .filter((key): key is string => typeof key === "string" && key.startsWith("clips/"));
}
export async function createClipShare(
  pool: Pool,
  owner: Owner,
  meetingId: string,
  input: unknown,
  prepare: (meeting: Meeting, clip: Clip, grantId: string) => Promise<string | null>,
  cleanup: (key: string) => Promise<void>,
) {
  const parsed = clipSchema.safeParse(input);
  if (!parsed.success) throw new ClipError("Invalid clip.");
  const client = await pool.connect();
  let grant: Grant;
  let meeting: Meeting;
  let clip: Clip;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [workspaceKey(owner)]);
    const saved = await getOwnedMeeting(client, owner, meetingId);
    if (!saved) throw new ClipError("Meeting not found.");
    meeting = saved.meeting;
    const persisted = saved.state.clips?.find((c) => c.id === parsed.data.id);
    if (!persisted || !sameClip(persisted, parsed.data))
      throw new ClipError("Save the clip before sharing it.");
    clip = persisted;
    if (
      !validClip(clip, meeting) ||
      clip.end - clip.start > MAX_CLIP_SECONDS ||
      clip.end - clip.start < 0.1 - 1e-9
    )
      throw new ClipError("Clips must be between 0.1 and 120 seconds within the recording.");
    if (meeting.source === "upload") {
      const ready = await client.query(
        `SELECT 1 FROM sounding_recording WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND status='ready'`,
        [meetingId, owner.userId, workspaceKey(owner)],
      );
      if (owner.demo || !ready.rowCount) throw new ClipError("Recording is unavailable.");
    }
    await client.query(
      `UPDATE sounding_clip_share SET revoked_at=now() WHERE workspace_id=$1 AND meeting_id=$2 AND clip_id=$3 AND (expires_at<=now() OR (status='preparing' AND created_at<now()-interval '2 minutes'))`,
      [workspaceKey(owner), meetingId, clip.id],
    );
    const active = (
      await client.query(
        `SELECT * FROM sounding_clip_share WHERE workspace_id=$1 AND meeting_id=$2 AND clip_id=$3 AND revoked_at IS NULL AND status IN ('preparing','ready')`,
        [workspaceKey(owner), meetingId, clip.id],
      )
    ).rows[0] as Grant | undefined;
    if (active && sameClip(active.clip, clip)) {
      if (active.status !== "ready")
        throw new ClipError("Clip preparation is in progress. Try again shortly.");
      // Rotation invalidates old tokens; a new explicit share can issue a replacement.
      if (active.token_hash === digest(clipToken(active.id))) {
        await client.query("COMMIT");
        return grantLink(active);
      }
    }
    if (active)
      await client.query("UPDATE sounding_clip_share SET revoked_at=now() WHERE id=$1", [
        active.id,
      ]);
    const count = (
      await client.query(
        `SELECT count(*)::int AS count FROM sounding_clip_share WHERE workspace_id=$1 AND created_at>now()-interval '24 hours'`,
        [workspaceKey(owner)],
      )
    ).rows[0].count;
    if (count >= 20)
      throw new ClipError("Daily clip preparation limit reached. Existing links still work.");
    const id = randomUUID(),
      expiresAt = Date.now() + SHARE_TTL;
    const view = guestView(meeting, clip, expiresAt);
    grant = (
      await client.query(
        `INSERT INTO sounding_clip_share(id,token_hash,workspace_id,meeting_id,clip_id,clip,view,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,'preparing',$8) RETURNING *`,
        [
          id,
          digest(clipToken(id)),
          workspaceKey(owner),
          meetingId,
          clip.id,
          JSON.stringify(clip),
          JSON.stringify(view),
          new Date(expiresAt),
        ],
      )
    ).rows[0];
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  let media: string | null = null;
  try {
    media = await prepare(meeting!, clip!, grant!.id);
    const latest = await getOwnedMeeting(pool, owner, meetingId);
    if (!latest?.state.clips?.some((c) => sameClip(c, clip!)))
      throw new ClipError("Clip changed during preparation. Please try again.");
    const done = await pool.query(
      `UPDATE sounding_clip_share SET media_key=$2,status='ready' WHERE id=$1 AND status='preparing' AND revoked_at IS NULL AND expires_at>now() RETURNING id`,
      [grant!.id, media],
    );
    if (!done.rowCount) throw new ClipError("Sharing was disabled during preparation.");
    return grantLink(grant!);
  } catch (e) {
    await pool.query(
      `UPDATE sounding_clip_share SET status='failed',revoked_at=coalesce(revoked_at,now()) WHERE id=$1`,
      [grant!.id],
    );
    if (media) await cleanup(media).catch(() => {});
    throw e;
  }
}
export async function publicClip(
  pool: Pool,
  token: string,
): Promise<(Grant & { view: GuestClip }) | null> {
  if (!/^v2\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const grant = (
    await pool.query(
      `SELECT g.* FROM sounding_clip_share g JOIN sounding_meeting m ON m.workspace_id=g.workspace_id AND m.id=g.meeting_id WHERE g.token_hash=$1 AND g.status='ready' AND g.revoked_at IS NULL AND g.expires_at>now() AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(m.state->'clips','[]'::jsonb)) c WHERE c->>'id'=g.clip_id AND c->'start'=g.clip->'start' AND c->'end'=g.clip->'end' AND c->'title'=g.clip->'title') AND (m.meeting->>'source' IS DISTINCT FROM 'upload' OR EXISTS(SELECT 1 FROM sounding_recording r WHERE r.id=g.meeting_id AND r.workspace_id=g.workspace_id AND r.status='ready'))`,
      [digest(token)],
    )
  ).rows[0] as Grant | undefined;
  if (!grant) return null;
  let expected: string;
  try {
    expected = clipToken(grant.id);
  } catch {
    return null;
  }
  if (!timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return null;
  const view = guestClipSchema.safeParse(grant.view);
  if (
    !view.success ||
    view.data.clip.end <= view.data.clip.start ||
    view.data.clip.end - view.data.clip.start > MAX_CLIP_SECONDS ||
    JSON.stringify({
      start: view.data.clip.start,
      end: view.data.clip.end,
      title: view.data.clip.title,
    }) !==
      JSON.stringify({ start: grant.clip.start, end: grant.clip.end, title: grant.clip.title }) ||
    view.data.segments.some((s) => s.start < grant.clip.start || s.end > grant.clip.end)
  )
    return null;
  if (view.data.hasAudio !== !!grant.media_key) return null;
  return { ...grant, view: view.data };
}
