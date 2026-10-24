import { getAuth, emailReady, isDemoEmail } from "@/lib/auth";
import { sameOrigin } from "@/lib/http-security";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };
async function handler(request: Request) {
  try {
    if (request.method === "POST" && !sameOrigin(request))
      return Response.json(
        { message: "Invalid request origin." },
        { status: 403, headers: noStore },
      );
    const path = new URL(request.url).pathname.replace("/api/auth", "");
    // No credential reset/verification requests without a tested delivery service.
    if (
      !emailReady() &&
      [
        "/request-password-reset",
        "/reset-password",
        "/send-verification-email",
        "/sign-up/email",
      ].includes(path)
    )
      return Response.json(
        {
          message:
            "Email delivery is not configured. Use the public demo or Google when available.",
        },
        { status: 503, headers: noStore },
      );
    if (request.method !== "GET") {
      const session = await getAuth().api.getSession({ headers: request.headers });
      // Shared demonstration credentials can never be changed through raw library endpoints.
      if (
        session &&
        isDemoEmail(session.user.email) &&
        !["/sign-out", "/sign-in/email", "/sign-in/social"].includes(path)
      )
        return Response.json(
          { message: "Demo account settings are read-only." },
          { status: 403, headers: noStore },
        );
    }
    const response = await getAuth().handler(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return Response.json(
      { message: "Authentication is temporarily unavailable. Please try again." },
      { status: 503, headers: noStore },
    );
  }
}
export const GET = handler;
export const POST = handler;
