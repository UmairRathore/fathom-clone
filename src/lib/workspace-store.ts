import type { Pool } from "pg";
import { meetings } from "./data";
import type { Meeting } from "./domain";
import { defaultState, restoreState, stateSchema, type MeetingState } from "./state";
export type Owner = { userId: string; sessionId: string; demo: boolean };
export type SavedMeeting = { meeting: Meeting; state: MeetingState; revision: number };
export function workspaceKey(owner: Owner) {
  return owner.demo ? `demo:${owner.sessionId}` : `user:${owner.userId}`;
}
export async function ensureWorkspace(pool: Pool, owner: Owner) {
  const key = workspaceKey(owner);
  const exists = await pool.query(
    `SELECT w.id FROM sounding_workspace w JOIN session s
    ON s.id=$3 AND s."userId"=w.owner_id AND s."expiresAt">now() AND sounding_account_active(s."userId")
    WHERE w.id=$1 AND w.owner_id=$2 AND (w.session_id IS NULL OR w.session_id=$3)`,
    [key, owner.userId, owner.sessionId],
  );
  if (exists.rowCount) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const actor = await client.query(
      'SELECT id FROM session WHERE id=$1 AND "userId"=$2 AND "expiresAt">now() AND sounding_account_active("userId")',
      [owner.sessionId, owner.userId],
    );
    if (!actor.rowCount) throw new Error("Invalid session owner.");
    await client.query(
      `INSERT INTO sounding_workspace(id,owner_id,session_id,kind)
      VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [key, owner.userId, owner.demo ? owner.sessionId : null, owner.demo ? "demo" : "private"],
    );
    await client.query("SELECT id FROM sounding_workspace WHERE id=$1 AND owner_id=$2 FOR UPDATE", [
      key,
      owner.userId,
    ]);
    // Seed atomically in one round trip. A visible workspace is always fully initialized.
    await client.query(
      `INSERT INTO sounding_meeting(workspace_id,id,meeting,state)
      SELECT $1,item->>'id',item->'meeting',item->'state' FROM jsonb_array_elements($2::jsonb) AS item
      ON CONFLICT DO NOTHING`,
      [
        key,
        JSON.stringify(
          meetings.map((meeting) => ({ id: meeting.id, meeting, state: defaultState(meeting) })),
        ),
      ],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Workspace initialization failed.");
  } finally {
    client.release();
  }
}

export async function listOwnedMeetings(pool: Pool, owner: Owner): Promise<SavedMeeting[]> {
  const { rows } = await pool.query(
    `SELECT m.meeting,m.state,m.revision FROM sounding_meeting m
    JOIN sounding_workspace w ON w.id=m.workspace_id
    JOIN session s ON s.id=$3 AND s."userId"=w.owner_id AND s."expiresAt">now() AND sounding_account_active(s."userId")
    WHERE w.id=$1 AND w.owner_id=$2 AND (w.session_id IS NULL OR w.session_id=$3)
    ORDER BY m.id`,
    [workspaceKey(owner), owner.userId, owner.sessionId],
  );
  return rows;
}
export async function getOwnedMeeting(
  pool: Pick<Pool, "query">,
  owner: Owner,
  id: string,
): Promise<SavedMeeting | null> {
  const { rows } = await pool.query(
    `SELECT m.meeting,m.state,m.revision FROM sounding_meeting m
    JOIN sounding_workspace w ON w.id=m.workspace_id
    JOIN session s ON s.id=$3 AND s."userId"=w.owner_id AND s."expiresAt">now() AND sounding_account_active(s."userId")
    WHERE w.id=$1 AND w.owner_id=$2 AND (w.session_id IS NULL OR w.session_id=$3) AND m.id=$4`,
    [workspaceKey(owner), owner.userId, owner.sessionId, id],
  );
  return rows[0] ?? null;
}
export function validateMeetingState(value: unknown, meeting: Meeting) {
  const result = stateSchema.safeParse(value);
  if (!result.success) return null;
  return JSON.stringify(restoreState(JSON.stringify(result.data), meeting)) ===
    JSON.stringify(result.data)
    ? result.data
    : null;
}
export async function saveOwnedMeeting(
  pool: Pool,
  owner: Owner,
  id: string,
  value: unknown,
  revision: number,
): Promise<number | "missing" | "invalid" | "conflict"> {
  const saved = await getOwnedMeeting(pool, owner, id);
  if (!saved) return "missing" as const;
  const state = validateMeetingState(value, saved.meeting);
  if (!state) return "invalid" as const;
  const result = await pool.query(
    `WITH updated AS (UPDATE sounding_meeting m SET state=$1::jsonb,revision=revision+1,updated_at=now()
    FROM sounding_workspace w WHERE w.id=m.workspace_id AND w.id=$2 AND w.owner_id=$3
    AND (w.session_id IS NULL OR w.session_id=$4)
    AND EXISTS (SELECT 1 FROM session s WHERE s.id=$4 AND s."userId"=w.owner_id AND s."expiresAt">now() AND sounding_account_active(s."userId")) AND m.id=$5 AND m.revision=$6 RETURNING m.revision), revoked AS (
      UPDATE sounding_clip_share g SET revoked_at=now()
      WHERE g.workspace_id=$2 AND g.meeting_id=$5 AND g.revoked_at IS NULL
      AND EXISTS(SELECT 1 FROM updated)
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(($1::jsonb)->'clips','[]'::jsonb)) c
        WHERE c->>'id'=g.clip_id AND c->'start'=g.clip->'start' AND c->'end'=g.clip->'end' AND c->'title'=g.clip->'title')
      RETURNING id
    ) SELECT revision FROM updated`,
    [JSON.stringify(state), workspaceKey(owner), owner.userId, owner.sessionId, id, revision],
  );
  return result.rows[0]?.revision ?? ("conflict" as const);
}
