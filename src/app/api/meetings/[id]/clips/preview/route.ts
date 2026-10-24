import { getAuth } from "@/lib/auth";
import { ownerFor } from "@/lib/workspace";
import { getPool } from "@/lib/db";
import { getOwnedMeeting } from "@/lib/workspace-store";
import { sameOrigin } from "@/lib/http-security";
import { clipSchema, validClip } from "@/lib/journey";
import { MAX_CLIP_SECONDS, ClipError } from "@/lib/clip-shares";
import { prepareClipBytes } from "@/lib/clip-preparation";
import { clipAudioResponse, guestHeaders } from "@/lib/clip-response";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 2000) throw new ClipError("Invalid clip.");
    const clip = clipSchema.safeParse(JSON.parse(raw));
    const saved = await getOwnedMeeting(getPool(), ownerFor(session), (await context.params).id);
    if (!saved) return Response.json({ error: "Meeting not found." }, { status: 404 });
    if (
      !clip.success ||
      !validClip(clip.data, saved.meeting) ||
      clip.data.end - clip.data.start > MAX_CLIP_SECONDS ||
      clip.data.end - clip.data.start < 0.1 - 1e-9
    )
      throw new ClipError("Choose a valid 0.1 to 120 second range.");
    const audio = await prepareClipBytes(saved.meeting, clip.data);
    if (!audio) throw new ClipError("This meeting has no audio recording.");
    return clipAudioResponse(audio, new Request(request.url));
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ClipError ? e.message : "Audio preview could not be prepared. Try again.",
      },
      { status: 400, headers: guestHeaders },
    );
  }
}
