import { spawn } from "node:child_process";
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
  for (const [name, value] of headers) args.push("--header", name + ": " + value);
  if (options.body) args.push("--data-binary", "@-");
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn("npm", args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.resume(); // CLI diagnostics may contain sensitive URLs; never forward them.
    child.stdin.end(typeof options.body === "string" ? options.body : undefined);
    child.on("error", () => reject(new Error("Authorized preview request could not start.")));
    child.on("exit", (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks).toString("utf8"))
        : reject(new Error("Authorized preview request failed.")),
    );
  });
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
