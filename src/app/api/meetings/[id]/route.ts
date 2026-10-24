import { getAuth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { ownerFor } from "@/lib/workspace";
import { getOwnedMeeting, saveOwnedMeeting } from "@/lib/workspace-store";
import { sameOrigin } from "@/lib/http-security";
import { z } from "zod";
export const runtime = "nodejs";
const options = { headers: { "Cache-Control": "no-store" } };
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401, ...options });
  const saved = await getOwnedMeeting(getPool(), ownerFor(session), (await context.params).id);
  return saved
    ? Response.json(saved, options)
    : Response.json({ error: "Meeting not found." }, { status: 404, ...options });
}
export async function PUT(request: Request, context: Context) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403, ...options });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401, ...options });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 64000)
    return Response.json({ error: "Changes are too large." }, { status: 413, ...options });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid changes." }, { status: 400, ...options });
  }
  const parsed = z
    .object({ state: z.unknown(), revision: z.number().int().nonnegative() })
    .strict()
    .safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Invalid changes." }, { status: 400, ...options });
  const result = await saveOwnedMeeting(
    getPool(),
    ownerFor(session),
    (await context.params).id,
    parsed.data.state,
    parsed.data.revision,
  );
  if (typeof result === "number") return Response.json({ revision: result }, options);
  const status = { missing: 404, invalid: 400, conflict: 409 }[result];
  return Response.json(
    {
      error:
        result === "conflict"
          ? "This meeting changed in another tab. Reload before editing."
          : "Could not save these changes.",
    },
    { status, ...options },
  );
}
