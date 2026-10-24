import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env.local")) {
  writeFileSync(".env.local", `SHARE_SECRET=${randomBytes(32).toString("hex")}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  console.log(
    "Created an ignored .env.local with a random local share key. Configure SHARE_SECRET separately on your host; keep it stable for 24-hour links.",
  );
} else console.log("Existing .env.local preserved.");
