import { publicClip } from "@/lib/clip-shares";
import { getPool } from "@/lib/db";
import { guestHeaders } from "@/lib/clip-response";
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const grant = await publicClip(getPool(), (await context.params).token);
    return Response.json(
      { available: !!grant },
      { status: grant ? 200 : 404, headers: guestHeaders },
    );
  } catch {
    return Response.json({ available: false }, { status: 404, headers: guestHeaders });
  }
}
