import assert from "node:assert/strict";
import { test } from "node:test";
import {
  liveAnnotation,
  appendLiveAnnotation,
  liveCategories,
  replayTime,
} from "../src/lib/live-capture";
import { meetings } from "../src/lib/data";
import { defaultState, restoreState } from "../src/lib/state";
import { validateMeetingState } from "../src/lib/workspace-store";

test("replay clock uses monotonic elapsed time, clamps end and supports paused speed changes", () => {
  assert.equal(replayTime(0, 100, 1600, 1, 300), 1.5);
  // Delayed callbacks do not lose the elapsed interval.
  assert.equal(replayTime(1.5, 2000, 7000, 30, 300), 151.5);
  assert.equal(replayTime(151.5, 8000, 9000, 120, 300), 271.5);
  assert.equal(replayTime(271.5, 9000, 20000, 120, 300), 300);
  assert.equal(replayTime(5, 1000, 500, 1, 300), 5);
});
test("live annotations preserve exact click time, note, manual provenance, stable IDs and categories", () => {
  const base = {
    id: "event",
    sessionId: "simulation",
    time: 13.284,
    duration: 106,
    note: "  Review this  ",
  };
  for (const category of liveCategories) {
    const h = liveAnnotation({ ...base, category });
    assert.equal(h.time, 13.284);
    assert.equal(h.end, 23.284);
    assert.equal(h.category, category);
    assert.equal(h.origin, "manual");
    assert.equal(h.captureSessionId, "simulation");
    assert.equal(h.description, "Review this");
    assert.equal(h.id, "event");
  }
  assert.equal(liveAnnotation({ ...base, time: 105.9, category: "Feedback" }).end, 106);
  for (const time of [-1, NaN, Infinity, 106])
    assert.throws(() => liveAnnotation({ ...base, time, category: "Highlight" }));
});
test("live annotation retries and rapid identical clicks do not duplicate or overwrite existing highlights", () => {
  const meeting = meetings[0];
  const h = liveAnnotation({
    id: "live",
    sessionId: "one",
    time: 13.284,
    duration: meeting.duration,
    category: "Highlight",
    note: "",
  });
  const initial = meeting.highlights;
  const once = appendLiveAnnotation(initial, h);
  assert.equal(once.length, initial.length + 1);
  assert.deepEqual(initial, meeting.highlights);
  assert.equal(appendLiveAnnotation(once, h), once);
  assert.equal(appendLiveAnnotation(once, { ...h, id: "retry", time: 13.4 }), once);
  assert.equal(
    appendLiveAnnotation(once, { ...h, id: "other", category: "Feedback" }).length,
    once.length + 1,
  );
  assert.equal(
    appendLiveAnnotation(once, { ...h, id: "new-session", captureSessionId: "two" }).length,
    once.length + 1,
  );
});
test("early finish and live annotations survive persistence with legacy captures compatible", () => {
  const meeting = meetings.find((m) => m.id === "atlas-launch")!;
  const h = liveAnnotation({
    id: "live",
    sessionId: "one",
    time: 13.284,
    duration: meeting.duration,
    category: "Needs Review",
    note: "Check playback",
  });
  const state = {
    ...defaultState(meeting),
    highlights: appendLiveAnnotation(meeting.highlights, h),
    capture: { sessionId: "one", stage: "ready" as const, elapsed: 17.2 },
  };
  assert.deepEqual(restoreState(JSON.stringify(state), meeting), state);
  assert.deepEqual(validateMeetingState(state, meeting), state);
  const legacy = { ...state, capture: { stage: "ready" as const, elapsed: meeting.duration } };
  assert.deepEqual(restoreState(JSON.stringify(legacy), meeting), legacy);
  assert.equal(
    validateMeetingState(
      { ...state, capture: { ...state.capture, elapsed: meeting.duration + 1 } },
      meeting,
    ),
    null,
  );
  assert.equal(
    validateMeetingState({ ...state, capture: { ...state.capture, stage: "scheduled" } }, meeting),
    null,
  );
  assert.equal(
    validateMeetingState({ ...state, highlights: [{ ...h, end: meeting.duration + 1 }] }, meeting),
    null,
  );
});
