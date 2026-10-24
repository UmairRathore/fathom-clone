import assert from "node:assert/strict";
import { appendLiveAnnotation, liveAnnotation, liveCategories } from "../src/lib/live-capture";
import { vercelFetch } from "./vercel-fetch";
const base = process.env.SMOKE_URL ?? "http://localhost:3002";
const transport = process.env.AUTH_SMOKE_VERCEL === "true" ? vercelFetch : fetch;
let checks = 0;
function check(ok: unknown, label: string) {
  assert(ok, label);
  console.log("PASS " + label);
  checks++;
}
async function send(path: string, body?: unknown, cookie?: string, method = body ? "POST" : "GET") {
  return transport(base + path, {
    method,
    headers: { "Content-Type": "application/json", origin: base, ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
}
const cookieOf = (r: Response) =>
  r.headers
    .getSetCookie()
    .find((x) => x.includes("session_token="))
    ?.split(";")[0] ?? "";
check((await send("/capture")).status === 307, "capture requires sign-in");
let createdClipId = "";
let first = "",
  second = "";
try {
  first = cookieOf(await send("/api/demo", {}));
  check(!!first, "isolated demo session created");
  await send("/home", undefined, first);
  let saved = await (await send("/api/meetings/atlas-launch", undefined, first)).json();
  const original = saved.state.highlights;
  const sessionId = crypto.randomUUID();
  async function put(state: unknown) {
    const r = await send(
      "/api/meetings/atlas-launch",
      { state, revision: saved.revision },
      first,
      "PUT",
    );
    assert(r.ok, "capture save");
    saved = await (await send("/api/meetings/atlas-launch", undefined, first)).json();
  }
  for (const stage of ["connected", "scheduled", "recording"] as const) {
    await put({ ...saved.state, capture: { stage, elapsed: 0, sessionId } });
    check(saved.state.capture.stage === stage, "persisted lifecycle " + stage);
  }
  let highlights = saved.state.highlights;
  for (const [i, category] of liveCategories.entries()) {
    const h = liveAnnotation({
      id: crypto.randomUUID(),
      sessionId,
      time: 13.284 + i,
      duration: saved.meeting.duration,
      category,
      note: "Module 3 fictional verification",
    });
    highlights = appendLiveAnnotation(highlights, h);
    highlights = appendLiveAnnotation(highlights, h);
  }
  await put({
    ...saved.state,
    highlights,
    capture: { stage: "recording", elapsed: 17.534, sessionId },
  });
  check(saved.state.highlights.length === original.length + 4, "four categories persist once each");
  check(
    saved.state.highlights
      .filter((h: { captureSessionId?: string }) => h.captureSessionId === sessionId)
      .every(
        (h: { origin: string; time: number }) =>
          h.origin === "manual" && h.time >= 13.284 && h.time <= 16.284,
      ),
    "exact manual times and session association retained",
  );
  check(
    original.every(
      (h: { id: string }) =>
        JSON.stringify(h) ===
        JSON.stringify(saved.state.highlights.find((x: { id: string }) => x.id === h.id)),
    ),
    "original fixture highlights unchanged",
  );
  for (const stage of ["processing", "ready"] as const) {
    await put({ ...saved.state, capture: { stage, elapsed: 17.534, sessionId } });
    check(
      saved.state.capture.stage === stage && saved.state.capture.elapsed === 17.534,
      "early finish persists " + stage,
    );
  }
  const clip = {
    id: crypto.randomUUID(),
    title: "Module 3 fictional highlight clip",
    start: 13.284,
    end: 23.284,
  };
  await put({ ...saved.state, clips: [clip] });
  createdClipId = clip.id;
  const minted = await send(
    "/api/shares",
    { meetingId: "atlas-launch", clip, state: saved.state, visibility: "unlisted" },
    first,
  );
  check(minted.ok, "live highlight range uses existing clip sharing");
  const share = await minted.json();
  const publicOrigin = share.url ? new URL(share.url).origin : base;
  const guestPath = share.path;
  const guest = await transport(publicOrigin + guestPath);
  check(guest.ok, "guest clip viewer loads");
  check(
    (await send("/api/shares", { meetingId: "atlas-launch", clipId: clip.id }, first, "DELETE")).ok,
    "clip revokes",
  );
  check(
    (await transport(publicOrigin + guestPath)).status === 404,
    "revoked guest link fails closed",
  );
  second = cookieOf(await send("/api/demo", {}));
  await send("/home", undefined, second);
  const isolated = await (await send("/api/meetings/atlas-launch", undefined, second)).json();
  check(
    !isolated.state.capture &&
      !isolated.state.clips?.length &&
      isolated.state.highlights.length === original.length,
    "another demo visitor sees none of this session's changes",
  );
  await put({ ...saved.state, capture: undefined });
  check(
    !saved.state.capture && saved.state.highlights.length === original.length + 4,
    "cancel clears capture without deleting annotations",
  );
} finally {
  if (first && createdClipId)
    await send(
      "/api/shares",
      { meetingId: "atlas-launch", clipId: createdClipId },
      first,
      "DELETE",
    );
  if (first) await send("/api/auth/sign-out", {}, first);
  if (second) await send("/api/auth/sign-out", {}, second);
}
console.log(`${checks} recording journey HTTP checks passed; no AI calls.`);
