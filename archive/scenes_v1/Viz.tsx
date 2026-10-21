import React from 'react';
import {C, F} from '../theme';
import {Tile} from '../components/Tile';
import {Line, Label} from '../components/Type';
import {Panorama} from '../components/Panorama';
import {useT, prog, ease, lerp, clamp} from '../anim';
import {S, PANO_TILE, PANO_FILL, FPS} from '../timeline';

type Room = {file: string; name: string; from: number; to: number; u0: number; u1: number; pitch: number};

// u = horizontal position in the equirectangular frame (0–1) the camera faces.
export const ROOMS: Room[] = [
  {file: '360-living-room.jpg', name: 'Living Room', from: 20.9, to: S.room2, u0: 0.255, u1: 0.4, pitch: -3},
  {file: '360-kitchen.jpg', name: 'Kitchen', from: S.room2, to: S.room3, u0: 0.2, u1: 0.33, pitch: -5},
  {file: '360-bathroom.jpg', name: 'Bathroom', from: S.room3, to: 30.8, u0: 0.33, u1: 0.47, pitch: -8},
];

const WHIP_OUT = 0.34;
const WHIP_IN = 0.5;
const WHIP_DEG = 75;

const yawAt = (r: Room, i: number, t: number) => {
  const p = ease.soft(clamp((t - r.from) / (r.to - r.from)));
  let yaw = (lerp(r.u0, r.u1, p) - 0.5) * 360;
  if (i < ROOMS.length - 1) yaw += ease.in(clamp((t - (r.to - WHIP_OUT)) / WHIP_OUT)) ** 1.6 * WHIP_DEG;
  if (i > 0) yaw -= (1 - ease.out(clamp((t - r.from) / WHIP_IN))) * WHIP_DEG;
  return yaw;
};

export const roomAt = (t: number) => {
  const i = Math.max(0, ROOMS.findIndex((r) => t < r.to));
  return {room: ROOMS[i === -1 ? ROOMS.length - 1 : i], i: i === -1 ? ROOMS.length - 1 : i};
};

export const VizPano: React.FC<{w: number; h: number; pixelScale: number}> = ({w, h, pixelScale}) => {
  const t = useT();
  const {room, i} = roomAt(t);
  const yaw = yawAt(room, i, t);
  const vel = (yawAt(room, i, t + 1 / FPS) - yawAt(room, i, t - 1 / FPS)) / 2; // deg per frame
  const local = clamp((t - room.from) / (room.to - room.from));
  return (
    <Panorama
      file={room.file}
      width={w}
      height={h}
      pixelScale={pixelScale}
      view={{yawDeg: yaw, pitchDeg: room.pitch, vfovDeg: lerp(86, 78, ease.soft(local)), blurDeg: Math.abs(vel) > 0.6 ? vel * 0.9 : 0}}
    />
  );
};

// 21:60 – 30:00 · 3D visualization — real 360° renders, viewed through a true perspective camera.
export const Viz: React.FC = () => {
  const t = useT();
  const T0 = S.viz;
  const {room, i} = roomAt(t);
  const yaw = ((yawAt(room, i, t) % 360) + 360) % 360;
  const big: React.CSSProperties = {fontFamily: F.serif, fontSize: 160, lineHeight: 0.88, color: C.graphite};
  return (
    <>
      <Tile x={12} y={12} w={1056} h={540}>
        <Label t0={T0 - 0.3} style={{position: 'absolute', left: 64, top: 172}}>
          03 — 3D Visualization
        </Label>
        <div style={{position: 'absolute', left: 60, top: 222}}>
          <Line t0={T0 - 0.35} style={big}>
            BEYOND
          </Line>
          <Line t0={T0 - 0.15} style={{...big, fontStyle: 'italic', color: C.walnut}}>
            the screen.
          </Line>
        </div>
      </Tile>
      <Tile {...PANO_TILE} style={{background: '#D9D2C6'}}>
        <VizPano w={PANO_TILE.w} h={PANO_TILE.h} pixelScale={PANO_FILL + 0.05} />
        {/* soft vignette keeps HUD type legible over bright interiors */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(27,27,26,0.38) 0%, rgba(27,27,26,0) 26%, rgba(27,27,26,0) 78%, rgba(27,27,26,0.25) 100%)',
          }}
        />
        {ROOMS.map((r, k) => (
          <div key={r.name} style={{position: 'absolute', left: 170, top: 196}}>
            <Line t0={r.from + (k === 0 ? 0.9 : 0.15)} out={r.to - 0.3} style={{fontFamily: F.serif, fontSize: 64, color: C.porcelain, lineHeight: 1}}>
              {r.name}
            </Line>
          </div>
        ))}
        <Label t0={T0 + 0.9} color="rgba(247,245,240,0.85)" style={{position: 'absolute', left: 172, top: 290}} size={19}>
          360° interior render
        </Label>
        <div
          style={{
            position: 'absolute',
            right: 170,
            top: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            opacity: prog(t, T0 + 1.0, 0.6),
          }}
        >
          <svg width={52} height={52} viewBox="-26 -26 52 52">
            <circle r={22} fill="none" stroke="rgba(247,245,240,0.8)" strokeWidth={2} />
            <line x1={0} y1={0} x2={Math.sin((yaw * Math.PI) / 180) * 18} y2={-Math.cos((yaw * Math.PI) / 180) * 18} stroke={C.porcelain} strokeWidth={3} strokeLinecap="round" />
          </svg>
          <div style={{fontFamily: F.ui, fontSize: 26, color: C.porcelain, fontVariantNumeric: 'tabular-nums', width: 70}}>{Math.round(yaw)}°</div>
        </div>
      </Tile>
    </>
  );
};
