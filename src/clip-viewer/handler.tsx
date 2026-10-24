import type { IncomingMessage, ServerResponse } from "node:http";
import { renderToStaticMarkup } from "react-dom/server";
import { ClipViewer } from "../components/clip-viewer";
import { publicClip } from "../lib/clip-shares";
import { getPool } from "../lib/db";
import { readRecording } from "../lib/recordings/storage";
import { clipAudioResponse, guestHeaders } from "../lib/clip-response";
/** Public deployment entry point. No owner/auth/workspace routes are exposed. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const parsed = new URL(req.url ?? "/", "https://clips.invalid");
  const path = parsed.searchParams.get("path")
    ? "/" + parsed.searchParams.get("path")
    : parsed.pathname;
  const match = /^\/(share|api\/clips)\/(v2\.[A-Za-z0-9_-]{43})(\/media)?$/.exec(path);
  for (const [name, value] of Object.entries(guestHeaders)) res.setHeader(name, value);
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'self'; style-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  if (!match || !["GET", "HEAD"].includes(req.method ?? "")) {
    res.statusCode = 404;
    res.end("Clip unavailable");
    return;
  }
  try {
    const grant = await publicClip(getPool(), match[2]);
    if (!grant) {
      res.statusCode = 404;
      res.end("Clip expired, revoked, or unavailable.");
      return;
    }
    if (match[1] === "api/clips" && match[3]) {
      if (!grant.media_key) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const bytes = await readRecording(grant.media_key);
      if (!(await publicClip(getPool(), match[2]))) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const request = new Request("https://clips.invalid/media", {
        method: req.method,
        headers: req.headers.range ? { range: req.headers.range } : {},
      });
      const response = clipAudioResponse(bytes, request);
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (match[1] === "api/clips") {
      res.setHeader("Content-Type", "application/json");
      res.end(req.method === "HEAD" ? undefined : JSON.stringify({ available: true }));
      return;
    }
    if (match[3]) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const html = renderToStaticMarkup(
      <ClipViewer
        {...grant.view}
        mediaUrl={grant.media_key ? `/api/clips/${match[2]}/media` : undefined}
        statusUrl={`/api/clips/${match[2]}`}
      />,
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      req.method === "HEAD"
        ? undefined
        : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Shared clip · Sounding</title><link rel="stylesheet" href="/clip-viewer.css"><script src="/clip-viewer.js" defer></script></head><body>${html}</body></html>`,
    );
  } catch {
    res.statusCode = 404;
    res.end("Clip unavailable");
  }
}
