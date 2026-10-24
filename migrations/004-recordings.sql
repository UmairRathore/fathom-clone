CREATE TABLE IF NOT EXISTS sounding_recording (
 id text PRIMARY KEY, owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 workspace_id text NOT NULL REFERENCES sounding_workspace(id) ON DELETE CASCADE,
 request_key uuid NOT NULL, title text NOT NULL, filename text NOT NULL, mime_type text NOT NULL, size_bytes integer NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 24000000),
 media_key text NOT NULL UNIQUE, media_duration double precision, media_type text, sha256 text,
 status text NOT NULL CHECK(status IN ('uploading','uploaded','queued','transcribing','generating_insights','ready','failed','cancelled')),
 transcript jsonb, analysis jsonb, error_code text, retryable boolean NOT NULL DEFAULT false,
 transcription_attempts integer NOT NULL DEFAULT 0, analysis_attempts integer NOT NULL DEFAULT 0,
 lease_until timestamptz, run_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE(owner_id,request_key)
);
CREATE INDEX IF NOT EXISTS sounding_recording_owner ON sounding_recording(owner_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS sounding_recording_hash ON sounding_recording(owner_id,sha256) WHERE sha256 IS NOT NULL AND status <> 'cancelled';
