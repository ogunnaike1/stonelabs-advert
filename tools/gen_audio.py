"""
Generate the music bed (Lyria) and the voiceover (Gemini TTS) via the Gemini API.
Reads GEMINI_API_KEY from .env (never printed). Outputs into assets/audio/.

usage:  .venv/bin/python -I tools/gen_audio.py music  <tag>
        .venv/bin/python -I tools/gen_audio.py vo     <voice> <tag>
"""
import base64, json, os, sys, urllib.request, wave, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)


def key():
    for line in (ROOT / '.env').read_text().splitlines():
        if line.startswith('GEMINI_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('GEMINI_API_KEY missing in .env')


def post(url, body, timeout=600, tries=6):
    import re, time
    for attempt in range(tries):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST',
                                     headers={'Content-Type': 'application/json', 'x-goog-api-key': key()})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode()
            if e.code in (429, 503) and 'limit: 0' not in msg and attempt < tries - 1:
                m = re.search(r'retry in ([0-9.]+)s', msg)
                wait = float(m.group(1)) + 2 if m else 30
                print(f'  {e.code}, waiting {wait:.0f}s', flush=True)
                time.sleep(wait)
                continue
            raise SystemExit(f'HTTP {e.code}: {msg[:400]}')


MUSIC_PROMPT = """Instrumental only, no vocals. A 42-second cinematic synthwave / outrun track for a premium design-studio showreel:
the feeling of a night drive along a neon-lit coastal highway — retro 80s analog synths, modern punchy production. 100 BPM, 4/4, key of A minor.
Warm analog pads, a pulsing sidechained octave bass in sixteenth notes, a glassy arpeggiator, big gated-reverb snare, tight electronic kick,
a soaring lead synth melody with long delay, lush chorus. Epic but tasteful, polished and wide, not cheesy.
Structure with timestamps:
[0:00-0:05] Atmospheric intro: filtered pads and a soft arpeggio fading in, tension building, no drums.
[0:05-0:12] Kick and pulsing bass enter, hi-hats, the groove locks in, filter opening.
[0:12-0:22] Full drop: gated snare, driving bass, lead melody — confident and euphoric.
[0:22-0:24] Short breakdown: drums drop out, airy pads and arpeggio only.
[0:24-0:35] Big return, the most epic section: lead melody soars with a counter-melody, full drums.
[0:35-0:42] Final big chord hit at 0:35 then a long, lush reverb tail with a gentle arpeggio echo fading out."""


def music(tag):
    body = {'model': os.environ.get('LYRIA', 'lyria-3.5'), 'input': MUSIC_PROMPT, 'response_format': {'type': 'audio', 'mime_type': 'audio/wav'}}
    d = post('https://generativelanguage.googleapis.com/v1beta/interactions', body)
    n = 0
    for step in d.get('steps', []):
        if step.get('type') != 'model_output':
            continue
        for c in step.get('content', []):
            if c.get('type') == 'audio':
                mime = c.get('mime_type', '')
                ext = 'wav' if 'wav' in mime else 'mp3'
                p = OUT / f'music_{tag}_{n}.{ext}'
                p.write_bytes(base64.b64decode(c['data']))
                print('wrote', p.name, mime)
                n += 1
            elif c.get('type') == 'text':
                print('text:', c.get('text', '')[:600])
    if not n:
        print(json.dumps(d)[:1500])


VO_SCRIPT = """Read aloud in a deep, warm, confident cinematic voice — crisp, energetic and present, not whispery, no laughs or breaths between lines:
[warm, assured, a touch of pride] We design interiors in 3D — rendered down to every detail."""


def vo(voice, tag, model='gemini-3.8-flash-tts'):
    body = {
        'contents': [{'parts': [{'text': VO_SCRIPT}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }
    d = post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', body)
    part = d['candidates'][0]['content']['parts'][0]['inlineData']
    pcm = base64.b64decode(part['data'])
    mt = part.get('mimeType', '')
    p = OUT / f'vo_{voice}_{tag}.wav'
    if pcm[:4] == b'RIFF':
        p.write_bytes(pcm)
    else:
        rate = int(mt.split('rate=')[1].split(';')[0]) if 'rate=' in mt else 24000
        with wave.open(str(p), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    with wave.open(str(p)) as w:
        print('wrote', p.name, mt, f'{w.getnframes() / w.getframerate():.1f}s')


if __name__ == '__main__':
    if sys.argv[1] == 'music':
        music(sys.argv[2])
    else:
        vo(sys.argv[2], sys.argv[3], *(sys.argv[4:5]))
