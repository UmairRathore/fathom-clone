import { get, del, issueSignedToken, presignUrl } from "@vercel/blob";
import { MAX_BYTES, ProcessingError } from "./schema";
export async function uploadUrl(pathname: string, mime: string, size: number, deadline = Infinity) {
  const validUntil = Math.min(Date.now() + 10 * 60 * 1000, deadline);
  const token = await issueSignedToken({
    pathname,
    operations: ["put"],
    validUntil,
    allowedContentTypes: [mime],
    maximumSizeInBytes: size,
  });
  const result = await presignUrl(token, {
    access: "private",
    operation: "put",
    pathname,
    validUntil,
    allowedContentTypes: [mime],
    maximumSizeInBytes: size,
    allowOverwrite: false,
    addRandomSuffix: false,
  });
  return { url: result.presignedUrl, expiresAt: validUntil };
}
export async function playbackUrl(pathname: string, deadline = Infinity) {
  const validUntil = Math.min(Date.now() + 2 * 60 * 1000, deadline);
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const result = await presignUrl(token, {
    access: "private",
    operation: "get",
    pathname,
    validUntil,
  });
  return result.presignedUrl;
}
export async function readRecording(pathname: string) {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) throw new ProcessingError("storage_unavailable", true);
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new ProcessingError("invalid_size");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function deleteRecording(pathname: string) {
  await del(pathname);
}
