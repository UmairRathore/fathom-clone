import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const file = ".env.local";
let text = await readFile(file, "utf8");
for (const [key, value] of Object.entries({
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  BETTER_AUTH_URL: "http://localhost:3002",
  DEMO_EMAIL: "demo@sounding.example",
  DEMO_PASSWORD: randomBytes(24).toString("base64url"),
})) {
  if (!new RegExp("^" + key + "=", "m").test(text))
    text = text.trimEnd() + "\n" + key + "=" + value + "\n";
}
const databaseLine = text.match(/^DATABASE_URL=(.*)$/m);
if (databaseLine) {
  const url = new URL(databaseLine[1]);
  if (url.hostname.endsWith(".neon.tech")) {
    url.searchParams.set("sslmode", "verify-full");
    text = text.replace(/^DATABASE_URL=.*$/m, "DATABASE_URL=" + url.toString());
  }
}

await writeFile(file, text, { mode: 0o600 });
await chmod(file, 0o600);
console.log("Ignored authentication environment configured. No secret values printed.");
