import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";
import { put } from "@vercel/blob";
import type { Meeting } from "./domain";
import type { Clip } from "./journey";
import { getPool } from "./db";
import { readRecording } from "./recordings/storage";
import { extractWav } from "./clip-media";
import { ClipError, MAX_CLIP_SECONDS } from "./clip-shares";
export const CLIP_RATE = 16000;
export async function extractUploadedClip(
  source: Uint8Array,
  start: number,
  end: number,
): Promise<Buffer> {
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end - start < 0.1 - 1e-9 ||
    end - start > MAX_CLIP_SECONDS ||
    source.length > 24000000
  )
    throw new ClipError("Invalid clip range.");
  if (!ffmpeg) throw new ClipError("Audio preparation is unavailable.");
  const binary = ffmpeg;
  const dir = await mkdtemp(join(tmpdir(), "sounding-clip-"));
  try {
    const input = join(dir, "source");
    await writeFile(input, source, { mode: 0o600 });
    const first = Math.round(start * CLIP_RATE),
      last = Math.round(end * CLIP_RATE),
      expected = (last - first) * 2;
    const pcm = await new Promise<Buffer>((resolve, reject) => {
      const child = spawn(
        binary,
        [
          "-nostdin",
          "-v",
          "error",
          "-threads",
          "1",
          "-protocol_whitelist",
          "file,pipe",
          "-i",
          input,
          "-map",
          "0:a:0",
          "-vn",
          "-sn",
          "-dn",
          "-af",
          `aformat=sample_fmts=s16:sample_rates=${CLIP_RATE}:channel_layouts=mono,atrim=start_sample=${first}:end_sample=${last},asetpts=PTS-STARTPTS`,
          "-f",
          "s16le",
          "pipe:1",
        ],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
      const chunks: Buffer[] = [];
      let size = 0;
      let failed = false;
      const timer = setTimeout(() => {
        failed = true;
        child.kill("SIGKILL");
        reject(new ClipError("Audio preparation timed out. Try a shorter clip."));
      }, 30000);
      child.stdout.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_CLIP_SECONDS * CLIP_RATE * 2 + 3200) {
          failed = true;
          child.kill("SIGKILL");
          reject(new ClipError("Audio preparation failed."));
        } else chunks.push(chunk);
      });
      child.on("error", () => {
        clearTimeout(timer);
        reject(new ClipError("Audio preparation is unavailable."));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (failed) return;
        if (code !== 0 || size < expected - 3200)
          reject(new ClipError("Recording audio does not cover this clip."));
        else resolve(Buffer.concat(chunks));
      });
    });
    // At most 100ms of silent AAC/container tail is retained as silence, never outside speech.
    const out = Buffer.alloc(44 + expected);
    out.write("RIFF");
    out.writeUInt32LE(out.length - 8, 4);
    out.write("WAVEfmt ", 8);
    out.writeUInt32LE(16, 16);
    out.writeUInt16LE(1, 20);
    out.writeUInt16LE(1, 22);
    out.writeUInt32LE(CLIP_RATE, 24);
    out.writeUInt32LE(CLIP_RATE * 2, 28);
    out.writeUInt16LE(2, 32);
    out.writeUInt16LE(16, 34);
    out.write("data", 36);
    out.writeUInt32LE(expected, 40);
    pcm.copy(out, 44, 0, expected);
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export async function prepareClipBytes(meeting: Meeting, clip: Clip) {
  if (!meeting.mediaUrl) return null;
  let audio: Buffer;
  if (meeting.source === "upload") {
    const row = (
      await getPool().query(
        `SELECT media_key FROM sounding_recording WHERE id=$1 AND status='ready'`,
        [meeting.id],
      )
    ).rows[0];
    if (!row) throw new ClipError("Recording is unavailable.");
    audio = await extractUploadedClip(await readRecording(row.media_key), clip.start, clip.end);
  } else {
    if (meeting.mediaUrl !== "/media/atlas-review.wav")
      throw new ClipError("Recording format is unsupported.");
    audio = extractWav(
      await readFile(join(process.cwd(), "public/media/atlas-review.wav")),
      clip.start,
      clip.end,
    );
  }
  // Keep even high-sample-rate demo exports below serverless response limits.
  if (audio.length > 4_000_000) return extractUploadedClip(audio, 0, clip.end - clip.start);
  return audio;
}
export async function prepareClipMedia(meeting: Meeting, clip: Clip, id: string) {
  const audio = await prepareClipBytes(meeting, clip);
  if (!audio) return null;
  const key = `clips/${id}.wav`;
  await put(key, audio, {
    access: "private",
    contentType: "audio/wav",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return key;
}
