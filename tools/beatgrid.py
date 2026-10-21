import sys, wave, numpy as np
from scipy import signal
w = wave.open(sys.argv[1]); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, ch).mean(1) / 32768
# kick band envelope
sos = signal.butter(4, [40, 120], 'band', fs=sr, output='sos'); k = np.abs(signal.sosfilt(sos, x))
hop = 256; env = k[: len(k) // hop * hop].reshape(-1, hop).mean(1); fr = sr / hop
on = np.maximum(0, np.diff(env)); on /= on.max()
# tempo by autocorrelation 80-140 BPM
ac = np.correlate(on, on, 'full')[len(on) - 1:]
lags = np.arange(len(ac)) / fr; m = (lags > 60 / 140) & (lags < 60 / 80)
period = lags[m][np.argmax(ac[m])]
# refine period + phase by maximizing comb energy
best = None
for P in np.linspace(period * 0.98, period * 1.02, 81):
    for ph in np.linspace(0, P, 120, endpoint=False):
        idx = ((np.arange(ph, len(on) / fr, P)) * fr).astype(int); idx = idx[idx < len(on)]
        sc = on[idx].sum()
        if best is None or sc > best[0]: best = (sc, P, ph)
_, P, ph = best
print(f'BPM {60 / P:.3f}  beat {P:.4f}s  phase {ph:.3f}s')
# per-second loudness + kick presence
rms = np.sqrt(np.convolve(x ** 2, np.ones(sr) / sr, 'same'))
for s in range(0, int(len(x) / sr)):
    kk = env[int(s * fr):int((s + 1) * fr)].max() * 100
    print(f'{s:2d}s {20 * np.log10(rms[s * sr] + 1e-9):6.1f}dB kick {kk:5.2f}', end=' | ' if s % 4 != 3 else '\n')
