-- Owner-approved shared US$2 ceiling; preserve the existing ledger and reservations.
ALTER TABLE sounding_ai_budget DROP CONSTRAINT sounding_ai_budget_authorized_cents_check;
ALTER TABLE sounding_ai_budget ADD CONSTRAINT sounding_ai_budget_authorized_cents_check
  CHECK (authorized_cents BETWEEN 0 AND 200);