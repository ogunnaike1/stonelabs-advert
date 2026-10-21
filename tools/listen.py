"""
Ask a Gemini model to listen to an audio (or video) file and answer a question — used as a QC "ear".
usage: .venv/bin/python -I tools/listen.py <file> "<question>" [model]
"""
import base64, json, mimetypes, pathlib, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEY = next(l.split('=', 1)[1].strip().strip('"\'') for l in (ROOT / '.env').read_text().splitlines() if l.startswith('GEMINI_API_KEY='))
path, question = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else 'gemini-3.8-flash'
mime = mimetypes.guess_type(path)[0] or 'audio/wav'
if path.endswith('.wav'):
    mime = 'audio/wav'
body = {'contents': [{'parts': [{'inline_data': {'mime_type': mime, 'data': base64.b64encode(pathlib.Path(path).read_bytes()).decode()}}, {'text': question}]}]}
req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(),
                             headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY}, method='POST')
import time
for attempt in range(5):
    try:
        req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(),
                                     headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY}, method='POST')
        d = json.loads(urllib.request.urlopen(req, timeout=600).read())
        print(''.join(p.get('text', '') for p in d['candidates'][0]['content']['parts']))
        break
    except urllib.error.HTTPError as e:
        if e.code in (429, 500, 503) and attempt < 4:
            time.sleep(8 * (attempt + 1)); continue
        print('HTTP', e.code, e.read().decode()[:500]); break
    except (ConnectionError, OSError) as e:
        if attempt < 4:
            time.sleep(8 * (attempt + 1)); continue
        print('network error', e)
