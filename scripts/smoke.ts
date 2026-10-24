import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { meetings } from "../src/lib/data";
import { defaultState } from "../src/lib/state";
import { sealShare, SHARE_TTL } from "../src/lib/sharing";
try {
  loadEnvFile(".env.local");
} catch {
  /* Remote smoke tests need no local credentials. */
}
const base = new URL(process.argv[2] ?? "http://localhost:3001");
if (!["http:", "https:"].includes(base.protocol)) throw new Error("Use an HTTP(S) application URL");
let count = 0;
async function check(label: string, run: () => Promise<void>) {
  await run();
  count++;
  console.log(`PASS ${label}`);
}
const fetchApp = (path: string, options?: RequestInit) =>
  fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(15000) });
await check("dashboard serves populated fictional meetings", async () => {
  const response = await fetchApp("/home");
  assert.equal(response.status, 200);
  assert((await response.text()).includes("Atlas"));
});
await check("unknown meeting returns 404", async () => {
  assert.equal((await fetchApp("/calls/no-such-meeting")).status, 404);
});
await check("audio supports HTTP byte-range playback", async () => {
  const response = await fetchApp("/media/atlas-review.wav", { headers: { Range: "bytes=0-43" } });
  assert.equal(response.status, 206);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.length, 44);
});
await check("invalid share link exposes no meeting data", async () => {
  const response = await fetchApp("/share/v1.invalid");
  assert.equal(response.status, 404);
  assert(!(await response.text()).includes("Complete search regression tests"));
});
const state = defaultState(meetings[0]);
state.actions.push({
  id: "smoke-action",
  text: "HTTP snapshot verification item",
  time: 5,
  done: true,
  assignee: "alex",
});
const post = (body: string, origin = base.origin) =>
  fetchApp("/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body,
  });
await check("foreign origins are rejected", async () => {
  assert.equal((await post("{}", "https://foreign.example.test")).status, 403);
});
await check("malformed JSON is rejected", async () => {
  assert.equal((await post("not-json")).status, 400);
});
await check("oversized snapshots are rejected", async () => {
  assert.equal((await post("x".repeat(65000))).status, 413);
});
await check("invalid participant references are rejected", async () => {
  const invalid = { ...state, actions: [{ ...state.actions[0], assignee: "missing-person" }] };
  assert.equal(
    (
      await post(
        JSON.stringify({ meetingId: "atlas-launch", visibility: "unlisted", state: invalid }),
      )
    ).status,
    400,
  );
});
await check("public snapshot is readable without cookies or authentication", async () => {
  const created = await post(
    JSON.stringify({ meetingId: "atlas-launch", visibility: "unlisted", state }),
  );
  assert.equal(created.status, 200, await created.clone().text());
  const { path } = await created.json();
  const response = await fetchApp(path);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert(html.includes("HTTP snapshot verification item"));
  assert(html.includes("Read-only"));
});
await check("restricted snapshot cannot be opened by a guest", async () => {
  const created = await post(
    JSON.stringify({ meetingId: "atlas-launch", visibility: "restricted", state }),
  );
  assert.equal(created.status, 200);
  const { path } = await created.json();
  const response = await fetchApp(path);
  assert.equal(response.status, 404);
  assert(!(await response.text()).includes("HTTP snapshot verification item"));
});
if (["localhost", "127.0.0.1"].includes(base.hostname) && process.env.SHARE_SECRET) {
  const secret = process.env.SHARE_SECRET;
  await check("expired local snapshot is rejected over HTTP", async () => {
    const now = Date.now() - SHARE_TTL - 2000;
    const token = sealShare(
      {
        version: 1,
        meetingId: "atlas-launch",
        visibility: "unlisted",
        issuedAt: now,
        expiresAt: now + SHARE_TTL,
        state,
      },
      secret,
    );
    assert.equal((await fetchApp(`/share/${token}`)).status, 404);
  });
}
console.log(
  `${count} production HTTP checks passed. No cookies, auth headers, or real meeting content were used.`,
);
