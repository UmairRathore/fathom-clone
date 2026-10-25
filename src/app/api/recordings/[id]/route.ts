import { getPool } from "@/lib/db";
import { sameOrigin } from "@/lib/http-security";
import { getRecording, cancelRecording, jobView } from "@/lib/recordings/jobs";
import { recordingActor, recordingError, responseOptions } from "@/lib/recordings/server";
import { deleteRecording } from "@/lib/recordings/storage";
import { ProcessingError } from "@/lib/recordings/schema";
import { processingApproved } from "@/lib/recordings/approval";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const owner = await recordingActor(request);
    const job = await getRecording(getPool(), owner, (await context.params).id);
    if (!job) throw new ProcessingError("not_found");
    return Response.json(
      {
        job: jobView(job),
        canProcess: processingApproved(job.id),
      },
      responseOptions,
    );
  } catch (e) {
    return recordingError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  if (!sameOrigin(request)) return Response.json({ error: "invalid_origin" }, { status: 403 });
  try {
    const owner = await recordingActor(request);
    const key = await cancelRecording(getPool(), owner, (await context.params).id);
    let cleanupPending = false;
    try {
      await deleteRecording(key);
    } catch {
      cleanupPending = true;
    }
    return Response.json({ deleted: true, cleanupPending }, responseOptions);
  } catch (e) {
    return recordingError(e);
  }
}
