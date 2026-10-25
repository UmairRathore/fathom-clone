type ProcessingEnvironment = {
  [key: string]: string | undefined;
  AI_PROCESSING_ENABLED?: string;
  AI_PROCESSING_UNTIL?: string;
  AI_APPROVED_RECORDING_ID?: string;
};

// A configured window replaces the legacy single-recording allowlist.
// Invalid or expired windows fail closed, even for the old approved ID.
export function processingApproved(
  id: string,
  env: ProcessingEnvironment = process.env,
  now = Date.now(),
) {
  if (env.AI_PROCESSING_ENABLED !== "true") return false;
  if (env.AI_PROCESSING_UNTIL !== undefined && env.AI_PROCESSING_UNTIL !== "") {
    const deadline = Date.parse(env.AI_PROCESSING_UNTIL);
    return Number.isFinite(deadline) && Number.isFinite(now) && now < deadline;
  }
  return !!id && env.AI_APPROVED_RECORDING_ID === id;
}

export function budgetRecordingApproved(
  id: string,
  approvedId: string,
  env: ProcessingEnvironment = process.env,
  now = Date.now(),
) {
  return env.AI_PROCESSING_UNTIL !== undefined && env.AI_PROCESSING_UNTIL !== ""
    ? processingApproved(id, env, now)
    : approvedId === id;
}
