import nextEnv from "@next/env";
import { Pool } from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { createAuthentication, type AuthMail } from "../src/lib/auth-config";
import {
  ensureWorkspace,
  getOwnedMeeting,
  saveOwnedMeeting,
  type Owner,
} from "../src/lib/workspace-store";
nextEnv.loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  !url.hostname.endsWith(".neon.tech") ||
  decodeURIComponent(url.pathname) !== "/sounding-preview"
)
  throw new Error("This verifier only runs against the dedicated Neon preview.");
const pool = new Pool({ connectionString: url.toString(), max: 2 });
const run = "verify-" + randomUUID(),
  ids: string[] = [],
  mails: AuthMail[] = [];
const origin = "http://localhost:3002",
  password = randomBytes(24).toString("base64url");
const auth = createAuthentication({
  pool,
  origin,
  secret: randomBytes(32).toString("hex"),
  sendMail: async (mail) => {
    mails.push(mail);
  },
});
let count = 0;
function check(value: unknown, label: string) {
  if (!value) throw new Error("Failed: " + label);
  count++;
  console.log("PASS " + label);
}
async function create(suffix: string) {
  const email = run + "-" + suffix + "@example.test";
  const signup = await auth.api.signUpEmail({
    body: { name: "Preview verification", email, password },
  });
  ids.push(signup.user.id);
  const mail = mails.find((m) => m.to === email);
  check(mail, "private signup generates a verification message in the test mailbox");
  const verified = await auth.handler(new Request(mail!.url));
  check(
    verified.status === 200 || verified.status === 302,
    "verification token accepted by Neon-backed auth",
  );
  const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  check(response.ok, "private email/password login against Neon");
  const cookie = response.headers
    .getSetCookie()
    .find((v) => v.includes("session_token="))
    ?.split(";")[0];
  check(cookie, "server session cookie issued");
  const headers = new Headers({ cookie: cookie! });
  const session = await auth.api.getSession({ headers });
  check(session, "server session resolves from PostgreSQL");
  return {
    headers,
    owner: { userId: session!.user.id, sessionId: session!.session.id, demo: false } as Owner,
  };
}
try {
  const alice = await create("a"),
    bob = await create("b");
  await ensureWorkspace(pool, alice.owner);
  await ensureWorkspace(pool, bob.owner);
  const first = await getOwnedMeeting(pool, alice.owner, "atlas-launch");
  check(first, "private owner can read seeded meeting");
  const changed = {
    ...first!.state,
    preferences: { ...first!.state.preferences, guidance: "Isolated private account test" },
  };
  check(
    (await saveOwnedMeeting(pool, alice.owner, "atlas-launch", changed, 0)) === 1,
    "private owner changes persist in Neon",
  );
  const other = await getOwnedMeeting(pool, bob.owner, "atlas-launch");
  check(other?.state.preferences.guidance === "", "another private owner cannot see those changes");
  check(
    (await getOwnedMeeting(pool, { ...alice.owner, userId: bob.owner.userId }, "atlas-launch")) ===
      null,
    "mismatched session and owner rejected",
  );
  const update = await auth.api.updateUser({
    headers: alice.headers,
    body: { name: "Updated private profile" },
  });
  check(update.status, "private account name update succeeds");
  await auth.api.signOut({ headers: alice.headers });
  check(
    !(await auth.api.getSession({ headers: alice.headers })),
    "private logout revokes the server session",
  );
  const missing = await getOwnedMeeting(pool, alice.owner, "atlas-launch");
  check(!missing, "revoked sessions rejected at database access layer");
  console.log(count + " hosted PostgreSQL authentication checks passed.");
} finally {
  // Only records created by this run; cascade removes their verification workspaces/sessions.
  if (ids.length)
    await pool.query('DELETE FROM "user" WHERE id=ANY($1::text[]) AND email LIKE $2', [
      ids,
      run + "-%@example.test",
    ]);
  await pool.end();
}
