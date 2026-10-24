import {
  createTemporaryAccount,
  RegistrationLimited,
  temporaryNameSchema,
} from "@/lib/temporary-accounts";
import { getPool } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { sameOrigin } from "@/lib/http-security";
import { ensureWorkspace } from "@/lib/workspace-store";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403, headers });
  try {
    const text = await request.text();
    if (text.length > 1000)
      return Response.json(
        { message: "Enter a name of 1–80 characters." },
        { status: 400, headers },
      );
    let input;
    try {
      input = JSON.parse(text);
    } catch {
      return Response.json({ message: "Enter a valid name." }, { status: 400, headers });
    }
    const parsed = temporaryNameSchema.safeParse(input);
    if (!parsed.success)
      return Response.json(
        { message: "Enter a name of 1–80 characters." },
        { status: 400, headers },
      );
    const account = await createTemporaryAccount(getPool(), parsed.data);
    const login = await getAuth().api.signInEmail({
      body: { email: account.loginId, password: account.password },
      headers: request.headers,
      asResponse: true,
    });
    if (!login.ok) throw new Error();
    const cookie = login.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const session = await getAuth().api.getSession({ headers: new Headers({ cookie }) });
    if (!session) throw new Error();
    await ensureWorkspace(getPool(), {
      userId: session.user.id,
      sessionId: session.session.id,
      demo: false,
    });
    const resultHeaders = new Headers(login.headers);
    resultHeaders.delete("content-length");
    for (const [key, value] of Object.entries(headers)) resultHeaders.set(key, value);
    resultHeaders.set("Content-Type", "application/json");
    return new Response(
      JSON.stringify({
        loginId: account.loginId,
        password: account.password,
        createdAt: account.createdAt,
        expiresAt: account.expiresAt,
      }),
      { headers: resultHeaders },
    );
  } catch (e) {
    return Response.json(
      {
        message:
          e instanceof RegistrationLimited
            ? "Temporary registrations are busy. Try again later, or use the public demo."
            : "Could not create an account. Try again or use the public demo.",
      },
      { status: e instanceof RegistrationLimited ? 429 : 503, headers },
    );
  }
}
