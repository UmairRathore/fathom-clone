import { Input, ALL_FORMATS, BufferSource, EncodedPacketSink } from "mediabunny";
import { MAX_BYTES, MAX_SECONDS, ProcessingError } from "./schema";
export async function inspectRecording(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new ProcessingError("invalid_size");
  const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS });
  try {
    const audio = await input.getAudioTracks();
    if (!audio.length) throw new ProcessingError("missing_audio");
    const packet = await new EncodedPacketSink(audio[0]).getFirstPacket();
    if (!packet?.data.byteLength) throw new ProcessingError("missing_audio");
    const duration = await input.computeDuration(undefined, { skipLiveWait: true });
    if (!Number.isFinite(duration) || duration <= 0) throw new ProcessingError("invalid_metadata");
    if (duration > MAX_SECONDS) throw new ProcessingError("duration_exceeded");
    const audioDuration = await audio[0].computeDuration({ skipLiveWait: true });
    if (!Number.isFinite(audioDuration) || audioDuration <= 0)
      throw new ProcessingError("missing_audio");
    return {
      duration,
      mediaType: (await input.getVideoTracks()).length ? ("video" as const) : ("audio" as const),
    };
  } catch (error) {
    if (error instanceof ProcessingError) throw error;
    throw new ProcessingError("invalid_media");
  } finally {
    input.dispose();
  }
}
