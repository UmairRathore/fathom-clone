import { execFileSync } from "node:child_process";
const files = execFileSync("git", ["diff", "--cached", "--name-only", "-z"]).toString().split("\0").filter(Boolean);
const problems = [];
for (const file of files) {
  if (/(^|\/)\.env(\.|$)|recon\/screenshots\/|node_modules\/|\.next\//.test(file)) problems.push(`${file}: excluded artifact`);
  if (/\.(png|jpg|jpeg|wav|ico)$/.test(file)) continue;
  const content = execFileSync("git", ["show", `:${file}`]).toString("utf8");
  const secret = /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\b(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_]{20,}|\bAKIA[0-9A-Z]{16}\b/;
  if (secret.test(content)) problems.push(`${file}: possible credential`);
  const emails = content.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? [];
  if (emails.some(email => !email.endsWith("@example.test"))) problems.push(`${file}: review email address`);
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`Reviewed ${files.length} staged paths: no detected credentials, email addresses, private captures, environment files, or build artifacts. Binary screenshots/media require visual review.`);
