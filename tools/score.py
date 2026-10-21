"""
Stone Labs — original score + sound design, synthesised from scratch (no samples, no third-party audio),
so it is fully cleared for commercial use.

100 BPM (beat 0.6 s, bar 2.4 s) — the same grid as src/timeline.ts. Cue times below mirror the picture.
Output: public/audio/score_raw.wav (then loudness-normalised by tools/build_audio.sh).
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 39.6
N = int(SR * DUR)
BEAT = 0.6
BAR = 2.4
rng = np.random.default_rng(11)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
verb_send = np.zeros((N, 2))
duck = np.ones(N)  # sidechain gain from kick


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf, t, x, gain=1.0, pan=0.0, send=0.0):
    """Mix mono/stereo x into buf at time t. pan -1..1 (equal power)."""
    i = int(round(t * SR))
    if i >= N:
        return
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        x = np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2)
    j = min(N, i + len(x))
    s = max(0, -i)
    buf[max(i, 0):j] += x[s:j - i] * gain
    if send:
        verb_send[max(i, 0):j] += x[s:j - i] * gain * send


def env_adsr(n, a, d, s, r, sus_len):
    t = np.arange(n) / SR
    e = np.zeros(n)
    e = np.where(t < a, t / a, e)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / d, e)
    e = np.where((t >= a + d) & (t < sus_len), s, e)
    e = np.where(t >= sus_len, s * np.exp(-(t - sus_len) / r), e)
    return e


def lp(x, f, order=2):
    sos = signal.butter(order, f, 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def hp(x, f, order=2):
    sos = signal.butter(order, f, 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'band', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def saw(f, n, detune_cents=0.0, phase=0.0):
    t = np.arange(n) / SR
    f = f * 2 ** (detune_cents / 1200)
    out = np.zeros(n)
    kmax = int(min(48, 9000 // f))
    for k in range(1, kmax + 1):
        out += np.sin(2 * np.pi * k * f * t + phase * k) / k
    return out * 0.55


# ─────────────────────────────── harmony ───────────────────────────────
CH = {
    'D': ([50, 57, 61, 64, 66], 38),  # Dmaj9
    'Bm': ([47, 54, 57, 62, 64], 35),  # Bm11
    'G': ([43, 50, 54, 59, 61], 31),  # Gmaj7#11
    'A': ([45, 52, 57, 59, 64], 33),  # A add9
}
PROG = ['D', 'Bm', 'G', 'A']
chords = []  # (start, end, name)
t = 0.0
while t < 33.6 - 1e-6:
    chords.append((t, t + BAR, PROG[int(round(t / BAR)) % 4]))
    t += BAR
chords.append((33.6, 34.8, 'A'))
chords.append((34.8, DUR, 'D'))

# ── pad: detuned saws, slow attack, gently filtered; opens up as the reel builds
for (t0, t1, name) in chords:
    notes, _ = CH[name]
    length = t1 - t0 + 1.4
    n = int(length * SR)
    seg = np.zeros((n, 2))
    for m in notes:
        f = mtof(m)
        for c, d in enumerate([-8, 0, 8]):
            v = saw(f, n, d, phase=rng.uniform(0, 6.28))
            pan = [-0.6, 0, 0.6][c]
            a = (pan + 1) * np.pi / 4
            seg[:, 0] += v * np.cos(a)
            seg[:, 1] += v * np.sin(a)
    e = env_adsr(n, 0.5 if t0 > 0 else 1.2, 0.6, 0.85, 0.6, t1 - t0)
    seg *= e[:, None]
    cutoff = 900 if t0 < 4.8 else (1500 if t0 < 21.6 or (24.0 <= t0 < 30) else 1900)
    if 21.6 <= t0 < 24.0:
        cutoff = 2600  # airy breakdown for the 3D reveal
    if t0 >= 34.8:
        cutoff = 2200
    seg = lp(seg, cutoff, 2)
    place(music, t0, seg, gain=0.03 if t0 >= 34.8 else (0.026 if t0 < 4.8 else 0.018), send=0.5)

# ── sub bass (sine) from 4.8 s, follows roots
for (t0, t1, name) in chords:
    if t0 < 4.8 or 21.6 <= t0 < 24.0 or (33.6 <= t0 < 34.8):
        continue
    _, root = CH[name]
    n = int((t1 - t0 + 0.3) * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * mtof(root) * tt) + 0.25 * np.sin(2 * np.pi * mtof(root + 12) * tt)
    x *= env_adsr(n, 0.04, 0.2, 0.9, 0.12, t1 - t0)
    gain = 0.085 if t0 < 34.8 else 0.0
    place(music, t0, x, gain=gain)

# ── keys: soft FM electric-piano arpeggio + dotted-eighth echo
keys = np.zeros((N, 2))


def ep(f, length=0.9, vel=1.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    idx = 1.6 * np.exp(-tt * 9)
    x = np.sin(2 * np.pi * f * tt + idx * np.sin(2 * np.pi * 2 * f * tt))
    x += 0.18 * np.sin(2 * np.pi * 4 * f * tt) * np.exp(-tt * 18)
    return x * np.exp(-tt * 4.2) * vel * (1 - np.exp(-tt * 900))


PATTERN = [0, 2, 4, 3, 1, 3, 2, 4]
for (t0, t1, name) in chords:
    notes, _ = CH[name]
    upper = [m + 12 for m in notes]
    if t0 >= 34.8:
        for k, m in enumerate(upper[1:]):
            place(keys, t0 + 0.06 * k, ep(mtof(m), 4.5, 0.8), pan=(k - 2) * 0.25)
        continue
    if 33.6 <= t0 < 34.8:
        continue
    step = 0.6 if (t0 < 4.8 or 21.6 <= t0 < 24.0) else 0.3
    k = 0
    tt = t0
    while tt < t1 - 1e-6:
        m = upper[PATTERN[k % 8]]
        vel = 0.55 if step == 0.6 else (0.5 if k % 2 else 0.68)
        place(keys, tt, ep(mtof(m), 0.9, vel), pan=0.35 * np.sin(k * 1.3))
        k += 1
        tt += step
# ping-pong echo at a dotted eighth (0.45 s)
echo = np.zeros_like(keys)
d = int(0.45 * SR)
fb = 0.32
src = keys.copy()
for r in range(1, 5):
    g = fb ** r
    shifted = np.zeros_like(keys)
    shifted[d * r:] = src[:-d * r]
    if r % 2:
        shifted = shifted[:, ::-1]
    echo += shifted * g
keys_bus = lp(keys + 0.8 * lp(echo, 3500), 7000)
music += keys_bus * 0.05
verb_send += keys_bus * 0.03

# ── drums
def kick():
    n = int(0.42 * SR)
    tt = np.arange(n) / SR
    f = 46 + 75 * np.exp(-tt * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt * 7.5)
    x += 0.25 * hp(rng.normal(0, 1, n), 1500) * np.exp(-tt * 180)
    return x


def clap():
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    noise = bp(rng.normal(0, 1, n), 1100, 5200)
    e = np.zeros(n)
    for o in [0, 0.011, 0.022]:
        e += np.where(tt >= o, np.exp(-(tt - o) * 70), 0) * 0.5
    e += np.where(tt >= 0.03, np.exp(-(tt - 0.03) * 14), 0) * 0.6
    return noise * e


def hat(open_=False):
    n = int((0.18 if open_ else 0.06) * SR)
    tt = np.arange(n) / SR
    return hp(rng.normal(0, 1, n), 7500, 4) * np.exp(-tt * (18 if open_ else 70))


K = kick()
duck_shape = 1 - 0.55 * np.exp(-np.arange(int(0.35 * SR)) / SR * 11)


def add_kick(t, g=0.5):
    place(music, t, K, gain=g)
    i = int(t * SR)
    j = min(N, i + len(duck_shape))
    duck[i:j] = np.minimum(duck[i:j], duck_shape[: j - i])


def frange(a, b, s):
    x = a
    while x < b - 1e-6:
        yield round(x, 4)
        x += s


for t in frange(4.8, 12.0, 1.2):
    add_kick(t, 0.5)
for t in frange(12.0, 21.6, 0.6):
    add_kick(t)
for t in frange(24.0, 30.0, 1.2):
    add_kick(t, 0.55)
for t in frange(30.0, 33.6, 0.6):
    add_kick(t)
for t in frange(12.0 + 0.6, 21.6, 1.2):
    place(music, t, clap(), gain=0.16, send=0.35, pan=0.05)
for t in frange(30.0 + 0.6, 33.6, 1.2):
    place(music, t, clap(), gain=0.16, send=0.35, pan=0.05)
for t in frange(24.0 + 1.8, 30.0, 2.4):
    place(music, t, clap(), gain=0.09, send=0.5)
for rng_a, rng_b in [(12.0, 21.6), (24.0, 33.6)]:
    for k, t in enumerate(frange(rng_a + 0.3, rng_b, 0.6)):
        place(music, t, hat(k % 4 == 3), gain=0.05 if k % 2 else 0.04, pan=0.3)
    for t in frange(rng_a + 0.15, rng_b, 0.3):
        place(music, t, hat(), gain=0.014, pan=-0.35)

# apply sidechain to everything musical except the kick itself is fine (it is short)
music *= duck[:, None] ** 0.8

# ─────────────────────────────── sound design ───────────────────────────────
def svf_sweep(x, f_curve, q=0.9):
    """State-variable band-pass with a per-sample cutoff curve."""
    y = np.zeros_like(x)
    low = band = 0.0
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(f_curve[i], 9000) / SR)
        high = x[i] - low - q * band
        band += f * high
        low += f * band
        y[i] = band
    return y


def whoosh(dur=0.9, peak=0.62, f_lo=250, f_hi=3200, pan_from=-0.7, pan_to=0.7, air=0.4):
    n = int(dur * SR)
    tt = np.arange(n) / dur / SR
    pk = peak
    shape = np.where(tt < pk, (tt / pk) ** 2.2, np.exp(-(tt - pk) / (1 - pk) * 4.5))
    f = f_lo + (f_hi - f_lo) * np.where(tt < pk, (tt / pk) ** 1.5, np.exp(-(tt - pk) / (1 - pk) * 3))
    noise = rng.normal(0, 1, n)
    body = svf_sweep(noise, f, 0.7) * 0.6 + air * hp(noise, 5000) * 0.25
    body *= shape
    pans = np.linspace(pan_from, pan_to, n)
    a = (pans + 1) * np.pi / 4
    return np.stack([body * np.cos(a), body * np.sin(a)], 1) * np.sqrt(2)


def impact(size=1.0):
    n = int(1.4 * SR)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (42 + 30 * np.exp(-tt * 20)) * tt) * np.exp(-tt * 3.2 / size)
    thump = lp(rng.normal(0, 1, n), 400) * np.exp(-tt * 30)
    return (sub * 0.9 + thump * 0.5) * 0.55


def stone_tap(pitch=1.0, decay=1.0):
    """Modal 'stone' knock — the studio's sonic signature (pills, logo stones)."""
    n = int(0.7 * SR)
    tt = np.arange(n) / SR
    modes = [(196, 0.22, 1.0), (467, 0.12, 0.55), (811, 0.07, 0.35), (1340, 0.045, 0.22), (2210, 0.03, 0.12)]
    x = sum(a * np.sin(2 * np.pi * f * pitch * tt + rng.uniform(0, 6)) * np.exp(-tt / (d * decay)) for f, d, a in modes)
    x += 0.4 * bp(rng.normal(0, 1, n), 1500, 6000) * np.exp(-tt * 400)
    return x * (1 - np.exp(-tt * 2000))


def air(dur=0.35):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = np.minimum(tt / 0.06, 1) * np.exp(-np.maximum(tt - 0.06, 0) * 12)
    return bp(rng.normal(0, 1, n), 2500, 9000) * e


def click(freq=2600):
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 260) + 0.4 * hp(rng.normal(0, 1, n), 3000) * np.exp(-tt * 900))


def riser(dur):
    n = int(dur * SR)
    tt = np.arange(n) / dur / SR
    noise = rng.normal(0, 1, n)
    f = 300 + 5000 * tt ** 2
    x = svf_sweep(noise, f, 0.5) * tt ** 2.5
    tone = np.sin(2 * np.pi * np.cumsum(220 + 440 * tt ** 2) / SR) * tt ** 3 * 0.15
    return x + tone


# opening — breath + stone tap as the first word lands
place(sfx, 0.0, whoosh(0.25, 0.3, 300, 1800, -0.2, 0.2, 0.6), gain=0.15, send=0.3)
for t in [0.06, 0.36, 0.66]:
    place(sfx, t, air(), gain=0.12, pan=-0.2 + 0.2 * t * 3, send=0.2)
place(sfx, 0.06, impact(0.8), gain=0.45)
place(sfx, 0.06, stone_tap(0.8), gain=0.25, send=0.4)
for k, t in enumerate([1.75, 2.0, 2.25, 2.5]):  # pill tags
    place(sfx, t + 0.02, stone_tap([1.6, 1.8, 1.45, 2.0][k], 0.6), gain=0.16, pan=[0.5, 0.4, -0.5, 0.5][k], send=0.3)
place(sfx, 2.92, air(0.5), gain=0.08, send=0.3)  # logo mark breathes in

# camera glides between clusters — whoosh peaking on arrival, soft impact on the downbeat
GLIDES = [  # (arrival, glide duration, pan_from, pan_to, impact)
    (4.8, 1.0, -0.2, 0.2, 0.9),
    (12.0, 0.9, -0.7, 0.7, 1.0),
    (15.6, 0.8, -0.7, 0.7, 0.0),
    (21.6, 0.8, 0.5, -0.4, 0.8),
    (30.0, 0.9, 0.6, -0.6, 1.0),
    (34.8, 0.8, 0.0, 0.0, 0.0),
]
for (t, d, pf, pt, imp) in GLIDES:
    place(sfx, t - d * 0.7, whoosh(d, 0.7, 260, 3000, pf, pt), gain=0.3, send=0.15)
    if imp:
        place(sfx, t, impact(imp), gain=0.5 * imp)
# board pull-back (reverse-feel swell) and push into the 360° render
place(sfx, 19.2, whoosh(1.0, 0.8, 180, 1400, 0.3, -0.3, 0.2), gain=0.22, send=0.4)
place(sfx, 23.3, whoosh(0.9, 0.78, 150, 2200, -0.1, 0.1, 0.8), gain=0.28, send=0.5)
place(sfx, 24.0, impact(0.7), gain=0.3)
# room whip-pans
for t in [25.8, 27.6]:
    place(sfx, t - 0.36, whoosh(0.62, 0.58, 400, 4200, -0.8, 0.8, 0.5), gain=0.34, send=0.1)
# text reveals for section headlines
for t in [4.85, 11.6, 21.25, 29.75]:
    place(sfx, t, air(0.4), gain=0.1, send=0.25)
# kinetic details: rolling words, keyframe ticks, phone wipes, URL typing, capability tiles
for t in [7.72, 8.92, 10.12]:
    place(sfx, t, click(2300), gain=0.06, pan=-0.3)
    place(sfx, t, air(0.25), gain=0.05)
for t in [13.25, 16.25, 17.1, 19.0]:
    place(sfx, t, air(0.45), gain=0.09, pan=0.2, send=0.2)
    place(sfx, t + 0.05, click(1800), gain=0.05)
for (a, b) in [(12.2, 13.1), (15.9, 16.8)]:
    for t in np.arange(a, b, 0.045):
        place(sfx, t + rng.uniform(0, 0.012), click(rng.uniform(3200, 4200)), gain=0.022, pan=0.5)
for k, t in enumerate([30.3, 30.9, 31.5, 32.1]):
    place(sfx, t, stone_tap(1.5 + 0.12 * k, 0.5), gain=0.12, pan=[-0.4, 0.4, -0.4, 0.4][k], send=0.3)
# into the logo: riser, then the two stones meet
place(sfx, 33.6, riser(1.2), gain=0.12, send=0.5)
place(sfx, 35.32, stone_tap(0.62, 1.8), gain=0.5, send=0.6)
place(sfx, 35.32, impact(1.3), gain=0.55)
place(sfx, 35.7, air(0.6), gain=0.07, send=0.4)
place(sfx, 36.95, click(2000), gain=0.04)

# ─────────────────────────────── reverb + master ───────────────────────────────
ir_len = int(2.6 * SR)
tt = np.arange(ir_len) / SR
ir = rng.normal(0, 1, (ir_len, 2)) * np.exp(-tt / 0.55)[:, None]
ir = lp(ir, 5500)
ir[: int(0.012 * SR)] = 0  # pre-delay
ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([signal.fftconvolve(verb_send[:, c], ir[:, c])[:N] for c in range(2)], 1)

mix = music + sfx + wet * 0.55
mix = hp(mix, 35)
# tail fade only on the very last frames
fade = np.ones(N)
fl = int(0.5 * SR)
fade[-fl:] = np.linspace(1, 0, fl) ** 2
mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / 1.1
mix /= np.abs(mix).max() / 0.89
wavfile.write('public/audio/score_raw.wav', SR, mix.astype(np.float32))


def db(x):
    return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)


for name, b in [('music', music), ('sfx', sfx), ('wet', wet)]:
    print(f'{name:6s} rms {db(b):6.1f} dB  peak {20*np.log10(np.abs(b).max()+1e-12):6.1f} dB')
for s in range(0, 40, 4):
    print(f'{s:2d}s {db(mix[s*SR:(s+4)*SR]):6.1f}', end=' |')
print()
