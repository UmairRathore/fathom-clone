// Local operator test: requires ignored QA account files; never prints cookies, URLs or meeting content.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { vercelFetch } from "./vercel-fetch";
const base = process.env.SMOKE_URL ?? "http://localhost:3002";
let count = 0;
function check(ok: boolean, label: string) {
  assert(ok, label);
  console.log("PASS " + label);
  count++;
}
async function request(
  path: string,
  cookie?: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  origin = base,
) {
  return (process.env.AUTH_SMOKE_VERCEL === "true" ? vercelFetch : fetch)(base + path, {
    method,
    headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
}
function cookieOf(r: Response) {
  return (
    r.headers
      .getSetCookie()
      .find((s) => s.includes("session_token="))
      ?.split(";")[0] ?? ""
  );
}
async function login(file: string) {
  const data = JSON.parse(await readFile(file, "utf8"));
  const r = await request("/api/auth/sign-in/email", undefined, data);
  const cookie = cookieOf(r);
  check(r.ok && !!cookie, "private QA account sign-in");
  return cookie;
}
const { id } = JSON.parse(await readFile(".module-private/live-test.json", "utf8"));
let a = "",
  b = "",
  demo = "";
try {
  for (const path of [
    "/api/recordings",
    `/api/recordings/${id}`,
    `/api/recordings/${id}/media`,
    `/api/recordings/${id}/review`,
    `/api/meetings/${id}`,
  ])
    check((await request(path)).status === 401, "anonymous private API denial");
  check((await request("/upload")).status === 307, "upload screen requires sign-in");
  a = await login(".module-private/local-account.json");
  b = await login(".module-private/second-account.json");
  check(
    (await request("/home", a)).ok && (await request("/home", b)).ok,
    "private workspace initialization",
  );
  check(
    (await request(`/api/recordings/${id}/review`, b)).status === 404,
    "second account cannot read insight review",
  );
  const reviewResponse = await request(`/api/recordings/${id}/review`, a);
  const review = await reviewResponse.json();
  check(
    reviewResponse.ok && review.audioVerified === false && review.basis === "saved-transcript",
    "owner-only non-billable insight review",
  );
  check(
    reviewResponse.headers.get("cache-control")?.includes("no-store") === true,
    "private insight review cannot be cached",
  );
  const record = await request(`/api/recordings/${id}`, a);
  check(record.ok, "owner can read processing state");
  const info = await record.json();
  check(info.job.status === "ready", "live job completed persistently");
  const meeting = await request(`/api/meetings/${id}`, a);
  const saved = await meeting.json();
  check(
    meeting.ok && saved.meeting.source === "upload" && saved.meeting.segments.length > 0,
    "owner sees real processed meeting",
  );
  check(
    (await request(`/api/recordings/${id}`, b)).status === 404,
    "second account cannot read recording",
  );
  check(
    (await request(`/api/recordings/${id}/media`, b)).status === 404,
    "second account cannot request media",
  );
  check(
    (await request(`/api/meetings/${id}`, b)).status === 404,
    "second account cannot read transcript or summary",
  );
  check(
    (await request(`/api/recordings/${id}`, b, undefined, "DELETE")).status === 404,
    "second account cannot delete recording",
  );
  check(
    (await request(`/api/recordings/${id}/process`, b, {})).status === 404,
    "second account cannot process recording",
  );
  const demoResponse = await request("/api/demo", undefined, {});
  demo = cookieOf(demoResponse);
  check(!!demo, "public demo remains available");
  check(
    (await request("/api/recordings", demo)).status === 403,
    "public demo cannot list private recordings",
  );
  check(
    (await request("/api/recordings", demo, {})).status === 403,
    "public demo cannot upload recordings",
  );
  check(
    (await request(`/api/recordings/${id}/media`, demo)).status === 403,
    "public demo cannot request private media",
  );
  check(
    (await request(`/api/recordings/${id}/process`, demo, {})).status === 403,
    "public demo cannot invoke billable processing",
  );
  check(
    (await request("/api/recordings", a, {}, "POST", "https://attacker.example")).status === 403,
    "cross-origin upload rejected",
  );
  for (const change of [
    { filename: "unsafe.exe", mime: "application/octet-stream", size: 100, duration: 10 },
    { filename: "test.mp4", mime: "video/mp4", size: 24000001, duration: 10 },
    { filename: "test.mp4", mime: "video/mp4", size: 100, duration: 301 },
  ])
    check(
      (
        await request("/api/recordings", a, {
          requestKey: crypto.randomUUID(),
          title: "Validation test",
          ...change,
        })
      ).status === 400,
      "invalid file metadata rejected before storage",
    );
  check(
    (await request("/api/shares", a, { meetingId: id, state: saved.state, visibility: "unlisted" }))
      .status === 403,
    "private upload cannot be published as a demo snapshot",
  );
  const media = await request(`/api/recordings/${id}/media`, a);
  check(
    media.status === 307 && /no-store/.test(media.headers.get("cache-control") ?? ""),
    "owner receives an uncached expiring media capability",
  );
  const location = media.headers.get("location");
  check(
    !!location && new URL(location).hostname.endsWith(".private.blob.vercel-storage.com"),
    "playback uses private object storage",
  );
  const bytes = await fetch(location!, {
    headers: { Range: "bytes=0-1023" },
    signal: AbortSignal.timeout(20000),
  });
  check(bytes.ok, "authorized range playback responds");
  await bytes.body?.cancel();
  const cached = await request(`/api/recordings/${id}/process`, a, {});
  check(
    cached.ok && (await cached.json()).job.status === "ready",
    "completed processing reuses cached result",
  );
  console.log(
    `${count} recording security HTTP checks passed. No private content or capabilities printed.`,
  );
} finally {
  for (const value of [a, b, demo]) if (value) await request("/api/auth/sign-out", value, {});
}
