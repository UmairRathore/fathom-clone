/** Validate editor strings before coercion; tolerate only arithmetic noise at duration limits. */
export function clipEditorError(
  title: string,
  from: string,
  to: string,
  recordingDuration: number,
) {
  if (!title.trim()) return "Enter a clip title.";
  if (title.trim().length > 120) return "Keep the clip title within 120 characters.";
  const start = from.trim() ? Number(from) : NaN;
  const end = to.trim() ? Number(to) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end))
    return "Enter valid start and end times in seconds.";
  if (start < 0) return "Start time must be zero or later.";
  if (end <= start) return "End time must be after start time.";
  if (end > recordingDuration) return "End time must be within the recording.";
  const duration = end - start;
  if (duration < 0.1 - 1e-9) return "Select at least 0.1 seconds.";
  if (duration > 120 + 1e-9) return "Select no more than 120 seconds.";
  return "";
}
