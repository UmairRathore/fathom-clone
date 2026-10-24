import { execFileSync } from "node:child_process";
const files = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
  .toString()
  .split("\0")
  .filter(Boolean);
const problems = [];
for (const file of files) {
  if (
    file !== ".env.example" &&
    /(^|\/)\.env(\.|$)|recon\/(?:auth\/)?screenshots\/|\.local-postgres\/|\.auth-test\/|node_modules\/|\.next\//.test(
      file,
    )
  )
    problems.push(file + ": excluded artifact");
  if (/\.(png|jpg|jpeg|wav|ico)$/.test(file)) continue;
  const content = execFileSync("git", ["show", ":" + file]).toString("utf8");
  const secret =
    /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\b(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_]{20,}|\bAKIA[0-9A-Z]{16}\b/;
  const remoteDatabase = /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@(?!localhost|127\.0\.0\.1)/;
  if (secret.test(content) || remoteDatabase.test(content))
    problems.push(file + ": possible credential");
  const emails = content.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? [];
  if (
    emails.some(
      (email) => !/@(?:[a-z0-9-]+\.)*(?:example|test|invalid)$|@example\.com$/i.test(email),
    )
  )
    problems.push(file + ": review email address");
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  "Reviewed " +
    files.length +
    " staged paths: no detected credentials, non-example email addresses, private captures, environment files, or build artifacts. Binary screenshots/media require visual review.",
);
