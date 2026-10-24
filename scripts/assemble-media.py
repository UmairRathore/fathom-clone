"""Join locally synthesized speech and derive exact segment boundaries from PCM frames."""
import json
import sys
import wave
from pathlib import Path

source, root = map(Path, sys.argv[1:])
output = root / 'public/media/atlas-review.wav'
segments = []
frames = []
count = 0
params = None
for index in range(8):
    with wave.open(str(source / f'{index}.wav'), 'rb') as stream:
        if params is None:
            params = stream.getparams()
        assert stream.getframerate() == params.framerate
        assert stream.getnchannels() == params.nchannels
        assert stream.getsampwidth() == params.sampwidth
        # Include a small natural pause at the end of each speaker turn.
        data = stream.readframes(stream.getnframes())
        silence_frames = int(params.framerate * .25)
        frames.append(data + b'\0' * silence_frames * params.nchannels * params.sampwidth)
        length = stream.getnframes() + silence_frames
        segments.append({'start': count / params.framerate, 'end': (count + length) / params.framerate})
        count += length
with wave.open(str(output), 'wb') as stream:
    stream.setparams(params)
    stream.writeframes(b''.join(frames))
metadata = {'duration': count / params.framerate, 'segments': segments}
(root / 'src/lib/media-timing.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print(f'Audio: {metadata["duration"]:.3f}s, {params.framerate} Hz, {len(segments)} aligned segments, {output.stat().st_size} bytes')
