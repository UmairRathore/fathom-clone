import assert from "node:assert/strict";
const base = "http://localhost:3002";
let count = 0;
function check(ok: boolean, label: string) {
  assert(ok, label);
  console.log("PASS " + label);
  count++;
}
async function send(
  path: string,
  body?: unknown,
  cookie?: string,
  method = body ? "POST" : "GET",
  origin = base,
) {
  return fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", origin, ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
}
function cookie(res: Response) {
  return (
    res.headers
      .getSetCookie()
      .find((s) => s.includes("session_token="))
      ?.split(";")[0] ?? ""
  );
}
check((await send("/capture")).status === 307, "recording journey requires authentication");
const login = await send("/api/demo", {});
const session = cookie(login);
check(login.ok && !!session, "isolated demo login");
let other = "";
try {
  check((await send("/home", undefined, session)).ok, "workspace initializes");
  const saved = await (await send("/api/meetings/atlas-launch", undefined, session)).json();
  const clip = { id: "http-clip", title: "Selected search moment", start: 13, end: 29 };
  const state = {
    ...saved.state,
    clips: [clip],
    capture: { stage: "ready", elapsed: saved.meeting.duration },
  };
  check(
    (await send("/api/meetings/atlas-launch", { state, revision: saved.revision }, session, "PUT"))
      .ok,
    "clip and completed journey persist",
  );
  const reloaded = await (await send("/api/meetings/atlas-launch", undefined, session)).json();
  check(
    reloaded.state.clips[0].title === clip.title && reloaded.state.capture.stage === "ready",
    "reload retains clip and journey",
  );
  const second = await send("/api/demo", {});
  other = cookie(second);
  await send("/home", undefined, other);
  const isolated = await (await send("/api/meetings/atlas-launch", undefined, other)).json();
  check(
    !isolated.state.clips?.length && !isolated.state.capture,
    "second visitor cannot see first visitor journey or clips",
  );
  const body = { meetingId: "atlas-launch", state, visibility: "unlisted", clip };
  check((await send("/api/shares", body)).status === 401, "guest cannot mint clip shares");
  check(
    (await send("/api/shares", body, session, "POST", "https://attacker.example")).status === 403,
    "cross-origin clip mint rejected",
  );
  check(
    (await send("/api/shares", { ...body, clip: { ...clip, end: 999 } }, session)).status === 400,
    "out-of-bounds clip rejected",
  );
  const minted = await send("/api/shares", body, session);
  check(minted.ok, "owner creates clip snapshot");
  const share = await minted.json(); // Keep bearer URLs only in memory; never print them.
  const guest = await send(share.path);
  const html = await guest.text();
  check(
    guest.ok && html.includes(clip.title) && html.includes("Clip transcript"),
    "cookie-free guest sees selected clip",
  );
  check(
    !html.includes("Friday launch decision") &&
      !html.includes("Migration rollback checkpoint") &&
      !html.includes('src="/media/atlas-review.wav"'),
    "guest page excludes full meeting annotations and source audio URL",
  );
  const mediaPath = "/api/clips/" + share.path.split("/").at(-1) + "/media";
  const media = await send(mediaPath);
  const wav = Buffer.from(await media.arrayBuffer());
  check(
    media.ok &&
      media.headers.get("content-type") === "audio/wav" &&
      wav.toString("ascii", 0, 4) === "RIFF",
    "cookie-free guest receives standalone clip audio",
  );
  check(
    Math.abs(wav.readUInt32LE(40) / wav.readUInt32LE(28) - 16) < 0.001,
    "guest audio is sixteen seconds rather than full recording",
  );
  const restricted = await (
    await send("/api/shares", { ...body, visibility: "restricted" }, session)
  ).json();
  check((await send(restricted.path)).status === 404, "restricted clip viewer fails closed");
  check(
    (await send("/api/clips/" + restricted.path.split("/").at(-1) + "/media")).status === 404,
    "restricted clip media fails closed",
  );
  check(
    (await send("/api/clips/invalid/media")).status === 404,
    "invalid media token fails closed",
  );
  check(
    (
      await send(
        "/api/meetings/atlas-launch",
        { state: { ...state, clips: [{ ...clip, end: 999 }] }, revision: reloaded.revision },
        session,
        "PUT",
      )
    ).status === 400,
    "invalid persisted clip rejected",
  );
} finally {
  if (session) await send("/api/auth/sign-out", {}, session);
  if (other) await send("/api/auth/sign-out", {}, other);
}
console.log(`${count} journey and clip HTTP checks passed.`);
