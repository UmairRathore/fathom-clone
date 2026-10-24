import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
export async function vercelFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const args = [
    "exec",
    "--yes",
    "--package=vercel@65.2.0",
    "--",
    "vercel",
    "curl",
    url,
    "--scope",
    "umair-rathore",
    "--",
    "--silent",
    "--show-error",
    "--include",
    "--request",
    options.method ?? "GET",
  ];
  // Keep cookies and request bodies out of process arguments and CLI diagnostics.
  const parent = join(process.cwd(), ".vercel");
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, "curl-"));
  const config = join(directory, "request.conf"),
    body = join(directory, "body.txt");
  const lines = [...headers].map(
    ([name, value]) => "header = " + JSON.stringify(name + ": " + value),
  );
  if (typeof options.body === "string") {
    await writeFile(body, options.body, { mode: 0o600 });
    lines.push("data-binary = " + JSON.stringify("@" + body));
  }
  await writeFile(config, lines.join("\n"), { mode: 0o600 });
  args.push("--config", config);
  let output: string;
  try {
    output = await new Promise<string>((resolve, reject) => {
      const child = spawn("npm", args, { stdio: ["pipe", "pipe", "pipe"] });
      const chunks: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      child.stderr.resume();
      child.stdin.end();
      child.on("error", () => reject(new Error("Authorized preview request could not start.")));
      child.on("exit", (code) =>
        code === 0
          ? resolve(Buffer.concat(chunks).toString("utf8"))
          : reject(new Error("Authorized preview request failed.")),
      );
    });
  } finally {
    await unlink(config).catch(() => {});
    await unlink(body).catch(() => {});
    await rmdir(directory).catch(() => {});
  }
  const matches = [...output.matchAll(/(?:^|\r?\n)HTTP\/(?:1\.[01]|2|3) (\d{3})[^\r\n]*\r?\n/g)];
  const match = matches.at(-1);
  if (!match) throw new Error("Preview HTTP response could not be parsed.");
  const raw = output.slice(match.index! + match[0].indexOf("HTTP/"));
  const boundary = /\r?\n\r?\n/.exec(raw);
  if (!boundary) throw new Error("Preview headers could not be parsed.");
  const responseHeaders = new Headers();
  for (const line of raw.slice(0, boundary.index).split(/\r?\n/).slice(1)) {
    const colon = line.indexOf(":");
    if (colon > 0) responseHeaders.append(line.slice(0, colon), line.slice(colon + 1).trim());
  }
  const status = Number(match[1]);
  return new Response(
    [204, 304].includes(status) ? null : raw.slice(boundary.index + boundary[0].length),
    { status, headers: responseHeaders },
  );
}
