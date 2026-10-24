import assert from "node:assert/strict";
import { vercelFetch } from "./vercel-fetch";
const base = process.env.SMOKE_URL ?? "http://localhost:3002",
  transport = process.env.AUTH_SMOKE_VERCEL === "true" ? vercelFetch : fetch;
let checks = 0;
function check(ok: unknown, label: string) {
  assert(ok, label);
  checks++;
  console.log("PASS " + label);
}
async function send(
  path: string,
  body?: unknown,
  cookie?: string,
  method = body ? "POST" : "GET",
  origin = base,
) {
  return transport(base + path, {
    method,
    headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
}
const cookie = (r: Response) =>
  r.headers
    .getSetCookie()
    .find((v) => v.includes("session_token="))
    ?.split(";")[0] ?? "";
check(
  (
    await send(
      "/api/temporary-accounts",
      { name: "Cross origin" },
      undefined,
      "POST",
      "https://attacker.example",
    )
  ).status === 403,
  "cross-origin temporary registration denied",
);
check((await send("/api/temporary-accounts", { name: " " })).status === 400, "blank name rejected");
check(
  (await send("/api/temporary-accounts", { name: "Test", email: "not-collected@example.test" }))
    .status === 400,
  "registration rejects extra email fields",
);
let first = "",
  second = "";
try {
  const created = await send("/api/temporary-accounts", { name: "Temporary HTTP evaluator" });
  check(
    created.ok && /no-store/.test(created.headers.get("cache-control") ?? ""),
    "name-only registration returns uncached one-time credentials",
  );
  const credentials = await created.json();
  first = cookie(created);
  check(
    !!first &&
      /^demo-[a-f0-9]{32}@sounding\.local$/.test(credentials.loginId) &&
      credentials.password.length === 32,
    "generated credentials and immediate server session are present",
  );
  check(
    new Date(credentials.expiresAt).getTime() - new Date(credentials.createdAt).getTime() ===
      86400000,
    "absolute expiration is exactly 24 hours from creation",
  );
  const profile = await send("/account", undefined, first);
  const html = await profile.text();
  check(
    profile.ok &&
      html.includes(credentials.loginId) &&
      html.includes("cannot be retrieved") &&
      !html.includes(credentials.password),
    "profile retains ID and never returns the generated password",
  );
  const saved = await (await send("/api/meetings/atlas-launch", undefined, first)).json();
  const state = {
    ...saved.state,
    preferences: { ...saved.state.preferences, guidance: "Temporary HTTP isolated workspace" },
  };
  check(
    (await send("/api/meetings/atlas-launch", { state, revision: saved.revision }, first, "PUT"))
      .ok,
    "temporary workspace saves persistently",
  );
  const other = await send("/api/temporary-accounts", { name: "Other temporary evaluator" });
  check(other.ok, "second independent temporary account creates successfully");
  second = cookie(other);
  const otherData = await other.json();
  check(
    otherData.loginId !== credentials.loginId && otherData.password !== credentials.password,
    "credentials are unique across visitors",
  );
  const isolated = await (await send("/api/meetings/atlas-launch", undefined, second)).json();
  check(isolated.state.preferences.guidance === "", "temporary accounts are isolated");
  check(
    (await send("/api/recordings/does-not-exist", undefined, second)).status === 404,
    "another account receives no private recording data",
  );
  check((await send("/api/auth/sign-out", {}, first)).ok, "temporary account logout succeeds");
  check(
    (await send("/api/meetings/atlas-launch", undefined, first)).status === 401,
    "revoked session cannot access the workspace",
  );
  const wrong = await send("/api/auth/sign-in/email", {
    email: credentials.loginId,
    password: "incorrect-fixture-password",
  });
  check(wrong.status === 401, "incorrect generated-account password is rejected");
  const back = await send("/api/auth/sign-in/email", {
    email: credentials.loginId,
    password: credentials.password,
  });
  check(back.ok, "generated credentials allow reentry");
  first = cookie(back);
  const reloaded = await (await send("/api/meetings/atlas-launch", undefined, first)).json();
  check(
    reloaded.state.preferences.guidance === state.preferences.guidance,
    "private changes survive logout and reentry",
  );
  const account = await (await send("/account", undefined, first)).text();
  check(
    account.includes(credentials.expiresAt) ||
      account.includes(new Date(credentials.expiresAt).toUTCString()),
    "original account deadline remains visible after login",
  );
  for (const page of ["/forgot-password", "/reset-password"])
    check(
      (await (await send(page)).text()).includes("Password recovery is currently unavailable"),
      "public recovery route is honest and contains no email flow",
    );
  const session = await (await send("/api/auth/get-session", undefined, first)).json();
  check(
    !JSON.stringify(session).includes(credentials.password),
    "session response never exposes password",
  );
  const demo = await send("/api/demo", {});
  const demoCookie = cookie(demo);
  check(demo.ok, "separate instant demo remains available");
  await send("/api/auth/sign-out", {}, demoCookie);
} finally {
  if (first) await send("/api/auth/sign-out", {}, first);
  if (second) await send("/api/auth/sign-out", {}, second);
}
console.log(
  `${checks} temporary-account HTTP checks passed. Credentials remained in memory; no paid API calls.`,
);
