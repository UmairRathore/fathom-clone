import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Pool } from "pg";
import { z } from "zod";
export const temporaryNameSchema = z.object({ name: z.string().trim().min(1).max(80) }).strict();
export async function temporaryAccount(pool: Pick<Pool, "query">, userId: string) {
  return (
    await pool.query(
      "SELECT created_at,expires_at,expires_at>now() AS active FROM sounding_temporary_account WHERE user_id=$1",
      [userId],
    )
  ).rows[0] as { created_at: Date; expires_at: Date; active: boolean } | undefined;
}
export class RegistrationLimited extends Error {}
export async function createTemporaryAccount(pool: Pool, input: unknown) {
  const { name } = temporaryNameSchema.parse(input);
  // Fixed global buckets cannot be bypassed with attacker-supplied forwarding headers.
  const quota =
    await pool.query(`INSERT INTO sounding_registration_quota(bucket,hits) VALUES(date_trunc('hour',now()),1)
    ON CONFLICT(bucket) DO UPDATE SET hits=sounding_registration_quota.hits+1 RETURNING hits`);
  if (quota.rows[0].hits > 10) throw new RegistrationLimited();
  const daily = await pool.query(
    "SELECT coalesce(sum(hits),0)::int AS hits FROM sounding_registration_quota WHERE bucket>now()-interval '24 hours'",
  );
  if (daily.rows[0].hits > 20) throw new RegistrationLimited();
  const id = randomUUID(),
    loginId = `demo-${randomBytes(16).toString("hex")}@sounding.local`,
    password = randomBytes(24).toString("base64url");
  const hashed = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,now(),now())',
      [id, name, loginId],
    );
    await client.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,\'credential\',$2,$3,now(),now())',
      [randomUUID(), id, hashed],
    );
    const record = (
      await client.query(
        "INSERT INTO sounding_temporary_account(user_id) VALUES($1) RETURNING created_at,expires_at",
        [id],
      )
    ).rows[0];
    await client.query("COMMIT");
    return {
      id,
      loginId,
      password,
      createdAt: record.created_at.toISOString(),
      expiresAt: record.expires_at.toISOString(),
    };
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Temporary registration failed.");
  } finally {
    client.release();
  }
}
