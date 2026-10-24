// Extract the selected PCM range, rather than giving guests the complete recording URL.
export function extractWav(source: Buffer, start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start)
    throw new Error("Invalid audio range");
  if (source.toString("ascii", 0, 4) !== "RIFF" || source.toString("ascii", 8, 12) !== "WAVE")
    throw new Error("Invalid WAV");
  let format: Buffer | undefined, data: Buffer | undefined;
  for (let offset = 12; offset + 8 <= source.length;) {
    const size = source.readUInt32LE(offset + 4);
    if (offset + 8 + size > source.length) throw new Error("Invalid chunk");
    const name = source.toString("ascii", offset, offset + 4);
    if (name === "fmt ") format = source.subarray(offset + 8, offset + 8 + size);
    if (name === "data") data = source.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  if (!format || !data || format.length < 16 || format.readUInt16LE(0) !== 1)
    throw new Error("PCM required");
  const rate = format.readUInt32LE(8),
    align = format.readUInt16LE(12);
  if (!rate || !align || end > data.length / rate + 0.001) throw new Error("Invalid audio bounds");
  const first = Math.floor((start * rate) / align) * align;
  const last = Math.min(data.length, Math.floor((end * rate) / align) * align);
  const pcm = data.subarray(first, last);
  const output = Buffer.alloc(44 + pcm.length + (pcm.length % 2));
  output.write("RIFF", 0);
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  format.copy(output, 20, 0, 16);
  output.write("data", 36);
  output.writeUInt32LE(pcm.length, 40);
  pcm.copy(output, 44);
  return output;
}
