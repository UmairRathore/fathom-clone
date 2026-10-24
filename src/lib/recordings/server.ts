import { getAuth } from "../auth";
import { ownerFor } from "../workspace";
import { ProcessingError } from "./schema";
export async function recordingActor(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new ProcessingError("unauthorized");
  const owner = ownerFor(session);
  if (owner.demo) throw new ProcessingError("private_account_required");
  return owner;
}
export const responseOptions = {
  headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
};
export function recordingError(error: unknown) {
  const code = error instanceof ProcessingError ? error.code : "request_failed";
  const status =
    code === "unauthorized"
      ? 401
      : code === "private_account_required"
        ? 403
        : code === "not_found"
          ? 404
          : code.includes("approval")
            ? 403
            : code === "user_upload_limit"
              ? 429
              : code === "processing_active"
                ? 409
                : code.includes("configured") || code === "storage_unavailable"
                  ? 503
                  : 400;
  return Response.json({ error: code }, { status, ...responseOptions });
}
