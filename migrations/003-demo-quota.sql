CREATE TABLE IF NOT EXISTS sounding_demo_quota (
 bucket timestamptz PRIMARY KEY, hits integer NOT NULL CHECK (hits > 0)
);
