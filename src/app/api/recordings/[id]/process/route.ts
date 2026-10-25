import { getPool } from "@/lib/db";
import { sameOrigin } from "@/lib/http-security";
import { getRecording, processRecording, jobView } from "@/lib/recordings/jobs";
import { recordingActor, recordingError, responseOptions } from "@/lib/recordings/server";
import { readRecording } from "@/lib/recordings/storage";
import { createBudgetedProvider } from "@/lib/recordings/budget";
import { ProcessingError } from "@/lib/recordings/schema";
import { processingApproved } from "@/lib/recordings/approval";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "invalid_origin" }, { status: 403 });
  try {
    const owner = await recordingActor(request);
    const id = (await params).id;
    const prior = await getRecording(getPool(), owner, id);
    if (!prior) throw new ProcessingError("not_found");
    if (prior.status === "ready") return Response.json({ job: jobView(prior) }, responseOptions);
    if (!processingApproved(id)) throw new ProcessingError("spending_approval_required");
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new ProcessingError("ai_not_configured");
    const job = await processRecording(
      getPool(),
      owner,
      id,
      createBudgetedProvider(getPool(), id, key),
      readRecording,
      { approved: true },
    );
    return Response.json({ job: jobView(job) }, responseOptions);
  } catch (e) {
    return recordingError(e);
  }
}
