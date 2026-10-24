import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { meetings } from "../src/lib/data";
import { activeSegment, searchMeetings } from "../src/lib/domain";

test("all fixtures preserve speaker references and timeline relationships", () => {
  for (const meeting of meetings) {
    const ids = new Set(meeting.participants.map(p => p.id));
    let end = 0;
    for (const segment of meeting.segments) {
      assert(ids.has(segment.speakerId), `${meeting.id}: missing speaker`);
      assert(segment.start >= end, `${meeting.id}: overlapping segment`);
      assert(segment.end > segment.start && segment.end <= meeting.duration);
      end = segment.end;
    }
    assert.equal(end, meeting.duration);
    for (const action of meeting.actions) {
      assert(action.time >= 0 && action.time < meeting.duration);
      if(action.assignee) assert(ids.has(action.assignee));
    }
    for(const highlight of meeting.highlights) assert(highlight.time >= 0 && highlight.end > highlight.time && highlight.end <= meeting.duration);
  }
});
test("PCM media duration matches the actual transcript, within one audio frame", () => {
  const wav = readFileSync("public/media/atlas-review.wav");
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  let offset = 12, byteRate = 0, blockAlign = 0, length = 0;
  while(offset + 8 <= wav.length) {
    const name = wav.toString("ascii", offset, offset+4), size = wav.readUInt32LE(offset+4);
    if(name === "fmt ") { byteRate = wav.readUInt32LE(offset+16); blockAlign = wav.readUInt16LE(offset+20); }
    if(name === "data") length = size;
    offset += 8 + size + size % 2;
  }
  assert(byteRate > 0 && length > 0);
  const meeting = meetings.find(m => m.id === "atlas-launch")!;
  assert(Math.abs(length / byteRate - meeting.duration) <= blockAlign / byteRate);
  assert.equal(meeting.segments.at(-1)!.end, meeting.duration);
});
test("timestamp lookup works at early, middle, late, and quantized media boundaries", () => {
  const short = meetings[0];
  assert.equal(activeSegment(short.segments, 0), 0);
  assert.equal(activeSegment(short.segments, short.segments[4].start - 0.00001), 4);
  assert.equal(activeSegment(short.segments, short.duration), 7);
  const long = meetings.find(m => m.id === "quarterly-planning")!;
  assert.equal(new Set(long.segments.map(s => s.speakerId)).size, 8);
  assert.equal(long.segments.length, 240);
  assert.equal(activeSegment(long.segments, 3540), 236);
});
test("search indexes titles, participants, summary text, and late transcript content", () => {
  assert(searchMeetings(meetings, "launch review").some(m => m.id === "atlas-launch"));
  assert(searchMeetings(meetings, "Priya Shah").some(m => m.id === "quarterly-planning"));
  assert(searchMeetings(meetings, "amber lighthouse").some(m => m.id === "quarterly-planning"));
  assert(searchMeetings(meetings, "invite button contrast").some(m => m.id === "design-critique"));
  assert.equal(searchMeetings(meetings, "no-such-phrase-90210").length, 0);
});
