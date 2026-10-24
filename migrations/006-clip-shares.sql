CREATE TABLE sounding_clip_share (
 id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE,
 workspace_id text NOT NULL, meeting_id text NOT NULL, clip_id text NOT NULL,
 clip jsonb NOT NULL, view jsonb NOT NULL,
 status text NOT NULL CHECK(status IN ('preparing','ready','failed')),
 media_key text, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 FOREIGN KEY(workspace_id,meeting_id) REFERENCES sounding_meeting(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX sounding_clip_share_owner ON sounding_clip_share(workspace_id,meeting_id,clip_id);
CREATE UNIQUE INDEX sounding_clip_share_active ON sounding_clip_share(workspace_id,meeting_id,clip_id) WHERE revoked_at IS NULL AND status IN ('preparing','ready');