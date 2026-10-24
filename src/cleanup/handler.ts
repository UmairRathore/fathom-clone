import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { del } from "@vercel/blob";
import { getPool } from "../lib/db";
import { cleanupTemporaryAccounts } from "../lib/temporary-cleanup";
export default async function handler(request: IncomingMessage, response: ServerResponse) {
  response.setHeader("Cache-Control", "no-store");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`,
    provided = request.headers.authorization ?? "";
  if (
    request.method !== "GET" ||
    !process.env.CRON_SECRET ||
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    response.statusCode = 401;
    response.end();
    return;
  }
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error();
    const result = await cleanupTemporaryAccounts(getPool(), async (keys) => {
      await del(keys);
    });
    response.statusCode = result.failed ? 503 : 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(result));
  } catch {
    response.statusCode = 503;
    response.end("Cleanup will retry on the next scheduled run.");
  }
}
