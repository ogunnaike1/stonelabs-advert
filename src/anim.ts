import {Easing, useCurrentFrame} from 'remotion';
import {FPS} from './timeline';

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // reveals: fast in, long settle
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  glide: Easing.bezier(0.72, 0, 0.18, 1), // camera moves between clusters
  soft: Easing.bezier(0.45, 0, 0.55, 1),
  in: Easing.bezier(0.55, 0, 0.9, 0.4),
  ramp: Easing.bezier(0.86, 0, 0.07, 1), // speed ramp: slow → whip → slow
  expoOut: Easing.bezier(0.05, 0.7, 0.1, 1), // macro-to-wide pull: very fast start, long settle
  snap: Easing.bezier(0.34, 1.45, 0.6, 1), // slight overshoot, then locks
};

export const useT = () => useCurrentFrame() / FPS;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** 0→1 progress of [t0, t0+dur] with easing. */
export const prog = (t: number, t0: number, dur: number, fn: (x: number) => number = ease.out) =>
  fn(clamp((t - t0) / dur));

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Fade/blur in at t0, optionally out at t1. Returns {o, blur, p}. */
export const inOut = (t: number, t0: number, dIn: number, t1?: number, dOut = 0.4) => {
  const pin = prog(t, t0, dIn);
  const pout = t1 === undefined ? 0 : prog(t, t1, dOut, ease.in);
  return {p: pin, o: pin * (1 - pout), blur: (1 - pin) * 14 + pout * 10};
};
