import { createClipShare, listClipShares, revokeClipShares, ClipError } from "@/lib/clip-shares";
import { prepareClipMedia } from "@/lib/clip-preparation";
import { deleteRecording } from "@/lib/recordings/storage";
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
export const maxDuration = 60;
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
    if (clip) {
      if (visibility !== "unlisted")
        return NextResponse.json(
          { error: "Choose public clip access explicitly." },
          { status: 400 },
        );
      if (meeting.source === "upload" && parsed.data.confirmPublic !== true)
        return NextResponse.json(
          { error: "Confirm that this excerpt may be shared publicly." },
          { status: 400 },
        );
      const link = await createClipShare(
        getPool(),
        ownerFor(session),
        meetingId,
        clip,
        prepareClipMedia,
        deleteRecording,
      );
      return NextResponse.json(
        { ...link, visibility: "unlisted" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (meeting.source === "upload")
      return NextResponse.json(
        { error: "Private uploaded recordings cannot be shared in this module." },
        { status: 403 },
      );
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
  } catch (e) {
    if (e instanceof ClipError)
      return NextResponse.json(
        { error: e.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      { error: "Could not create a share snapshot. Check its size and try again." },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("meetingId");
  if (!id || id.length > 100)
    return NextResponse.json({ error: "Invalid meeting." }, { status: 400 });
  try {
    return NextResponse.json(
      { shares: await listClipShares(getPool(), ownerFor(session), id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 2000) throw new Error();
    const { meetingId, clipId } = JSON.parse(raw);
    if (
      typeof meetingId !== "string" ||
      typeof clipId !== "string" ||
      meetingId.length > 100 ||
      clipId.length > 100
    )
      throw new Error();
    const keys = await revokeClipShares(getPool(), ownerFor(session), meetingId, clipId);
    await Promise.allSettled(keys.map((key) => deleteRecording(key)));
    return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Clip not found." }, { status: 404 });
  }
}
