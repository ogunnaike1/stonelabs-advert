import {CAMERA} from './timeline';
import {ease, clamp, lerp} from './anim';

export type Cam = {x: number; y: number; s: number};

export const cameraAt = (t: number): Cam => {
  const ks = CAMERA;
  if (t <= ks[0].t) return {x: ks[0].x, y: ks[0].y, s: ks[0].s};
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1];
    const b = ks[i];
    if (t <= b.t) {
      const raw = clamp((t - a.t) / (b.t - a.t));
      const p =
        b.ease === 'glide' ? ease.ramp(raw) : b.ease === 'dive' ? raw ** 2.6 : b.ease === 'pull' ? ease.expoOut(raw) : ease.soft(raw);
      const dip = b.dip ?? 0;
      // geometric zoom keeps perceived depth speed constant on big push-ins / pull-outs
      const s = a.s * Math.pow(b.s / a.s, p) * (1 - dip * Math.sin(Math.PI * raw));
      if (b.ease === 'dive') return {x: lerp(a.x, b.x, ease.out(raw)), y: lerp(a.y, b.y, ease.out(raw)), s: a.s * Math.pow(b.s / a.s, p)};
      return {x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), s};
    }
  }
  const z = ks[ks.length - 1];
  return {x: z.x, y: z.y, s: z.s};
};

/** Camera speed in world px per second — drives motion blur on fast glides. */
export const cameraSpeed = (t: number) => {
  const a = cameraAt(t - 1 / 120);
  const b = cameraAt(t + 1 / 120);
  return {vx: (b.x - a.x) * 60 * a.s, vy: (b.y - a.y) * 60 * a.s, vs: (b.s - a.s) * 60};
};
