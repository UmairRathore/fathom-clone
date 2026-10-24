import { getPool } from "@/lib/db";
import { getRecording } from "@/lib/recordings/jobs";
import { recordingActor, recordingError, responseOptions } from "@/lib/recordings/server";
import { ProcessingError, transcriptionSchema, analysisSchema } from "@/lib/recordings/schema";
import { reviewInsights } from "@/lib/recordings/review";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await recordingActor(request);
    const job = await getRecording(getPool(), owner, (await context.params).id);
    if (!job) throw new ProcessingError("not_found");
    if (job.status !== "ready" || !job.transcript || !job.analysis)
      throw new ProcessingError("not_ready");
    return Response.json(
      reviewInsights(transcriptionSchema.parse(job.transcript), analysisSchema.parse(job.analysis)),
      responseOptions,
    );
  } catch (e) {
    return recordingError(e);
  }
}
