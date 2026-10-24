import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const target = ".vercel/cleanup-project";
await mkdir(target + "/api", { recursive: true });
await mkdir(target + "/public", { recursive: true });
await build({
  entryPoints: ["src/cleanup/handler.ts"],
  outfile: target + "/api/cleanup.mjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  packages: "external",
});
const main = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(
  target + "/package.json",
  JSON.stringify(
    {
      name: "sounding-preview-cleanup",
      private: true,
      type: "module",
      engines: { node: "24.x" },
      dependencies: Object.fromEntries(
        ["pg", "@vercel/blob"].map((k) => [k, main.dependencies[k]]),
      ),
    },
    null,
    2,
  ),
);
await writeFile(
  target + "/vercel.json",
  JSON.stringify(
    {
      framework: null,
      buildCommand: 'node -e "process.exit(0)"',
      outputDirectory: "public",
      functions: { "api/cleanup.mjs": { maxDuration: 60 } },
      crons: [{ path: "/api/cleanup", schedule: "17 0 * * *" }],
    },
    null,
    2,
  ),
);
await writeFile(target + "/public/robots.txt", "User-agent: *\nDisallow: /\n");
console.log("Built isolated cleanup job. No application UI or private fixtures copied.");
