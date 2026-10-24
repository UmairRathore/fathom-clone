CREATE TABLE sounding_temporary_account (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 CHECK(expires_at=created_at+interval '24 hours')
);
CREATE INDEX sounding_temporary_expiration ON sounding_temporary_account(expires_at);
CREATE TABLE sounding_registration_quota (bucket timestamptz PRIMARY KEY,hits integer NOT NULL);
CREATE TABLE sounding_temporary_cleanup (
 user_id text PRIMARY KEY,
 object_keys jsonb NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 last_error text,
 purge_after timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION sounding_account_active(actor text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM sounding_temporary_account WHERE user_id=actor AND expires_at<=now())
$$;
CREATE OR REPLACE FUNCTION sounding_cap_temporary_session() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE deadline timestamptz;
BEGIN
 SELECT expires_at INTO deadline FROM sounding_temporary_account WHERE user_id=NEW."userId";
 IF deadline IS NOT NULL THEN
   IF deadline<=now() THEN RAISE EXCEPTION 'Temporary account expired'; END IF;
   NEW."expiresAt" := LEAST(NEW."expiresAt",deadline);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sounding_temporary_session_limit BEFORE INSERT OR UPDATE ON session
FOR EACH ROW EXECUTE FUNCTION sounding_cap_temporary_session();
