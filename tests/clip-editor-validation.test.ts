import assert from "node:assert/strict";
import { test } from "node:test";
import { clipEditorError } from "../src/lib/clip-editor-validation";

test("clip editor accepts the reported fractional range and corrected inputs", () => {
  const validate = (start: string, end: string, title = "Module 2 deployed verification") =>
    clipEditorError(title, start, end, 267.833);
  assert.equal(validate("251.284", "255.534"), "");
  assert.equal(validate("251.284", "251.284"), "End time must be after start time.");
  assert.equal(validate("251.284", "255.534"), "");
  assert.equal(validate("251.284", "255.534", " "), "Enter a clip title.");
  assert.equal(validate("", "255.534"), "Enter valid start and end times in seconds.");
  assert.equal(validate("-1", "4"), "Start time must be zero or later.");
  assert.equal(validate("251.284", "267.834"), "End time must be within the recording.");
  assert.equal(validate("251.284", "251.383"), "Select at least 0.1 seconds.");
  assert.equal(validate("0", "120.001"), "Select no more than 120 seconds.");
  assert.equal(validate("251.284", "251.384"), "");
  assert.equal(validate("0.001", "120.001"), "");
  assert.equal(validate("267.733", "267.833"), "");
});
