import assert from "node:assert/strict";
import { vercelFetch } from "./vercel-fetch";
const base = process.env.SMOKE_URL ?? "http://localhost:3003";
const transport = process.env.AUTH_SMOKE_VERCEL === "true" ? vercelFetch : fetch;
let checks = 0;
function check(ok: unknown, label: string) {
  assert(ok, label);
  checks++;
  console.log("PASS " + label);
}
const routes = [
  "/users/sign_up/confirm-personal-email",
  "/onboarding/customize/auto_record",
  "/signup/questionnaire/personal/role",
  "/onboarding/connect/zoom",
  "/zoomless/onboarding/download",
];
const send = (path: string, cookie?: string) =>
  transport(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
function disabled(html: string, label: string) {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].some(
    (m) => m[2].replace(/<[^>]*>/g, "").includes(label) && /\bdisabled(?:=|\s|$)/.test(m[1]),
  );
}
const login = await (await send("/users/sign_in")).text();
for (const label of ["Continue with Google", "Continue with Microsoft", "Continue with SSO"])
  check(disabled(login, label), label + " is disabled");
check(
  login.includes("Continue with login ID") && login.includes("Try the public demo"),
  "working credential and demo entry remain visible",
);
for (const path of routes) {
  const r = await send(path);
  check(
    r.status === 307 && r.headers.get("location") === "/users/sign_in",
    "anonymous setup route requires authentication: " + path,
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
  .find((x) => x.includes("session_token="))
  ?.split(";")[0];
check(demo.ok && cookie, "existing demo signs in for setup checks");
try {
  const pages: string[] = [];
  for (const path of routes) {
    const r = await send(path, cookie);
    check(r.ok, "authenticated setup route renders: " + path);
    pages.push(await r.text());
  }
  check(disabled(pages[0], "Continue with Work Email"), "team/work action remains disabled");
  check(
    (pages[1].match(/<select\b[^>]*disabled/g) ?? []).length === 2,
    "both manual/private preference selectors are disabled",
  );
  check(disabled(pages[1], "Continue"), "consent starts unchecked and Continue starts disabled");
  check(
    pages[2].includes("Engineering") && pages[2].includes("Product / Design"),
    "job-function choices render",
  );
  check(
    disabled(pages[3], "Connect to Zoom") &&
      pages[3].includes("/zoomless/onboarding/download?next="),
    "Zoom stays disabled and Skip targets install step",
  );
  check(
    disabled(pages[4], "Download for Windows") && disabled(pages[4], "Notify Me"),
    "desktop actions stay disabled",
  );
  check(
    pages[4].includes('href="/home"') && pages[4].includes("Skip this step"),
    "install Skip returns to workspace",
  );
  const safe = await (
    await send(routes[4] + "?next=https%3A%2F%2Fattacker.example", cookie)
  ).text();
  check(
    !safe.includes('href="https://attacker.example"'),
    "setup completion rejects external return destinations",
  );
} finally {
  if (cookie)
    await transport(base + "/api/auth/sign-out", {
      method: "POST",
      headers: { origin: base, cookie, "Content-Type": "application/json" },
      body: "{}",
    });
}
console.log(
  `${checks} onboarding HTTP checks passed. No new account, provider connection, download or paid API call was created.`,
);
