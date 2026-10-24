import { createRequire } from "node:module";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const binary = require("ffmpeg-static");
if (!binary) throw new Error("This build platform does not support clip audio extraction.");
try {
  await access(binary, constants.X_OK);
} catch {
  execFileSync(process.execPath, [join(dirname(require.resolve("ffmpeg-static")), "install.js")], {
    stdio: "inherit",
    timeout: 120000,
  });
  await access(binary, constants.X_OK);
}
console.log("Clip audio decoder is available for this build platform.");
