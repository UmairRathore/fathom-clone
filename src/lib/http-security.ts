export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !process.env.BETTER_AUTH_URL) return false;
  try {
    return new URL(origin).origin === new URL(process.env.BETTER_AUTH_URL).origin;
  } catch {
    return false;
  }
}
export function safeReturnPath(value?: string | null) {
  // Only workspace destinations; no protocol-relative URL, escaping or arbitrary redirect.
  return value && /^\/(home|account|calls\/[a-zA-Z0-9-]+)(\?[^\\\r\n]*)?$/.test(value)
    ? value
    : "/home";
}
