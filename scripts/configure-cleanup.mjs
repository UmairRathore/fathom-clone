import nextEnv from "@next/env";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
nextEnv.loadEnvConfig(process.cwd());
const directory = ".vercel/cleanup-project",
  project = "sounding-preview-cleanup";
const linked = JSON.parse(await readFile(directory + "/.vercel/project.json", "utf8"));
if (linked.projectName !== project || linked.orgId !== "team_L5Fthhc4UsS8ZVhpDTFM8pzJ")
  throw new Error("Cleanup project guard failed.");
let secret = process.env.TEMPORARY_CLEANUP_SECRET;
if (!secret) {
  secret = randomBytes(32).toString("hex");
  await writeFile(
    ".env.local",
    (await readFile(".env.local", "utf8")) + "\nTEMPORARY_CLEANUP_SECRET=" + secret + "\n",
    { mode: 0o600 },
  );
}
for (const [key, value] of [
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["BLOB_READ_WRITE_TOKEN", process.env.BLOB_READ_WRITE_TOKEN],
  ["CRON_SECRET", secret],
]) {
  if (!value) throw new Error("Required cleanup environment is missing.");
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.env.VERCEL_CLI ?? "vercel",
      [
        "env",
        "add",
        key,
        "--environment",
        "production",
        "--sensitive",
        "--force",
        "--yes",
        "--project",
        project,
        "--scope",
        "umair-rathore",
        "--cwd",
        directory,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    child.stdout.resume();
    child.stderr.resume();
    child.stdin.end(value);
    child.on("error", () => reject(new Error("Secure configuration transfer failed.")));
    child.on("exit", (code) =>
      code === 0 ? resolve(null) : reject(new Error("Secure configuration transfer failed.")),
    );
  });
}
console.log(
  "Configured only preview database, private storage and cleanup authorization. Secret values suppressed.",
);
