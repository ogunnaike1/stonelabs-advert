"""
Stream an original synthwave bed from Lyria RealTime, steering the arrangement over time so the
sections line up with the picture (100 BPM grid in src/timeline.ts). Writes assets/audio/music_live_<tag>.wav
usage: .venv/bin/python -I tools/lyria_live.py <tag>
"""
import asyncio, pathlib, sys, wave, warnings
warnings.filterwarnings('ignore')
from google import genai
from google.genai import types

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEY = next(l.split('=', 1)[1].strip().strip('"\'') for l in (ROOT / '.env').read_text().splitlines() if l.startswith('GEMINI_API_KEY='))

BASE = 'Instrumental synthwave, outrun, retrowave night drive, 80s analog synthesizers, cinematic, polished modern production, wide stereo'
# (start second, prompts, density, brightness)
PLAN = [
    (0, [(BASE, 1.0), ('explosive start with no intro: full driving drums, pulsing sidechained octave bass and big analog synth chords from the very first beat, energetic, epic', 1.6)], 0.85, 0.65),
    (6, [(BASE, 1.0), ('driving confident groove, gated reverb snare, sixteenth-note bass, glassy arpeggio', 1.3)], 0.75, 0.6),
    (12, [(BASE, 1.0), ('full drop, soaring lead synth melody, euphoric, big gated snare', 1.5)], 0.85, 0.7),
    (21.6, [(BASE, 1.0), ('short breakdown, drums out, airy pads and shimmering arpeggio', 1.4)], 0.3, 0.55),
    (24, [(BASE, 1.0), ('epic return, soaring lead with counter melody, full drums, triumphant', 1.5)], 0.9, 0.75),
    (34.5, [(BASE, 1.0), ('final big sustained chord, long lush reverb tail, gentle arpeggio echo fading', 1.5)], 0.2, 0.45),
]
TOTAL = 46.0
SR, CH = 48000, 2


async def main(tag):
    client = genai.Client(api_key=KEY, http_options={'api_version': 'v1alpha'})
    pcm = bytearray()
    async with client.aio.live.music.connect(model='models/lyria-realtime-exp') as s:
        cfg = lambda d, b: types.LiveMusicGenerationConfig(bpm=100, density=d, brightness=b, scale=types.Scale.A_MAJOR_G_FLAT_MINOR if False else types.Scale.C_MAJOR_A_MINOR, temperature=1.0, guidance=4.0)
        idx = 0

        async def steer():
            nonlocal idx
            while idx < len(PLAN):
                t, prompts, d, b = PLAN[idx]
                got = len(pcm) / (SR * CH * 2)
                if got >= t - 2.0 or idx == 0:  # lead by ~2 s: model latency
                    await s.set_weighted_prompts(prompts=[types.WeightedPrompt(text=p, weight=w) for p, w in prompts])
                    await s.set_music_generation_config(config=cfg(d, b))
                    if idx == 0:
                        await s.play()
                    print(f'section {t}s set at audio {got:.1f}s', flush=True)
                    idx += 1
                await asyncio.sleep(0.1)

        steer_task = asyncio.create_task(steer())
        async for msg in s.receive():
            sc = msg.server_content
            if sc and sc.audio_chunks:
                for ch in sc.audio_chunks:
                    pcm.extend(ch.data)
            if len(pcm) >= TOTAL * SR * CH * 2:
                break
        steer_task.cancel()
    p = ROOT / 'assets' / 'audio' / f'music_live_{tag}.wav'
    with wave.open(str(p), 'wb') as w:
        w.setnchannels(CH); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    print('wrote', p.name, f'{len(pcm) / (SR * CH * 2):.1f}s')


asyncio.run(main(sys.argv[1]))
