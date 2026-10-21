import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../theme';
import {Panorama} from '../components/Panorama';
import {useT, prog, ease, clamp, lerp} from '../anim';
import {S, FPS} from '../timeline';
import {W, H, LANDSCAPE, pick} from '../format';

// landscape frames are much wider: shrink the vertical FOV so the horizontal view stays natural
const FOVK = pick(1, 0.68);

const IN = S.inside - 0.35;
const OUT = 29.6;
const PUSH = 29.0; // push-through into the next section
type V = {u: number; pitch: number; fov: number};
type Room = {file: string; name: string; from: number; to: number; macro: V; wide: V; drift: V; widenAt: number; widenDur: number};
const ROOMS: Room[] = [
  // dive out of the orb onto a macro of the brass chandelier rings → pull wide to the whole living room
  {file: '360-living-room.jpg', name: 'Living room', from: IN, to: S.room2, macro: {u: 0.362, pitch: 24, fov: 24}, wide: {u: 0.28, pitch: -4, fov: 92}, drift: {u: 0.35, pitch: -3, fov: 84}, widenAt: IN + 0.3, widenDur: 1.7},
  // whip in onto a macro of the fruit bowl → pull wide to the kitchen
  {file: '360-kitchen.jpg', name: 'Kitchen', from: S.room2, to: OUT, macro: {u: 0.247, pitch: -32, fov: 26}, wide: {u: 0.2, pitch: -6, fov: 90}, drift: {u: 0.215, pitch: -5, fov: 88}, widenAt: S.room2 + 0.15, widenDur: 1.2},
];
const WHIP = 75;

const viewAt = (i: number, t: number) => {
  const r = ROOMS[i];
  const w = ease.expoOut(clamp((t - r.widenAt) / r.widenDur));
  const dEnd = i === 0 ? r.to - 0.34 : PUSH;
  const d = ease.soft(clamp((t - (r.widenAt + r.widenDur)) / Math.max(0.1, dEnd - (r.widenAt + r.widenDur))));
  const mix = (k: keyof V) => lerp(lerp(r.macro[k], r.wide[k], w), r.drift[k], d);
  let yaw = (mix('u') - 0.5) * 360;
  let fov = mix('fov');
  let zoom = 0;
  if (i === 0) yaw += ease.in(clamp((t - (r.to - 0.34)) / 0.34)) ** 1.6 * WHIP; // whip out
  if (i > 0) yaw -= (1 - ease.out(clamp((t - r.from) / 0.5))) * WHIP; // whip in
  if (i === 1 && t > PUSH) {
    const p = ease.in(clamp((t - PUSH) / (OUT - PUSH)));
    fov = lerp(fov, 22, p); // push-through: the lens drives forward into the room
    zoom = p * 0.38;
  }
  return {yaw, pitch: mix('pitch'), fov: fov * FOVK, zoom, macro: clamp((60 - fov) / 36) * (t < PUSH ? 1 : 0)};
};

/** Inside the render: true perspective camera in the 360° image, framed like a Blender viewport. */
export const Inside: React.FC = () => {
  const t = useT();
  if (t < IN || t > OUT) return null;
  const i = t < S.room2 ? 0 : 1;
  const room = ROOMS[i];
  const v = viewAt(i, t);
  const yaw = v.yaw;
  const fov = v.fov;
  const vel = (viewAt(i, t + 1 / FPS).yaw - viewAt(i, t - 1 / FPS).yaw) / 2;
  const fadeIn = prog(t, IN, 0.35, ease.inOut);
  const fadeOut = prog(t, OUT - 0.28, 0.28, ease.in);
  const o = fadeIn * (1 - fadeOut);
  const flash = Math.sin(Math.PI * clamp((t - (OUT - 0.32)) / 0.42)) * (t > OUT - 0.32 ? 1 : 0);
  const hud = prog(t, IN + 1.2, 0.6) * (1 - prog(t, PUSH - 0.1, 0.25));
  const ax = (yaw * Math.PI) / 180;
  return (
    <AbsoluteFill style={{opacity: o, filter: fadeIn < 1 ? `blur(${(1 - fadeIn) * 16}px)` : undefined}}>
      <Panorama
        file={room.file}
        width={W}
        height={H}
        pixelScale={1.25 * (typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio) : 1)}
        view={{yawDeg: yaw, pitchDeg: v.pitch, vfovDeg: fov, blurDeg: Math.abs(vel) > 0.6 ? vel * 0.9 : 0, zoomBlur: v.zoom}}
      />
      {/* macro depth of field: edges fall out of focus while the lens is long */}
      {v.macro > 0.02 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backdropFilter: `blur(${v.macro * 16}px)`,
            WebkitBackdropFilter: `blur(${v.macro * 16}px)`,
            WebkitMaskImage: 'radial-gradient(ellipse 48% 40% at 50% 50%, transparent 35%, black 100%)',
            maskImage: 'radial-gradient(ellipse 48% 40% at 50% 50%, transparent 35%, black 100%)',
          }}
        />
      )}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,18,16,0.42) 0%, rgba(20,18,16,0) 22%, rgba(20,18,16,0) 80%, rgba(20,18,16,0.35) 100%)'}} />
      {/* viewport frame */}
      <div style={{position: 'absolute', inset: 30, borderRadius: 40, border: '2px solid rgba(255,255,255,0.35)', opacity: hud}} />
      <div style={{position: 'absolute', left: 70, top: pick(200, 70), opacity: hud}}>
        <div style={{fontFamily: F.display, fontWeight: 500, fontSize: 20, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)'}}>Camera · Perspective</div>
        <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 60, color: '#fff', marginTop: 6}}>{room.name}</div>
      </div>
      {/* axis gizmo */}
      <svg width={130} height={130} viewBox="-65 -65 130 130" style={{position: 'absolute', right: 70, top: pick(190, 60), opacity: hud}}>
        <circle r={58} fill="rgba(255,255,255,0.10)" />
        {[
          ['X', '#E5484D', Math.cos(ax) * 42, Math.sin(ax) * 14],
          ['Y', '#86B83C', -Math.sin(ax) * 42, Math.cos(ax) * 14],
          ['Z', '#4A8BF0', 0, -44],
        ].map(([n, col, x, y]) => (
          <g key={n as string}>
            <line x1={0} y1={0} x2={x as number} y2={y as number} stroke={col as string} strokeWidth={4} strokeLinecap="round" />
            <circle cx={x as number} cy={y as number} r={11} fill={col as string} />
            <text x={x as number} y={(y as number) + 5} textAnchor="middle" fontSize={13} fontFamily="MuseoModerno" fontWeight={700} fill="#111">
              {n as string}
            </text>
          </g>
        ))}
      </svg>
      <div style={{position: 'absolute', left: 70, right: 70, bottom: pick(330, 70), display: 'flex', justifyContent: 'space-between', opacity: hud, fontFamily: F.display, fontWeight: 500, fontSize: 20, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)'}}>
        <span>Blender · Cycles</span>
        <span>{`${Math.round(12 / Math.tan((fov * Math.PI) / 360))} mm · 4096 spp`}</span>
      </div>
      <AbsoluteFill style={{background: '#F6F3EE', opacity: flash * 0.85}} />
    </AbsoluteFill>
  );
};
