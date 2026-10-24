import nextEnv from "@next/env";
import { vercelFetch } from "./vercel-fetch";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.SMOKE_URL ?? "http://localhost:3002";
let checks = 0;
function check(value: boolean, label: string) {
  if (!value) throw new Error("Failed: " + label);
  checks++;
  console.log("PASS " + label);
}
async function send(
  path: string,
  body?: unknown,
  cookie?: string,
  origin = base,
  method = body ? "POST" : "GET",
) {
  const headers = new Headers({ origin, "Content-Type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  return (process.env.AUTH_SMOKE_VERCEL === "true" ? vercelFetch : fetch)(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
}
function cookie(response: Response) {
  return (
    response.headers
      .getSetCookie()
      .find((x) => x.includes("session_token="))
      ?.split(";")[0] ?? ""
  );
}
const noAuth = await send("/home");
check(
  [307, 308].includes(noAuth.status) &&
    !!noAuth.headers.get("location")?.includes("/users/sign_in"),
  "protected dashboard redirects without a session",
);
const noCall = await send("/calls/atlas-launch");
check([307, 308].includes(noCall.status), "protected meeting redirects without a session");
check(
  (await send("/api/meetings/atlas-launch")).status === 401,
  "meeting API rejects unauthenticated read",
);
check(
  (await send("/api/demo", {}, undefined, "https://attacker.example")).status === 403,
  "cross-origin demo login rejected",
);
check(
  (
    await send(
      "/api/auth/sign-in/email",
      { email: "x@example.test", password: "invalid" },
      undefined,
      "https://attacker.example",
    )
  ).status === 403,
  "cross-origin credential login rejected",
);
check(
  (await send("/api/auth/request-password-reset", { email: "x@example.test" })).status === 503,
  "reset email stays disabled without configured delivery",
);
check(
  (
    await send("/api/auth/sign-up/email", {
      name: "No signup",
      email: "x@example.test",
      password: "not-a-real-password",
    })
  ).status === 503,
  "unconfigured email signup fails closed",
);
check(
  (await send("/api/shares", { meetingId: "atlas-launch" })).status === 401,
  "share creation requires an owner session",
);
check(
  (await send("/api/demo", {}, undefined, "")).status === 403,
  "missing-origin demo login rejected",
);
check(
  (await send("/api/auth/sign-out", {}, undefined, "")).status === 403,
  "missing-origin logout rejected",
);
check(
  (await send("/api/auth/send-verification-email", { email: "x@example.test" })).status === 503,
  "verification resend unavailable without delivery",
);
check(
  (
    await send("/api/auth/reset-password", {
      token: "not-a-real-token",
      newPassword: "not-a-real-password",
    })
  ).status === 503,
  "raw password reset remains disabled without delivery",
);
const forgedSession = await send(
  "/api/auth/get-session",
  undefined,
  "sounding.session_token=attacker-chosen-token",
);
check(
  forgedSession.ok && (await forgedSession.json()) === null,
  "forged session cookie grants no identity",
);
const first = await send("/api/demo", {}),
  firstCookie = cookie(first);
check(first.ok && !!firstCookie, "one-click demo issues a real server session");
const firstHome = await send("/home", undefined, firstCookie);
check(firstHome.ok, "authenticated dashboard loads");
const firstMeeting = await send("/api/meetings/atlas-launch", undefined, firstCookie);
check(
  firstMeeting.ok && /no-store/.test(firstMeeting.headers.get("cache-control") ?? ""),
  "owned meeting is returned without caching",
);
const saved = await firstMeeting.json();
const changed = {
  ...saved.state,
  actions: [
    ...saved.state.actions,
    { id: "http-isolation", text: "First visitor isolated change", time: 0, done: false },
  ],
};
check(
  (
    await send(
      "/api/meetings/atlas-launch",
      { state: changed, revision: saved.revision },
      firstCookie,
      base,
      "PUT",
    )
  ).ok,
  "valid changes persist in PostgreSQL",
);
const second = await send("/api/demo", {}),
  secondCookie = cookie(second);
check(second.ok && !!secondCookie, "second demo visitor gets another server session");
await send("/home", undefined, secondCookie);
const secondMeeting = await send("/api/meetings/atlas-launch", undefined, secondCookie),
  secondData = await secondMeeting.json();
check(
  !secondData.state.actions.some((a: { id: string }) => a.id === "http-isolation"),
  "visitor changes remain isolated",
);
const reread = await send("/api/meetings/atlas-launch", undefined, firstCookie),
  rereadData = await reread.json();
check(
  rereadData.state.actions.some((a: { id: string }) => a.id === "http-isolation"),
  "first visitor changes survive a fresh request",
);
check(
  (
    await send(
      "/api/meetings/atlas-launch",
      { state: changed, revision: saved.revision },
      firstCookie,
      base,
      "PUT",
    )
  ).status === 409,
  "stale writes are rejected",
);
check(
  (
    await send(
      "/api/meetings/atlas-launch",
      { state: changed, revision: 1, ownerId: "injected" },
      secondCookie,
      base,
      "PUT",
    )
  ).status === 400,
  "owner injection is rejected",
);
check(
  (await send("/api/auth/update-user", { name: "Altered shared account" }, firstCookie)).status ===
    403,
  "demo credential/profile mutation blocked",
);
const share = await send(
  "/api/shares",
  { meetingId: "atlas-launch", visibility: "unlisted", state: changed },
  firstCookie,
);
check(share.ok, "authenticated owner can create a share");
const shareData = await share.json();
// Never print the bearer share URL.
const guest = await send(shareData.path);
check(
  guest.ok && (await guest.text()).includes("First visitor isolated change"),
  "public snapshot works without a session",
);
const logout = await send("/api/auth/sign-out", {}, firstCookie);
check(logout.ok, "logout succeeds");
check(
  (await send("/api/meetings/atlas-launch", undefined, firstCookie)).status === 401,
  "revoked session cannot read data",
);
await send("/api/auth/sign-out", {}, secondCookie);
if (process.env.DEMO_PASSWORD && new URL(base).hostname === "localhost") {
  const manual = await send("/api/auth/sign-in/email", {
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  });
  check(manual.ok && !!cookie(manual), "configured demo email/password login succeeds");
  await send("/api/auth/sign-out", {}, cookie(manual));
}
console.log(checks + " authentication HTTP checks passed.");
