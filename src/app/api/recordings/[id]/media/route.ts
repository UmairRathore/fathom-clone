import { temporaryAccount } from "@/lib/temporary-accounts";
import { getPool } from "@/lib/db";
import { getRecording } from "@/lib/recordings/jobs";
import { recordingActor, recordingError } from "@/lib/recordings/server";
import { playbackUrl } from "@/lib/recordings/storage";
import { ProcessingError } from "@/lib/recordings/schema";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await recordingActor(request);
    const job = await getRecording(getPool(), owner, (await params).id);
    if (!job || !job.media_duration || job.status === "uploading")
      throw new ProcessingError("not_found");
    return new Response(null, {
      status: 307,
      headers: {
        Location: await playbackUrl(
          job.media_key,
          (await temporaryAccount(getPool(), owner.userId))?.expires_at.getTime(),
        ),
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return recordingError(e);
  }
}
