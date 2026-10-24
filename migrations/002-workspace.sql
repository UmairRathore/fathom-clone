CREATE TABLE IF NOT EXISTS sounding_workspace (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  session_id text REFERENCES session(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('demo','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind='demo' AND session_id IS NOT NULL) OR (kind='private' AND session_id IS NULL))
);
CREATE INDEX IF NOT EXISTS sounding_workspace_owner ON sounding_workspace(owner_id);
CREATE TABLE IF NOT EXISTS sounding_meeting (
  workspace_id text NOT NULL REFERENCES sounding_workspace(id) ON DELETE CASCADE,
  id text NOT NULL,
  meeting jsonb NOT NULL,
  state jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,id),
  CHECK (revision >= 0)
);
