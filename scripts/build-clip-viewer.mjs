import { build } from "esbuild";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
const target = ".vercel/clip-viewer-project";
await mkdir(target + "/api", { recursive: true });
await mkdir(target + "/public", { recursive: true });
await build({
  entryPoints: ["src/clip-viewer/handler.tsx"],
  outfile: target + "/api/guest.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
  jsx: "automatic",
  tsconfig: "tsconfig.json",
});
const main = JSON.parse(readFileSync("package.json", "utf8"));
const dependencies = Object.fromEntries(
  ["pg", "@vercel/blob", "react", "react-dom", "zod"].map((k) => [k, main.dependencies[k]]),
);
await writeFile(
  target + "/package.json",
  JSON.stringify(
    {
      name: "sounding-clip-viewer",
      private: true,
      type: "module",
      engines: { node: "24.x" },
      dependencies,
    },
    null,
    2,
  ),
);
await writeFile(
  target + "/vercel.json",
  JSON.stringify(
    {
      version: 2,
      framework: null,
      buildCommand: 'node -e "process.exit(0)"',
      outputDirectory: "public",
      functions: { "api/guest.mjs": { maxDuration: 30 } },
      rewrites: [
        { source: "/share/:token", destination: "/api/guest?path=share/:token" },
        {
          source: "/api/clips/:token/media",
          destination: "/api/guest?path=api/clips/:token/media",
        },
        { source: "/api/clips/:token", destination: "/api/guest?path=api/clips/:token" },
      ],
      headers: [
        {
          source: "/(.*)",
          headers: [
            { key: "Referrer-Policy", value: "no-referrer" },
            { key: "X-Robots-Tag", value: "noindex, nofollow" },
            { key: "Cache-Control", value: "private, no-store" },
          ],
        },
      ],
    },
    null,
    2,
  ),
);
for (const file of ["clip-viewer.js", "clip-viewer.css"])
  await copyFile("public/" + file, target + "/public/" + file);
await writeFile(
  target + "/public/index.html",
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Sounding clips</title><h1>Sounding</h1><p>Open a clip link shared by its owner.</p></html>',
);
console.log(
  "Built a clip-only public viewer with shared validation and UI. No private fixtures copied.",
);
