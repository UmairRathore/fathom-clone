import test from "node:test";
import assert from "node:assert/strict";
import { parseVercelResponse } from "../scripts/vercel-fetch";
test("protected-preview test transport preserves binary clip bytes and ignores header-like media content", async () => {
  const body = Buffer.concat([
    Buffer.from([0, 255, 128, 192, 13, 10]),
    Buffer.from("HTTP/1.1 500 fixture\r\n\r\n"),
    Buffer.from([254, 0, 129]),
  ]);
  const raw = Buffer.concat([
    Buffer.from(
      "HTTP/1.1 200 Connection established\r\n\r\nHTTP/2 200 OK\r\nContent-Type: audio/wav\r\nCache-Control: no-store\r\n\r\n",
    ),
    body,
  ]);
  const response = parseVercelResponse(raw);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "audio/wav");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
  const json = parseVercelResponse(
    Buffer.from('HTTP/2 200 OK\r\nContent-Type: application/json\r\n\r\n{"label":"مرحبا"}'),
  );
  assert.equal((await json.json()).label, "مرحبا");
});
