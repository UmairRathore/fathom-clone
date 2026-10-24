import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const secrets = [];
for (const file of [".env.local", ".env.auth.local"]) {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    continue;
  }
  for (const line of text.split(/\r?\n/)) {
    const at = line.indexOf("="),
      name = line.slice(0, at),
      value = line.slice(at + 1).replace(/^["']|["']$/g, "");
    if (
      [
        "DATABASE_URL",
        "BETTER_AUTH_SECRET",
        "DEMO_PASSWORD",
        "SHARE_SECRET",
        "GOOGLE_CLIENT_SECRET",
        "RESEND_API_KEY",
        "OPEN_AI_APIKEY",
        "OPENAI_API_KEY",
        "BLOB_READ_WRITE_TOKEN",
      ].includes(name) &&
      value.length >= 12
    ) {
      secrets.push(value);
      if (name === "DATABASE_URL") {
        try {
          secrets.push(decodeURIComponent(new URL(value).password));
        } catch {
          /* Do not print malformed connection values. */
        }
      }
    }
  }
}
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
  .toString()
  .split("\0")
  .filter(Boolean);
let count = 0;
for (const file of files) {
  if (/\.(png|jpg|jpeg|wav|ico|woff2?|ttf)$/.test(file)) continue;
  const buffer = await readFile(file);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  if (secrets.some((secret) => secret.length >= 12 && text.includes(secret)))
    throw new Error("Configured secret detected in candidate text file: " + file);
  count++;
}
console.log(
  "Reviewed " +
    count +
    " candidate text files, including automatic logs: valid UTF-8 and no configured secret values detected.",
);
