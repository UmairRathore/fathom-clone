import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { openShare } from "@/lib/sharing";
import { getMeeting } from "@/lib/data";
import { validClip } from "@/lib/journey";
import { extractWav } from "@/lib/clip-media";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = process.env.SHARE_SECRET ? openShare(token, process.env.SHARE_SECRET) : null;
  const meeting = payload ? getMeeting(payload.meetingId) : null;
  if (
    !payload?.clip ||
    payload.visibility !== "unlisted" ||
    !meeting ||
    !validClip(payload.clip, meeting) ||
    meeting.mediaUrl !== "/media/atlas-review.wav"
  )
    return new Response("Clip not found", { status: 404 });
  try {
    const source = await readFile(join(process.cwd(), "public/media/atlas-review.wav"));
    const audio = extractWav(source, payload.clip.start, payload.clip.end);
    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.length),
        "Content-Disposition": 'inline; filename="sounding-clip.wav"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("Clip audio unavailable", { status: 503 });
  }
}
