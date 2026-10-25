import assert from "node:assert/strict";
import { vercelFetch } from "./vercel-fetch";
const base = process.env.SMOKE_URL ?? "http://localhost:3004";
const transport = process.env.AUTH_SMOKE_VERCEL === "true" ? vercelFetch : fetch;
let checks = 0;
function check(ok: unknown, label: string) {
  assert(ok, label);
  checks++;
  console.log("PASS " + label);
}
const send = (path: string, cookie?: string) =>
  transport(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
const routes = ["/team-calls", "/playlists", "/deals", "/settings"];
for (const route of routes) {
  const r = await send(route);
  check(
    r.status === 307 && r.headers.get("location") === "/users/sign_in",
    "anonymous access denied: " + route,
  );
}
const demo = await transport(base + "/api/demo", {
  method: "POST",
  headers: { origin: base, "Content-Type": "application/json" },
  body: "{}",
  redirect: "manual",
});
const cookie = demo.headers
  .getSetCookie()
  .find((v) => v.includes("session_token="))
  ?.split(";")[0];
check(demo.ok && cookie, "existing public demo signs in without new registration");
try {
  const pages: string[] = [];
  for (const route of routes) {
    const r = await send(route, cookie);
    check(r.ok, "protected surface renders: " + route);
    pages.push(await r.text());
  }
  for (const page of pages)
    for (const route of routes)
      check(page.includes(`href="${route}"`), "navigation retains " + route);
  check(
    pages[0].includes("SOUNDING TEAM EDITION") && pages[0].includes("Fictional illustration"),
    "team upsell contains fictional preview",
  );
  check(
    pages[1].includes("PLAYLISTS") && pages[1].includes("No billing"),
    "playlist upsell is labeled preview",
  );
  check(
    pages[2].includes("See the story behind every deal") &&
      pages[2].includes("Atlas · Team expansion"),
    "Deals paywall renders over fictional table",
  );
  const settings = pages[3];
  for (const title of [
    "VIDEO CONFERENCING",
    "PREMIUM FEATURES",
    "INTEGRATIONS",
    "API ACCESS",
    "OPTIONS",
    "SOUNDING APPS",
    "HIGHLIGHT OPTIONS",
    "DELETE ACCOUNT",
  ])
    check(settings.includes(title), "settings section renders: " + title);
  for (const title of [
    "Claude",
    "ChatGPT",
    "Zapier",
    "Slack",
    "Salesforce",
    "HubSpot",
    "GoHighLevel",
    "Task Manager",
  ])
    check(settings.includes(title), "static integration renders: " + title);
  const controls = [...settings.matchAll(/<(button|select)\b([^>]*)>/g)].map((m) => m[2]);
  check(
    controls.filter((c) => /\bdisabled(?:=|\s|$)/.test(c)).length >= 25,
    "settings mutation controls are disabled",
  );
  check(
    !settings.includes('href="https://accounts.google.com') &&
      !settings.includes('href="https://zoom.us/oauth'),
    "preview settings do not initiate provider authorization",
  );
  const meeting = await send("/api/meetings/atlas-launch", cookie);
  check(meeting.ok, "existing private meeting API remains accessible to its visitor");
  const recording = await send("/calls/atlas-launch", cookie);
  check(recording.ok, "core meeting page still renders with shared header");
} finally {
  if (cookie)
    await transport(base + "/api/auth/sign-out", {
      method: "POST",
      headers: { origin: base, cookie, "Content-Type": "application/json" },
      body: "{}",
    });
}
if (cookie)
  check((await send("/settings", cookie)).status === 307, "revoked session cannot reopen settings");
console.log(
  `${checks} locked-surface HTTP checks passed. No provider connection, purchase, account deletion or paid API call occurred.`,
);
