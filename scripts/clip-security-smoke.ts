// Operator test: reads ignored QA files. Never prints recording text, identities, URLs or tokens.
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import ffmpeg from "ffmpeg-static";
import { vercelFetch } from "./vercel-fetch";
const base = process.env.SMOKE_URL ?? "http://localhost:3002";
let count = 0;
function check(ok: unknown, label: string) {
  if (!ok) throw new Error("Clip check failed: " + label);
  count++;
  console.log("PASS " + label);
}
async function request(
  path: string,
  cookie?: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  origin = base,
) {
  try {
    return await (process.env.AUTH_SMOKE_VERCEL === "true" ? vercelFetch : fetch)(base + path, {
      method,
      headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new Error("Private operator request failed; details suppressed.");
  }
}
async function guest(url: string, options: RequestInit = {}) {
  try {
    return await fetch(url, { ...options, redirect: "manual", signal: AbortSignal.timeout(30000) });
  } catch {
    throw new Error("Guest operator request failed; details suppressed.");
  }
}
async function login(file: string) {
  const credentials = JSON.parse(await readFile(file, "utf8"));
  const response = await request("/api/auth/sign-in/email", undefined, credentials);
  const cookie = response.headers
    .getSetCookie()
    .find((s) => s.includes("session_token="))
    ?.split(";")[0];
  check(response.ok && cookie, "private operator sign-in");
  return cookie!;
}
const { id } = JSON.parse(await readFile(".module-private/live-test.json", "utf8"));
const { path: sourcePath } = JSON.parse(
  await readFile(".module-private/clip-test-source.json", "utf8"),
);
const source = await readFile(sourcePath);
const baseline = JSON.parse(
  await readFile(".module-private/recognition-signal-audit.json", "utf8"),
);
check(
  createHash("sha256").update(source).digest("hex") === baseline.originalSha256,
  "original source hash preserved",
);
if (!ffmpeg) throw new Error("Decoder unavailable.");
const decoded = spawnSync(
  ffmpeg,
  [
    "-nostdin",
    "-v",
    "error",
    "-i",
    sourcePath,
    "-vn",
    "-af",
    "aformat=sample_fmts=s16:sample_rates=16000:channel_layouts=mono",
    "-f",
    "s16le",
    "pipe:1",
  ],
  { maxBuffer: 15000000, stdio: ["ignore", "pipe", "ignore"] },
);
check(decoded.status === 0, "independent original audio decode");
const full = decoded.stdout;
let a = "",
  b = "";
const created: string[] = [];
const links: string[] = [];
try {
  a = await login(".module-private/local-account.json");
  b = await login(".module-private/second-account.json");
  let saved = await (await request(`/api/meetings/${id}`, a)).json();
  const originalSegments = JSON.stringify(saved.meeting.segments),
    originalHighlights = JSON.stringify(saved.state.highlights);
  const previewPath = `/api/meetings/${id}/clips/preview`;
  check(
    (await request(previewPath, undefined, { id: "fixture", title: "Fixture", start: 0, end: 1 }))
      .status === 401,
    "anonymous clip preparation denied",
  );
  check(
    (await request(previewPath, b, { id: "fixture", title: "Fixture", start: 0, end: 1 }))
      .status === 404,
    "cross-account clip preparation denied",
  );
  check(
    (
      await request(
        previewPath,
        a,
        { id: "fixture", title: "Fixture", start: 0, end: 1 },
        "POST",
        "https://wrong.invalid",
      )
    ).status === 403,
    "cross-origin clip preparation denied",
  );
  for (const range of [
    [-1, 2],
    [2, 1],
    [0, 121],
    [0, 9999],
  ])
    check(
      (
        await request(previewPath, a, {
          id: "fixture",
          title: "Fixture",
          start: range[0],
          end: range[1],
        })
      ).status === 400,
      "invalid clip range denied",
    );
  const ranges = [
    saved.meeting.segments[0],
    saved.meeting.segments[Math.floor(saved.meeting.segments.length / 2)],
    saved.meeting.segments.at(-1),
  ];
  for (const [index, segment] of ranges.entries()) {
    const clip = {
      id: randomUUID(),
      title: "Module 2 range verification",
      start: segment.start,
      end: segment.end,
    };
    created.push(clip.id);
    saved = await (await request(`/api/meetings/${id}`, a)).json();
    const state = { ...saved.state, clips: [...(saved.state.clips ?? []), clip] };
    const put = await request(`/api/meetings/${id}`, a, { state, revision: saved.revision }, "PUT");
    check(put.ok, "real clip persists in owner workspace");
    const preview = await request(previewPath, a, clip);
    check(preview.ok, "real range preview prepared");
    const previewWav = Buffer.from(await preview.arrayBuffer());
    const expectedSize = (Math.round(clip.end * 16000) - Math.round(clip.start * 16000)) * 2;
    check(previewWav.readUInt32LE(40) === expectedSize, "preview duration is sample accurate");
    const shared = await request("/api/shares", a, {
      meetingId: id,
      clip,
      state,
      visibility: "unlisted",
      confirmPublic: true,
    });
    check(shared.ok, "explicit owner share prepared");
    const link = await shared.json();
    const url = link.url ?? base + link.path;
    links.push(url);
    check(
      new URL(url).hostname === "sounding-clips-umair-rathore.vercel.app",
      "share points to clip-only public viewer",
    );
    const page = await guest(url);
    const html = await page.text();
    check(
      page.status === 200 && html.includes("Shared clip"),
      "external page opens without cookies or login",
    );
    check(
      !html.includes(id) &&
        !html.includes(saved.meeting.mediaUrl) &&
        !html.includes("ACTION ITEMS"),
      "viewer exposes no source identifiers, full media endpoint or internal notes",
    );
    const token = link.path.slice("/share/".length);
    const media = new URL(`/api/clips/${token}/media`, url).href;
    const audio = await guest(media);
    const wav = Buffer.from(await audio.arrayBuffer());
    check(
      audio.ok &&
        audio.headers.get("content-type") === "audio/wav" &&
        !audio.headers.get("location"),
      "guest receives only extracted WAV, never source redirect",
    );
    const expected = full.subarray(
      Math.round(clip.start * 16000) * 2,
      Math.round(clip.end * 16000) * 2,
    );
    check(
      wav.subarray(44).equals(expected),
      "beginning/middle/ending PCM matches independent source interval exactly",
    );
    check(wav.readUInt32LE(40) === expectedSize, "external media duration matches saved clip");
    const partial = await guest(media, { headers: { range: "bytes=0-127" } });
    check(
      partial.status === 206 && (await partial.arrayBuffer()).byteLength === 128,
      "browser byte-range playback is excerpt scoped",
    );
    check(
      (await guest(media, { headers: { range: `bytes=${wav.length + 100}-` } })).status === 416,
      "outside excerpt bytes denied",
    );
    check(
      (await request("/api/shares", b, { meetingId: id, clipId: clip.id }, "DELETE")).status ===
        404,
      "other account cannot revoke owner share",
    );
    check(
      (await request("/api/shares", a, { meetingId: id, clipId: clip.id }, "DELETE")).ok,
      "owner revokes shared clip",
    );
    check(
      (await guest(url)).status === 404 && (await guest(media)).status === 404,
      "revocation immediately denies page and media",
    );
    console.log("Verified real media range " + (index + 1) + " without printing private content.");
  }
  saved = await (await request(`/api/meetings/${id}`, a)).json();
  check(
    JSON.stringify(saved.meeting.segments) === originalSegments &&
      JSON.stringify(saved.state.highlights) === originalHighlights,
    "original transcript and highlights preserved",
  );
  await writeFile(
    ".module-private/module2-http-shares.json",
    JSON.stringify({ links, revoked: true }, null, 2),
  );
} finally {
  if (a) {
    try {
      const saved = await (await request(`/api/meetings/${id}`, a)).json();
      await request(
        `/api/meetings/${id}`,
        a,
        {
          state: {
            ...saved.state,
            clips: (saved.state.clips ?? []).filter((c: { id: string }) => !created.includes(c.id)),
          },
          revision: saved.revision,
        },
        "PUT",
      );
    } catch {}
    await request("/api/auth/sign-out", a, {});
  }
  if (b) await request("/api/auth/sign-out", b, {});
}
console.log(count + " clip security and real-media checks passed. No AI requests made.");
