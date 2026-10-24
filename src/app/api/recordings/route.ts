import { temporaryAccount } from "@/lib/temporary-accounts";
import { getPool } from "@/lib/db";
import { sameOrigin } from "@/lib/http-security";
import { ensureWorkspace } from "@/lib/workspace-store";
import { createRecording, listRecordings, jobView } from "@/lib/recordings/jobs";
import { recordingActor, recordingError, responseOptions } from "@/lib/recordings/server";
import { uploadUrl } from "@/lib/recordings/storage";
import { ProcessingError } from "@/lib/recordings/schema";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const owner = await recordingActor(request);
    return Response.json(
      { jobs: (await listRecordings(getPool(), owner)).map(jobView) },
      responseOptions,
    );
  } catch (e) {
    return recordingError(e);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "invalid_origin" }, { status: 403 });
  try {
    const owner = await recordingActor(request);
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ProcessingError("storage_not_configured");
    const raw = await request.text();
    if (raw.length > 4000) throw new ProcessingError("invalid_upload");
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new ProcessingError("invalid_upload");
    }
    await ensureWorkspace(getPool(), owner);
    const job = await createRecording(getPool(), owner, data);
    const target =
      job.status === "uploading"
        ? await uploadUrl(
            job.media_key,
            job.mime_type,
            job.size_bytes,
            (await temporaryAccount(getPool(), owner.userId))?.expires_at.getTime(),
          )
        : null;
    return Response.json({ job: jobView(job), upload: target }, responseOptions);
  } catch (e) {
    return recordingError(e);
  }
}
