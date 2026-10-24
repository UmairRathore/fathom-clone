// Read-only audit. Report counts/booleans only; never print credentials or matching contents.
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const secrets = new Set<string>();
for (const file of [".env.local", ".env.auth.local"]) {
  let source = "";
  try {
    source = await readFile(file, "utf8");
  } catch {
    continue;
  }
  for (const line of source.split(/\r?\n/)) {
    const at = line.indexOf("="),
      name = line.slice(0, at),
      value = line
        .slice(at + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    if (
      /^(DATABASE_URL|BETTER_AUTH_SECRET|DEMO_PASSWORD|SHARE_SECRET|GOOGLE_CLIENT_SECRET|RESEND_API_KEY|SMTP_PASS|TEMPORARY_CLEANUP_SECRET|CRON_SECRET|OPEN_AI_APIKEY|OPENAI_API_KEY|BLOB_READ_WRITE_TOKEN)$/.test(
        name,
      ) &&
      value.length >= 12
    ) {
      secrets.add(value);
      if (name === "DATABASE_URL")
        try {
          secrets.add(decodeURIComponent(new URL(value).password));
        } catch {
          /* no output */
        }
    }
  }
}
for (const file of [".module-private/local-account.json", ".module-private/second-account.json"]) {
  try {
    const account = JSON.parse(await readFile(file, "utf8"));
    if (account.password?.length >= 12) secrets.add(account.password);
  } catch {
    /* optional operator fixture */
  }
}
const needles = [...secrets].filter((v) => v.length >= 12).map((v) => Buffer.from(v));
if (!needles.length) throw new Error("No configured secret references available for audit.");
const contains = (b: Buffer) => needles.some((n) => b.includes(n));
let logFiles = 0;
for (const name of await readdir(".agent-logs")) {
  if (!name.endsWith(".md")) continue;
  if (contains(await readFile(".agent-logs/" + name)))
    throw new Error("Configured secret found in automatic logs; content suppressed.");
  logFiles++;
}
const ids = execFileSync("git", ["rev-list", "--objects", "--all"], { maxBuffer: 32 * 1024 * 1024 })
  .toString()
  .split("\n")
  .filter(Boolean)
  .map((l) => l.split(" ")[0]);
const objects = execFileSync("git", ["cat-file", "--batch"], {
  input: ids.join("\n") + "\n",
  maxBuffer: 256 * 1024 * 1024,
});
let offset = 0,
  blobs = 0;
while (offset < objects.length) {
  const end = objects.indexOf(10, offset);
  if (end < 0) throw new Error("Git object audit incomplete.");
  const [, type, size] = objects.subarray(offset, end).toString().split(" ");
  const length = Number(size);
  if (!Number.isFinite(length)) throw new Error("Git object audit incomplete.");
  const body = objects.subarray(end + 1, end + 1 + length);
  if (type === "blob") {
    if (contains(body))
      throw new Error("Configured secret found in reachable Git history; content suppressed.");
    blobs++;
  }
  offset = end + 1 + length + 1;
}
let assets = 0;
async function scanClient(path: string) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const next = path + "/" + entry.name;
    if (entry.isDirectory()) await scanClient(next);
    else {
      if (contains(await readFile(next)))
        throw new Error("Configured secret found in browser assets; content suppressed.");
      assets++;
    }
  }
}
await scanClient(".next/static");
const head = execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
const remote = execFileSync("git", ["rev-parse", "origin/codex/authentication-preview"])
  .toString()
  .trim();
console.log(
  JSON.stringify({
    configuredSecretReferences: needles.length,
    automaticLogsChecked: logFiles,
    reachableGitBlobsChecked: blobs,
    clientAssetsChecked: assets,
    configuredSecretsAbsent: true,
    headMatchesPublishedBranch: head === remote,
    scope:
      "Current configured secrets and QA passwords; not a general historical credential discovery guarantee.",
  }),
);
