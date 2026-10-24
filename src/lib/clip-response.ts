export const guestHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
export function clipAudioResponse(bytes: Uint8Array, request: Request) {
  const size = bytes.length;
  let start = 0,
    end = size - 1,
    status = 200;
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, {
        status: 416,
        headers: { ...guestHeaders, "Content-Range": `bytes */${size}` },
      });
    if (!match[1]) {
      const tail = Number(match[2]);
      if (!Number.isSafeInteger(tail) || tail <= 0)
        return new Response(null, { status: 416, headers: guestHeaders });
      start = Math.max(0, size - tail);
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(end, Number(match[2])) : end;
    }
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= size ||
      end < start
    )
      return new Response(null, {
        status: 416,
        headers: { ...guestHeaders, "Content-Range": `bytes */${size}` },
      });
    status = 206;
  }
  return new Response(
    request.method === "HEAD" ? null : new Uint8Array(bytes.slice(start, end + 1)),
    {
      status,
      headers: {
        ...guestHeaders,
        "Content-Type": "audio/wav",
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        "Content-Disposition": 'inline; filename="sounding-clip.wav"',
        ...(status === 206 ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
      },
    },
  );
}
