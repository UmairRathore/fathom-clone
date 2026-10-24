import { getPool } from "@/lib/db";
import { sameOrigin } from "@/lib/http-security";
import { completeRecording, getRecording, jobView } from "@/lib/recordings/jobs";
import { recordingActor, recordingError, responseOptions } from "@/lib/recordings/server";
import { readRecording, deleteRecording } from "@/lib/recordings/storage";
import { ProcessingError } from "@/lib/recordings/schema";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "invalid_origin" }, { status: 403 });
  try {
    const owner = await recordingActor(request);
    const id = (await params).id;
    const original = await getRecording(getPool(), owner, id);
    try {
      const job = await completeRecording(getPool(), owner, id, readRecording);
      if (!job) throw new ProcessingError("not_found");
      if (job.id !== id && original) await deleteRecording(original.media_key).catch(() => {});
      return Response.json({ job: jobView(job) }, responseOptions);
    } catch (e) {
      if (
        e instanceof ProcessingError &&
        [
          "invalid_size",
          "size_mismatch",
          "missing_audio",
          "invalid_media",
          "invalid_metadata",
          "duration_exceeded",
        ].includes(e.code)
      )
        await getPool().query(
          "UPDATE sounding_recording SET status='failed',error_code=$1,updated_at=now() WHERE id=$2 AND owner_id=$3 AND status='uploading'",
          [e.code, id, owner.userId],
        );
      throw e;
    }
  } catch (e) {
    return recordingError(e);
  }
}
