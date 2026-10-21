"""
Sound design for the Stone Labs reel — layered, synthesised from scratch (no third-party samples).
Every cue mirrors an on-screen event in src/timeline.ts / src/three/World.tsx.
Output: assets/audio/sfx.wav (48 kHz stereo float) — mixed by tools/mix.py.
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 40.0
N = int(SR * DUR)
rng = np.random.default_rng(23)
out = np.zeros((N, 2))
send = np.zeros((N, 2))


def place(x, t, g=1.0, pan=0.0, rev=0.0):
    i = int(round(t * SR))
    if x.ndim == 1:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        x = np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2)
    j = min(N, i + len(x))
    if j <= max(i, 0):
        return
    s = max(0, -i)
    out[max(i, 0):j] += x[s:j - i] * g
    send[max(i, 0):j] += x[s:j - i] * g * rev


def filt(x, kind, f, order=2):
    return signal.sosfilt(signal.butter(order, f, kind, fs=SR, output='sos'), x, axis=0)


def svf(x, fc, q=0.8):
    y = np.zeros_like(x); lo = bp = 0.0
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], 12000) / SR)
        hi = x[i] - lo - q * bp; bp += f * hi; lo += f * bp; y[i] = bp
    return y


def env(n, peak, a_pow=2.2, decay=4.5):
    u = np.linspace(0, 1, n)
    return np.where(u < peak, (u / peak) ** a_pow, np.exp(-(u - peak) / (1 - peak) * decay))


def whoosh(dur, peak=0.65, f0=200, f1=3200, pan=(-0.7, 0.7), body=0.6, tone=0.0, flutter=0.0):
    """Layered whoosh: swept band-noise + low air body + optional tonal swish + rotation flutter."""
    n = int(dur * SR); u = np.linspace(0, 1, n)
    e = env(n, peak)
    fc = f0 + (f1 - f0) * np.where(u < peak, (u / peak) ** 1.6, np.exp(-(u - peak) / (1 - peak) * 2.5))
    nz = rng.normal(0, 1, n)
    x = svf(nz, fc, 0.6) * 0.7
    x += filt(nz, 'low', 500) * body * 0.9
    x += filt(nz, 'high', 6000) * 0.12
    if tone:
        ph = 2 * np.pi * np.cumsum(fc * 0.5) / SR
        x += np.sin(ph + 0.4 * np.sin(ph * 2.01)) * tone * 0.25
    if flutter:
        x *= 1 - flutter * 0.5 * (1 + np.sin(2 * np.pi * np.cumsum(6 + 22 * e) / SR))
    x *= e
    p = np.linspace(pan[0], pan[1], n); a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2)


def boom(size=1.0):
    n = int(2.2 * SR); tt = np.arange(n) / SR
    f = 38 + 55 * np.exp(-tt * 16)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2 / size)
    click = filt(rng.normal(0, 1, n), 'band', [1500, 6000]) * np.exp(-tt * 260)
    thud = filt(rng.normal(0, 1, n), 'low', 260) * np.exp(-tt * 22)
    return sub * 0.9 + click * 0.25 + thud * 0.6


def glass_tap(pitch=1.0):
    n = int(0.45 * SR); tt = np.arange(n) / SR
    modes = [(1850, .05, 1), (3120, .035, .6), (4870, .025, .4), (720, .06, .5)]
    x = sum(a * np.sin(2 * np.pi * f * pitch * tt + rng.uniform(0, 6)) * np.exp(-tt / d) for f, d, a in modes)
    x += filt(rng.normal(0, 1, n), 'high', 2500) * np.exp(-tt * 500) * 0.8
    x += filt(rng.normal(0, 1, n), 'low', 300) * np.exp(-tt * 60) * 0.6  # body on the card
    return x


def stone(pitch=1.0, decay=1.0):
    n = int(1.2 * SR); tt = np.arange(n) / SR
    modes = [(160, .3, 1), (402, .16, .6), (733, .1, .4), (1210, .06, .25), (2050, .04, .15)]
    x = sum(a * np.sin(2 * np.pi * f * pitch * tt + rng.uniform(0, 6)) * np.exp(-tt / (d * decay)) for f, d, a in modes)
    return x + filt(rng.normal(0, 1, n), 'band', [800, 5000]) * np.exp(-tt * 300) * 0.5


def ui_pop(f=880):
    n = int(0.35 * SR); tt = np.arange(n) / SR
    fm = f * (1 + 0.5 * np.exp(-tt * 40))
    x = np.sin(2 * np.pi * np.cumsum(fm) / SR) * np.exp(-tt * 14)
    x += 0.4 * np.sin(2 * np.pi * np.cumsum(fm * 2) / SR) * np.exp(-tt * 30)
    return x * (1 - np.exp(-tt * 3000))


def pen(dur=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR
    am = np.clip(np.sin(2 * np.pi * np.cumsum(9 + 7 * rng.random(n)) / SR) * 0.5 + 0.5, 0, 1) ** 2
    x = filt(rng.normal(0, 1, n), 'band', [2200, 7000]) * am
    return x * np.minimum(tt / 0.05, 1) * np.minimum((dur - tt) / 0.15, 1)


def shimmer(dur, f0=600, f1=2400):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** u
    x = sum(np.sin(2 * np.pi * np.cumsum(f * k) / SR + k) / k for k in (1, 1.5, 2.01, 3.02))
    return x * np.sin(np.pi * u) ** 1.5 * 0.4


def crackle(dur, density=900):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    x = np.zeros(n)
    k = (rng.random(n) < density / SR * (1 - u) ** 1.5)
    x[k] = rng.normal(0, 1, k.sum())
    return filt(x, 'high', 3000) * 1.2


def riser(dur):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    nz = svf(rng.normal(0, 1, n), 300 + 7000 * u ** 2, 0.5)
    return (nz + np.sin(2 * np.pi * np.cumsum(180 + 600 * u ** 2) / SR) * 0.2) * u ** 2.6


def bell(f=1320):
    n = int(2.5 * SR); tt = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for m, a, d in [(1, 1, 1.6), (2.76, .4, 3), (5.4, .2, 6)]) * (1 - np.exp(-tt * 800))


def lock(size=1.0):
    """Satisfying precision 'clack-lock': double transient + metallic ring + small body thump."""
    n = int(0.6 * SR); tt = np.arange(n) / SR
    x = np.zeros(n)
    for o, a in [(0, 1.0), (0.016, 0.7)]:
        i = int(o * SR); m = n - i
        x[i:] += filt(rng.normal(0, 1, m), 'band', [2500, 9000]) * np.exp(-tt[:m] * 900) * a
    x += sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, a, d in [(1240, .25, 30), (2630, .15, 45), (3910, .08, 60)])
    x += np.sin(2 * np.pi * (90 + 60 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 18) * 0.6 * size
    return x


def tick(f=3200):
    n = int(0.08 * SR); tt = np.arange(n) / SR
    return (filt(rng.normal(0, 1, n), 'band', [f * 0.7, f * 1.6]) * np.exp(-tt * 700) + np.sin(2 * np.pi * f * tt) * np.exp(-tt * 260) * 0.3)


def servo(dur, f0=180, f1=520):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    f = f0 + (f1 - f0) * u ** 0.7
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph + 1.2 * np.sin(ph * 3.01)) * 0.4 + filt(rng.normal(0, 1, n), 'band', [800, 3000]) * 0.25
    return x * np.sin(np.pi * u) ** 0.8


def stone_hit(weight=1.0):
    """Physically-modelled stone-on-stone impact: mineral crack + ~40 inharmonic modes + body thud + sub + early reflections."""
    n = int(2.4 * SR); tt = np.arange(n) / SR
    crack = filt(rng.normal(0, 1, n), 'band', [1800, 9000]) * np.exp(-tt * 380)
    crack += filt(rng.normal(0, 1, n), 'band', [600, 2500]) * np.exp(-tt * 140) * 0.7
    modes = np.zeros(n)
    for _ in range(42):
        f = rng.uniform(320, 5200) ** 1.0
        d = 0.02 + 0.25 * (400 / f) ** 0.8 * rng.uniform(0.6, 1.3)
        modes += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) * np.exp(-tt / d) * rng.uniform(0.2, 1.0) * (400 / f) ** 0.35
    modes *= 0.09
    body = filt(rng.normal(0, 1, n), 'low', 380) * np.exp(-tt * 26) * 1.4
    sub = np.sin(2 * np.pi * np.cumsum(46 + 70 * np.exp(-tt * 22)) / SR) * np.exp(-tt * 3.0) * 1.3 * weight
    x = crack * 0.9 + modes + body + sub
    # early reflections (a big stone room)
    er = np.zeros(n)
    for dly, g in [(0.011, 0.5), (0.019, 0.38), (0.031, 0.3), (0.047, 0.22), (0.068, 0.15)]:
        k = int(dly * SR); er[k:] += x[:-k] * g
    return x + er * 0.6


def clack():
    """Dense mineral 'clack' transient (polished granite on granite)."""
    n = int(0.25 * SR); tt = np.arange(n) / SR
    x = filt(rng.normal(0, 1, n), 'band', [2300, 4300], 4) * np.exp(-tt * 520) * 2.2
    x += sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) * a for f, d, a in [(2870, 90, .6), (3410, 120, .45), (4120, 160, .3), (1630, 60, .35)])
    return x


def crash(dur=2.2):
    n = int(dur * SR); tt = np.arange(n) / SR
    return filt(rng.normal(0, 1, n), 'band', [3500, 14000]) * np.exp(-tt * 2.6) * (1 - np.exp(-tt * 900))


def scrape(dur=0.6):
    """Granite-on-granite scrape: grainy friction noise with surface roughness AM and a resonant body."""
    n = int(dur * SR); u = np.linspace(0, 1, n)
    grain = np.clip(rng.normal(0, 1, n), -3, 3) * (0.5 + 0.5 * (rng.random(n) < 0.08))
    am = np.abs(filt(rng.normal(0, 1, n), 'low', 60)) * 3
    x = filt(grain * am, 'band', [700, 6500]) + filt(grain * am, 'band', [800, 1800]) * 1.3 + filt(grain, 'band', [180, 600]) * 0.4
    return x * np.sin(np.pi * u) ** 0.6


def suck(dur=0.6):
    """Reverse-reverb swell that cuts off dead on the impact."""
    n = int(dur * SR); u = np.linspace(0, 1, n)
    x = filt(rng.normal(0, 1, n), 'band', [300, 7000]) * u ** 3.2
    return x + np.sin(2 * np.pi * np.cumsum(120 + 500 * u ** 2) / SR) * u ** 4 * 0.25


def kick_p():
    n = int(0.5 * SR); tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(44 + 110 * np.exp(-tt * 34)) / SR) * np.exp(-tt * 6.5)
    return x + filt(rng.normal(0, 1, n), 'high', 2500) * np.exp(-tt * 300) * 0.3


def clap_p():
    n = int(0.45 * SR); tt = np.arange(n) / SR
    e = sum(np.where(tt >= o, np.exp(-(tt - o) * 80), 0) for o in (0, 0.012, 0.024)) * 0.5
    e += np.where(tt >= 0.03, np.exp(-(tt - 0.03) * 9), 0) * 0.5 * (tt < 0.24)  # gated tail
    return filt(rng.normal(0, 1, n), 'band', [900, 6000]) * e


# ── cue sheet ───────────────────────────────────────────────────────────────────
# HOOK — the two stones of the mark slam together, the type snaps in, the stones part past the lens
place(suck(0.6), 0.0, 0.25, rev=0.0)
place(whoosh(0.68, 0.86, 300, 4200, (-0.9, -0.1), body=0.7), 0.0, 0.33, rev=0.1)   # top stone rushes in (left)
place(whoosh(0.68, 0.86, 260, 3800, (0.9, 0.1), body=0.7), 0.0, 0.33, rev=0.1)     # bottom stone rushes in (right)
place(stone_hit(1.2), 0.6, 0.95, rev=0.25)                                     # SLAM — stone on stone
place(clack(), 0.588, 0.9, -0.05, rev=0.15)
place(clack(), 0.592, 0.6, 0.08, rev=0.15)
place(crash(), 0.6, 0.16, 0.0, rev=0.3)
place(kick_p(), 0.6, 0.6, rev=0.0)
place(stone_hit(0.5), 0.612, 0.45, 0.15, rev=0.2)
place(boom(2.0), 0.6, 0.6, rev=0.35)
place(lock(1.2), 0.6, 0.3, rev=0.2)
place(lock(0.5), 1.06, 0.16, -0.4, rev=0.25)                                     # IDEAS, split-snap
place(lock(0.5), 1.24, 0.16, 0.4, rev=0.25)                                      # MADE REAL. split-snap
place(shimmer(1.3, 400, 1200), 0.75, 0.06, rev=0.7)                               # light sweeps across the polished stones
place(riser(0.6), 1.4, 0.14, rev=0.4)
place(whoosh(0.7, 0.8, 200, 3600, (0.1, -1.0), body=0.9, tone=0.0), 1.92, 0.24, rev=0.15)   # top stone flies past (left)
place(whoosh(0.7, 0.8, 180, 3200, (-0.1, 1.0), body=0.9, tone=0.0), 1.95, 0.24, rev=0.15)   # bottom stone flies past (right)
place(whoosh(0.75, 0.85, 120, 2400, (0, 0), body=1.0), 1.95, 0.22, rev=0.3)                # push through the gap
place(scrape(0.6), 1.88, 0.95, -0.2, rev=0.2)                                    # the stones grind apart
place(scrape(0.5), 1.93, 0.65, 0.25, rev=0.2)
place(crackle(0.55, 2600), 1.9, 0.18, 0.0, rev=0.2)                              # micro-debris
place(clack(), 1.9, 0.25, -0.3, rev=0.2)                                     # the stones grind apart
place(boom(1.0), 2.6, 0.45, rev=0.35)
place(whoosh(1.6, 0.55, 200, 2600, (-0.3, 0.4), tone=0.5, flutter=0.6), 2.1, 0.3, rev=0.2)  # first slab flips in
place(lock(0.7), 2.5, 0.16, 0.0, rev=0.25)                                       # title card snaps into the grid
for i in range(10):                                                              # STONE LABS tracks in…
    place(tick(2000 + i * 150), 2.62 + i * 0.035, 0.04, -0.5 + i * 0.1, rev=0.2)
place(lock(0.6), 3.15, 0.15, 0.0, rev=0.3)                                       # …and locks
place(pen(0.9), 3.2, 0.09, 0.1, rev=0.2)                                         # "creative digital studio"
place(lock(0.6), 3.95, 0.12, 0.2, rev=0.25)                                      # slab settles
place(whoosh(1.2, 0.6, 220, 3000, (-0.2, 0.5), tone=0.5, flutter=0.7), 4.9, 0.4, rev=0.15)  # hero spins down into the pile
place(whoosh(0.8, 0.7, 220, 2600, (0.3, -0.3)), 5.45, 0.26, rev=0.1)            # camera glide down
place(boom(0.6), 6.0, 0.36, rev=0.15)
for i in range(8):                                                               # pile lands phone by phone
    place(glass_tap(0.85 + 0.08 * (i % 4)), 6.25 + i * 0.09 + 0.6, 0.15, pan=-0.6 + 0.17 * i, rev=0.25)
place(lock(0.8), 6.97, 0.2, 0.0, rev=0.2)                                        # hero phone locks into its slot
for k, tt_ in enumerate([6.55, 6.69]):                                           # DESIGN / IN MOTION. split-snap
    place(lock(0.3), tt_, 0.1, (-0.4, 0.4)[k], rev=0.2)
for i in range(3):                                                               # icon cards snap into the grid
    place(tick(2200 + 300 * i), 6.55 + i * 0.1 + 0.35, 0.07, (-0.6, 0, 0.6)[i], rev=0.2)
place(whoosh(0.95, 0.85, 120, 1800, (-0.2, 0.2), body=1.0), 7.75, 0.5, rev=0.2)  # dive into the pile
place(boom(0.5), 8.62, 0.3)
place(whoosh(0.9, 0.7, 300, 2600, (0.2, -0.2), body=0.4), 10.55, 0.28, rev=0.2) # pull back
place(whoosh(1.4, 0.45, 200, 3200, (-0.4, 0.7), tone=0.6, flutter=0.7), 11.3, 0.42, rev=0.2)  # hero rises out & flips
place(whoosh(0.9, 0.75, 250, 3200, (-0.7, 0.7)), 11.75, 0.28, rev=0.12)         # glide → web
place(boom(0.7), 12.6, 0.38, rev=0.15)
place(lock(0.7), 12.95, 0.18, 0.3, rev=0.2)                                      # hero lands in the web layout
for k, tt_ in enumerate([13.05, 13.19]):                                         # BUILT FOR / THE WEB. split-snap
    place(lock(0.3), tt_, 0.1, (-0.4, 0.4)[k], rev=0.2)
for i in range(3):
    place(tick(2400 + 250 * i), 12.85 + i * 0.1 + 0.35, 0.06, -0.6, rev=0.2)
place(servo(0.85), 14.12, 0.13, 0.2, rev=0.3)                                    # exploded view: layers separate
for i in range(5):
    place(tick(1800 + 380 * i), 14.25 + i * 0.13, 0.09, -0.4 + 0.2 * i, rev=0.3)
place(whoosh(0.5, 0.75, 1500, 300, (0.4, -0.2), body=0.3), 15.45, 0.2, rev=0.2) # collapse
place(lock(1.1), 15.9, 0.34, 0.0, rev=0.3)                                       # …and lock
place(whoosh(0.85, 0.75, 250, 3200, (-0.7, 0.7)), 15.95, 0.3, rev=0.12)         # glide → skin
place(whoosh(1.5, 0.55, 200, 2600, (0.4, -0.2), tone=0.6, flutter=0.6), 16.5, 0.34, rev=0.2)
place(boom(0.6), 16.8, 0.34)
for i in range(9):                                                               # "WELLNESS," letters
    place(tick(2400 + i * 120), 16.95 + i * 0.028, 0.04, -0.4 + i * 0.1, rev=0.2)
place(pen(1.0), 17.25, 0.1, -0.1, rev=0.2)
place(whoosh(0.7, 0.6, 600, 4000, (0, -0.8), body=0.2), 17.85, 0.18, rev=0.2)  # fan opens L
place(whoosh(0.7, 0.6, 600, 4000, (0, 0.8), body=0.2), 17.95, 0.18, rev=0.2)   # fan opens R
place(lock(0.4), 18.5, 0.1, -0.5, rev=0.2)
place(lock(0.4), 18.56, 0.1, 0.5, rev=0.2)
place(whoosh(0.9, 0.8, 150, 1400, (0.3, -0.3), body=0.8), 20.05, 0.3, rev=0.4)  # board pull-back
place(riser(0.7), 20.9, 0.16, rev=0.4)                                           # push all the way into the orb
place(whoosh(0.75, 0.85, 120, 3000, (0, 0), body=0.9), 20.9, 0.42, rev=0.3)
place(boom(1.0), 21.6, 0.42, rev=0.3)
place(whoosh(1.4, 0.12, 2400, 160, (0, 0), body=1.0), 21.7, 0.32, rev=0.5)     # macro → wide pull
for k, tt_ in enumerate([22.8, 22.94]):                                          # BEYOND / THE SCREEN. split-snap
    place(lock(0.3), tt_, 0.1, (-0.4, 0.4)[k], rev=0.2)
place(tick(2300), 22.75, 0.07, -0.6, rev=0.2)
place(tick(2700), 22.85, 0.07, 0.6, rev=0.2)
place(shimmer(1.8, 700, 2800), 22.6, 0.12, rev=0.5)                              # Cycles render sweep
place(crackle(1.8), 22.6, 0.05, 0.15)
place(bell(1318), 24.3, 0.08, rev=0.6)                                           # render done
place(riser(0.9), 24.4, 0.16, rev=0.4)                                           # dive into the orb…
place(whoosh(1.0, 0.85, 120, 2200, (0, 0), body=1.0), 24.4, 0.42, rev=0.4)
place(boom(1.2), 25.25, 0.36, rev=0.5)                                           # …onto the chandelier macro
place(whoosh(1.8, 0.1, 2200, 200, (-0.2, 0.2), body=0.7), 25.3, 0.22, rev=0.6)  # macro → wide (living room)
place(whoosh(0.6, 0.6, 400, 4500, (-0.8, 0.8), tone=0.3), 27.3, 0.34, rev=0.1)  # whip → kitchen
place(whoosh(1.3, 0.1, 2200, 220, (0.2, -0.2), body=0.6), 27.75, 0.2, rev=0.5)  # macro → wide (kitchen)
place(riser(0.6), 29.0, 0.18, rev=0.3)                                           # push-through
place(whoosh(0.65, 0.88, 150, 4000, (0, 0), body=1.0), 29.0, 0.46, rev=0.3)
place(boom(1.0), 29.6, 0.42, rev=0.4)
for i in range(4):                                                               # capability grid assembles
    place(lock(0.35), 29.62 + i * 0.1, 0.09, (-0.5, 0.5, -0.3, 0.3)[i], rev=0.25)
place(pen(1.1), 30.6, 0.08, 0.0, rev=0.2)
for i, w in enumerate([30.2, 31.2, 32.2, 33.2]):                                 # Motion · Web · 3D · Mobile
    place(ui_pop([784, 988, 1175, 1568][i]), w - 0.02, 0.09, [-0.5, -0.5, 0.5, 0.5][i], rev=0.35)
    place(lock(0.3), w + 0.25, 0.07, [-0.5, -0.5, 0.5, 0.5][i], rev=0.2)
place(whoosh(0.6, 0.85, 300, 3600, (0.3, -0.3), flutter=0.9, tone=0.4), 33.3, 0.32, rev=0.2)  # trio spins up & merges
place(lock(1.0), 33.85, 0.3, 0.0, rev=0.3)
place(whoosh(0.85, 0.6, 220, 3000, (0, 0.3), tone=0.5, flutter=0.6), 33.9, 0.34, rev=0.2)    # merged phone flips to its back
place(boom(0.8), 34.6, 0.32, rev=0.2)
place(riser(0.8), 35.15, 0.13, rev=0.5)
place(whoosh(0.7, 0.55, 300, 3600, (0, 0.6), body=0.5), 35.4, 0.28, rev=0.2)   # phone lifts away
place(stone(0.62, 1.8), 36.02, 0.5, rev=0.6)                                     # the two stones meet
place(boom(1.4), 36.02, 0.4, rev=0.4)
for i in range(10):                                                              # STONE LABS tracks in & snaps
    place(tick(2000 + i * 150), 36.35 + i * 0.035, 0.035, -0.5 + i * 0.1, rev=0.2)
place(lock(0.6), 36.9, 0.14, 0.0, rev=0.3)
place(pen(1.1), 37.6, 0.09, 0.0, rev=0.25)
place(bell(1568), 37.65, 0.035, rev=0.8)

# punch layer: beat-locked sub kick + gated clap under the music (100 BPM grid, beats at 0.6 k)
for a_, b_ in [(0.6, 5.4), (12.6, 21.6), (22.2, 34.2)]:
    k = 0
    tt_ = a_
    while tt_ < b_ - 1e-6:
        place(kick_p(), tt_, 0.42 if k % 4 == 0 else 0.3, rev=0.0)
        if k % 2 == 1:
            place(clap_p(), tt_, 0.12, 0.05, rev=0.3)
        k += 1
        tt_ = round(tt_ + 0.6, 4)

# reverb (stereo, ~2 s) + gentle bus glue
tt = np.arange(int(2.4 * SR)) / SR
ir = rng.normal(0, 1, (len(tt), 2)) * np.exp(-tt / 0.6)[:, None]
ir = filt(ir, 'low', 6000); ir[: int(0.015 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([signal.fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = filt(out + wet * 0.6, 'high', 30)
mix = np.tanh(mix * 1.2) / 1.2
wavfile.write('assets/audio/sfx.wav', SR, mix.astype(np.float32))
print('sfx peak', 20 * np.log10(np.abs(mix).max()))
