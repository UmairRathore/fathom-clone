import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { ownerFor } from "@/lib/workspace";
import { getOwnedMeeting } from "@/lib/workspace-store";
import { sameOrigin } from "@/lib/http-security";
import { validClip } from "@/lib/journey";
import { restoreState } from "@/lib/state";
import { sealShare, shareRequestSchema, SHARE_TTL } from "@/lib/sharing";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host"))
        return NextResponse.json(
          { error: "Cross-origin sharing requests are not allowed." },
          { status: 403 },
        );
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }
  const secret = process.env.SHARE_SECRET;
  if (!secret || secret.length < 32)
    return NextResponse.json(
      { error: "Sharing is not configured. Add a 32-character SHARE_SECRET to the deployment." },
      { status: 503 },
    );
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 64000)
      return NextResponse.json({ error: "The share snapshot is too large." }, { status: 413 });
    const parsed = shareRequestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid meeting snapshot." }, { status: 400 });
    const { meetingId, visibility, state, clip } = parsed.data;
    const saved = await getOwnedMeeting(getPool(), ownerFor(session), meetingId);
    const meeting = saved?.meeting;
    if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    if (clip && !validClip(clip, meeting))
      return NextResponse.json({ error: "Invalid clip range." }, { status: 400 });
    const restored = restoreState(JSON.stringify(state), meeting);
    if (JSON.stringify(restored) !== JSON.stringify(state))
      return NextResponse.json(
        { error: "The snapshot has invalid timestamps or participants." },
        { status: 400 },
      );
    const issuedAt = Date.now(),
      expiresAt = issuedAt + SHARE_TTL;
    const token = sealShare(
      {
        version: 1,
        clip,
        meetingId,
        visibility,
        issuedAt,
        expiresAt,
        state: visibility === "unlisted" ? state : undefined,
      },
      secret,
    );
    return NextResponse.json(
      { path: `/share/${token}`, expiresAt, visibility },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not create a share snapshot. Check its size and try again." },
      { status: 400 },
    );
  }
}
