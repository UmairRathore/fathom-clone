CREATE TABLE IF NOT EXISTS sounding_ai_budget (
 scope text PRIMARY KEY, approved_recording_id text REFERENCES sounding_recording(id),
 authorized_cents integer NOT NULL CHECK(authorized_cents BETWEEN 0 AND 100),
 reserved_cents integer NOT NULL DEFAULT 0 CHECK(reserved_cents >= 0 AND reserved_cents <= authorized_cents),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sounding_ai_request (
 recording_id text NOT NULL REFERENCES sounding_recording(id), operation text NOT NULL CHECK(operation IN ('transcription','analysis')),
 scope text NOT NULL REFERENCES sounding_ai_budget(scope), model text NOT NULL, reserved_cents integer NOT NULL,
 estimated_cents numeric, usage jsonb, status text NOT NULL CHECK(status IN ('reserved','succeeded','uncertain')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, PRIMARY KEY(recording_id,operation)
);