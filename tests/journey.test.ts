import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { meetings } from "../src/lib/data";
import { defaultState, restoreState } from "../src/lib/state";
import { captureTransition, clipSegments, parseTimestamp, validClip } from "../src/lib/journey";
import { extractWav } from "../src/lib/clip-media";
import { sealShare, openShare, SHARE_TTL } from "../src/lib/sharing";
const meeting = meetings.find((m) => m.id === "atlas-launch")!;
const clip = { id: "test", title: "Search decision", start: 13, end: 29 };
test("clip ranges reject reversed, negative, nonfinite and out-of-recording bounds", () => {
  assert(validClip(clip, meeting));
  for (const range of [
    { start: 29, end: 13 },
    { start: -1, end: 5 },
    { start: 0, end: Infinity },
    { start: 0, end: meeting.duration + 1 },
    { start: NaN, end: 3 },
  ])
    assert(!validClip({ ...clip, ...range }, meeting));
  const state = { ...defaultState(meeting), clips: [{ ...clip, end: 999 }] };
  assert.deepEqual(restoreState(JSON.stringify(state), meeting), defaultState(meeting));
});
test("clip transcript excludes nonintersecting utterances and clamps boundary timestamps", () => {
  const selected = clipSegments(meeting.segments, clip);
  assert(selected.length > 0 && selected.length < meeting.segments.length);
  assert(selected.every((s) => s.start >= clip.start && s.end <= clip.end));
  assert(!selected.some((s) => s.id === meeting.segments.at(-1)!.id));
});
test("exported WAV contains exactly the selected PCM frames, with a valid standalone header", () => {
  const original = readFileSync("public/media/atlas-review.wav");
  const out = extractWav(original, clip.start, clip.end);
  assert.equal(out.toString("ascii", 0, 4), "RIFF");
  assert.equal(out.readUInt32LE(4), out.length - 8);
  const rate = out.readUInt32LE(28),
    align = out.readUInt16LE(32);
  assert(Math.abs(out.readUInt32LE(40) / rate - (clip.end - clip.start)) <= align / rate);
  assert(out.length < original.length);
  assert.throws(() => extractWav(original, -1, 5));
  assert.throws(() => extractWav(original, 0, 9999));
  assert.throws(() => extractWav(Buffer.from("invalid"), 0, 1));
});
test("clip bounds are authenticated with the share and expire or fail on tampering", () => {
  const secret = "unit-only-random-independent-key-123456789";
  const issuedAt = Date.now();
  const token = sealShare(
    {
      version: 1,
      meetingId: meeting.id,
      clip,
      visibility: "unlisted",
      issuedAt,
      expiresAt: issuedAt + SHARE_TTL,
      state: defaultState(meeting),
    },
    secret,
  );
  assert.deepEqual(openShare(token, secret)?.clip, clip);
  assert.equal(openShare(token, secret, issuedAt + SHARE_TTL), null);
  assert.equal(openShare(token.slice(0, -8) + "aaaaaaaa", secret), null);
});
test("long meeting time navigation validates timestamps and replay follows ordered stages", () => {
  assert.equal(parseTimestamp("52:30", 3600), 3150);
  assert.equal(parseTimestamp("60:00", 3600), 3600);
  for (const text of ["60:01", "5:99", "-1:00", "abc", "1:02:03"])
    assert.equal(parseTimestamp(text, 3600), null);
  assert(captureTransition("recording", "processing"));
  assert(!captureTransition("connected", "ready"));
  assert(!captureTransition("ready", "recording"));
  const original = defaultState(meeting);
  assert.deepEqual(
    restoreState(JSON.stringify({ ...original, capture: { stage: "ready", elapsed: 1 } }), meeting),
    original,
  );
  assert.deepEqual(restoreState(JSON.stringify(original), meeting), original);
  const changed = { ...original, clips: [clip], capture: { stage: "recording", elapsed: 20 } };
  assert.deepEqual(restoreState(JSON.stringify(changed), meeting), changed);
});
