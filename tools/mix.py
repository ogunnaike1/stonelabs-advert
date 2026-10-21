"""
Final mix: Lyria synthwave bed + Gemini voiceover (placed per VO_CUES in src/timeline.ts) + sound design.
Music is ducked under the voice; everything is loudness-normalised afterwards by tools/build_audio.sh.
Output: assets/audio/mix_raw.wav
"""
import re, subprocess, pathlib, numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
DUR = 40.0
N = int(SR * DUR)
FF = str(ROOT / 'bin' / 'ffmpeg')

MUSIC = ROOT / 'assets/audio/music_live_a.wav'
MUSIC_OFFSET = 0.53  # first downbeat in the Lyria take → aligns the bar grid to 0.0 s
VO_TAKE = ROOT / 'assets/audio/vo_master.wav'


def load(path, extra=(), pre=()):
    raw = subprocess.run([FF, '-v', 'error', *pre, '-i', str(path), *extra, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output='sos')


# ── music: bar-aligned edit of the Lyria take (100 BPM, src downbeats at 0.53 + 2.4n) ──
# video 0.0 = src 7.13 → the track's big drop (src 7.73) lands on the stone slam at video 0.6;
# at video 22.2 the peak section (src 22.13) repeats for 3 bars so the groove drives through to the logo.
EDIT = [(0.6, 7.73, 21.6), (22.2, 22.13, DUR - 22.2)]  # (video start, src start, duration) — music crashes in on the slam
music = np.zeros((N, 2))
full = load(MUSIC)
xf = int(0.03 * SR)
for vs, ss_, du in EDIT:
    seg = full[int(ss_ * SR): int((ss_ + du) * SR) + xf].copy()
    ramp = np.linspace(0, 1, xf)
    if vs > 0.6:
        seg[:xf] *= ramp[:, None]
    else:
        seg[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[:, None]
    i = int(vs * SR); j = min(N, i + len(seg))
    if j < N:
        seg[j - i - xf: j - i] *= ramp[::-1, None]
    music[i:j] += seg[: j - i]
m = music.copy()
# downbeat punch: the music's first hit at 0.6 s gets a +2.5 dB burst (decays over 150 ms)
pk = np.ones(N); i0 = int(0.6 * SR); w = int(0.15 * SR)
pk[i0:i0 + w] = 1 + (10 ** (2.5 / 20) - 1) * np.linspace(1, 0, w)
music *= pk[:, None]
fade = np.ones(N); fl = int(1.4 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
music *= fade[:, None]
# tame the lead's 3.2 kHz bite (reviewer: fatiguing) ≈ −2 dB
music = music - signal.sosfilt(sos('band', [2700, 3800]), music, axis=0) * 0.2

# ── voiceover ──
ts = (ROOT / 'src/timeline.ts').read_text()
cues = [tuple(float(v) for v in c) for c in re.findall(r'\[\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\]', ts.split('VO_CUES')[1].split('];')[0])]
vo = np.zeros((N, 2))
for place, a, b, tempo in cues:
    extra = ['-af', f'atempo={tempo},afade=t=in:d=0.02,afade=t=out:st={max(0, (b - a) / tempo - 0.06)}:d=0.06']
    seg = load(VO_TAKE, extra, pre=['-ss', str(a), '-to', str(b)])
    i = int(place * SR); j = min(N, i + len(seg))
    vo[i:j] += seg[: j - i]
# voice polish: HPF, presence lift, gentle compression, short plate
vo = signal.sosfilt(sos('high', 85), vo, axis=0)
mud = signal.sosfilt(sos('band', [170, 330]), vo, axis=0)
vo = vo - mud * 0.15  # ≈ −1.5 dB around 200–250 Hz (keep warmth, avoid masking)
pres = signal.sosfilt(sos('band', [2500, 6000]), vo, axis=0)
air = signal.sosfilt(sos('high', 9000), vo, axis=0)
vo = vo + pres * 0.15 + air * 0.12
# de-esser: duck the 6–8.5 kHz band when it spikes
ss = signal.sosfilt(sos('band', [6000, 8500]), vo, axis=0)
se = np.sqrt(np.maximum(signal.sosfilt(sos('low', 40), (ss ** 2).mean(1)), 0))
ve = np.sqrt(np.maximum(signal.sosfilt(sos('low', 40), (vo ** 2).mean(1)), 0)) + 1e-9
ds = np.clip((se / ve - 0.25) * 2.0, 0, 0.6)
vo = vo - ss * ds[:, None]
envv = np.sqrt(np.maximum(signal.sosfilt(sos('low', 12), vo.mean(1) ** 2), 0) + 1e-12)
thr = 10 ** (-24 / 20)
gain = np.where(envv > thr, (envv / thr) ** (1 / 3 - 1), 1.0)  # 3:1 above threshold
vo *= gain[:, None]
tt = np.arange(int(1.2 * SR)) / SR
rng = np.random.default_rng(5)
ir = rng.normal(0, 1, (len(tt), 2)) * np.exp(-tt / 0.25)[:, None]
ir /= np.sqrt((ir ** 2).sum(0))
vo = vo + np.stack([signal.fftconvolve(vo[:, c], ir[:, c])[:N] for c in range(2)], 1) * 0.06

# ── sidechain: duck the music under the voice (−7 dB, 60 ms attack / 350 ms release) ──
act = (np.abs(vo).mean(1) > 10 ** (-38 / 20)).astype(float)
k_att, k_rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.35 * SR))
g = np.zeros(N); s = 0.0
for i in range(N):
    s = (k_att * s + (1 - k_att) * act[i]) if act[i] > s else (k_rel * s + (1 - k_rel) * act[i])
    g[i] = s
duck = 10 ** (-6 * g / 20)
music *= duck[:, None]

sfx = load(ROOT / 'assets/audio/sfx.wav')[:N]
sfxp = np.zeros((N, 2)); sfxp[: len(sfx)] = sfx


def rms_db(x):
    return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)


# level the stems against each other
music *= 10 ** ((-20.0 - rms_db(m[: N])) / 20)
vo *= 10 ** ((-16.5 - rms_db(vo[np.abs(vo).mean(1) > 1e-4])) / 20)


def compress(x, thr_db, ratio, att, rel, knee_ceiling=None):
    lvl = np.abs(x).max(1)
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    e = np.zeros(len(lvl)); v = 0.0
    for i in range(len(lvl)):
        c = ka if lvl[i] > v else kr
        v = c * v + (1 - c) * lvl[i]
        e[i] = v
    edb = 20 * np.log10(e + 1e-9)
    over = np.maximum(0, edb - thr_db)
    gdb = -over * (1 - 1 / ratio)
    return x * (10 ** (gdb / 20))[:, None]


def limit(x, ceiling_db, look=0.004, rel=0.08):
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(np.abs(x).max(1), int(look * SR) * 2 + 1)
    g = np.minimum(1.0, 10 ** (ceiling_db / 20) / (pk + 1e-9))
    g = maximum_filter1d(1 - g, int(look * SR) * 2 + 1)  # hold
    g = 1 - signal.lfilter([1 - np.exp(-1 / (rel * SR))], [1, -np.exp(-1 / (rel * SR))], g)
    g = np.minimum(g, np.minimum(1.0, 10 ** (ceiling_db / 20) / (pk + 1e-9)))
    return x * g[:, None]


speech = lambda v: v[np.abs(v).max(1) > 10 ** (-45 / 20)]
vo = compress(vo, -24, 3, 0.005, 0.15)
vo *= 10 ** ((-19.0 - rms_db(speech(vo))) / 20)
vo = limit(vo, -5.0)
sfxp *= 0.9
sfxp = sfxp - signal.sosfilt(sos('high', 9000), sfxp, axis=0) * 0.16  # −1.5 dB air shelf on whooshes
mix = music + vo + sfxp
mix = signal.sosfilt(sos('high', 28), mix, axis=0)
# soft limiter
mix = np.tanh(mix * 1.05) / 1.05
mix /= max(1.0, np.abs(mix).max() / 0.95)
wavfile.write(ROOT / 'assets/audio/mix_raw.wav', SR, mix.astype(np.float32))
for name, x in [('music', music), ('vo', vo), ('sfx', sfxp), ('mix', mix)]:
    print(f'{name:5s} rms {rms_db(x):6.1f} dB   peak {20 * np.log10(np.abs(x).max() + 1e-12):6.1f} dB')
print('vo cues', len(cues))
if __name__ == '__main__' and False:
    pass
