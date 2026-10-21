"""
Segmented render. Motion-blur windows create several WebGL canvases per frame (one per sub-frame sample), and
Chrome caps active WebGL contexts per browser — so those stretches render with low concurrency, everything else fast.
Segments are concatenated losslessly and the mastered mix is muxed on at the end.
usage: .venv/bin/python -I tools/render_segments.py out/file.mp4 [9x16|16x9] [scale]
"""
import pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS, TOTAL = 60, 2400
OUT = pathlib.Path(sys.argv[1])
FMT = sys.argv[2] if len(sys.argv) > 2 else '9x16'
SCALE = int(sys.argv[3]) if len(sys.argv) > 3 else 1
PROPS = ['--props={"format":"16x9"}'] if FMT == '16x9' else []
SEG = ROOT / 'out' / ('seg' if (FMT, SCALE) == ('9x16', 1) else f'seg_{FMT}_x{SCALE}')
SEG.mkdir(parents=True, exist_ok=True)

src = (ROOT / 'src/StoneLabs.tsx').read_text()
wins = [(float(a), float(b)) for a, b in re.findall(r'\[\s*([\d.]+),\s*([\d.]+)\s*\],', src.split('MB_WINDOWS')[1].split('];')[0])]
INSIDE = [(24.3, 25.5), (29.25, 30.4)]  # 360° viewport adds its own WebGL canvas per sample

segs, cur = [], 0
for a, b in wins:
    fa, fb = int(a * FPS), min(TOTAL - 1, int(b * FPS) + 1)
    if fa > cur:
        segs.append((cur, fa - 1, 5))
    heavy = any(not (b < x or a > y) for x, y in INSIDE)
    segs.append((max(fa, cur), fb, 1 if heavy else 2))
    cur = fb + 1
if cur <= TOTAL - 1:
    segs.append((cur, TOTAL - 1, 5))

# short chunks per browser for motion-blur stretches (GPU resources accumulate across many multi-canvas frames)
def chunk(a, b, conc):
    size = (20 if conc == 1 else 40 if conc < 5 else 400) // (2 if SCALE > 1 else 1)
    out = []
    while a <= b:
        out.append((a, min(b, a + size - 1), conc))
        a += size
    return out


done = {p.stem for p in SEG.glob('*-*.mp4')}
segs2 = []
for a, b, conc in segs:
    if f'{a}-{b}' in done:
        segs2.append((a, b, conc))  # already rendered whole
    else:
        segs2.extend(chunk(a, b, conc))
segs = segs2

files = []
for i, (a, b, conc) in enumerate(segs):
    f = SEG / f'{a}-{b}.mp4'
    files.append(f)
    if f.exists() and f.stat().st_size > 1000:
        print('skip', f.name, flush=True)
        continue
    print(f'render {a}-{b} (concurrency {conc})', flush=True)
    r = None
    for attempt in range(3):  # transient browser crashes under load → retry the segment
        try:  # hard watchdog: a frozen browser never reports an error, so kill it ourselves
            r = subprocess.run(['npx', 'remotion', 'render', 'build', 'StoneLabs', str(f), f'--frames={a}-{b}', '--gl=angle', f'--concurrency={conc}',
                                '--muted', '--log=error', '--timeout=240000', '--crf=14', f'--scale={SCALE}', *PROPS], cwd=ROOT, capture_output=True, text=True, timeout=600 * SCALE * SCALE)
        except subprocess.TimeoutExpired:
            subprocess.run(['pkill', '-f', 'chrome-headless-shell'])
            print(f'  watchdog: segment {a}-{b} stalled, retrying', flush=True)
            f.unlink(missing_ok=True)
            continue
        if not r.returncode:
            break
        print(f'  retry {attempt + 1}: {r.stderr.strip().splitlines()[0][:160] if r.stderr.strip() else "?"}', flush=True)
        f.unlink(missing_ok=True)
    if r is None or r.returncode:
        print('FAILED', f.name, (r.stdout[-2000:] + r.stderr[-2000:]) if r else 'watchdog')
        f.unlink(missing_ok=True)
        sys.exit(1)

lst = SEG / 'list.txt'
lst.write_text(''.join(f"file '{f.name}'\n" for f in files))
silent = SEG / 'video.mp4'
# re-encode the join (visually lossless) so every frame and timestamp survives exactly
subprocess.run([str(ROOT / 'bin/ffmpeg'), '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-vf', 'setpts=N/60/TB', '-r', '60',
                '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', str(silent)], check=True)
subprocess.run([str(ROOT / 'bin/ffmpeg'), '-v', 'error', '-y', '-i', str(silent), '-i', str(ROOT / 'public/audio/final_mix.wav'),
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', str(OUT)], check=True)
print('done', OUT)
