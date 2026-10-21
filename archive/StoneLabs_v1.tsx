import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {C, F, W, H} from './theme';
import {useFonts} from './components/Fonts';
import {Tile} from './components/Tile';
import {cameraAt, cameraSpeed} from './camera';
import {CELLS, CELL_W, CELL_H} from './timeline';
import {useT} from './anim';
import {Hook} from './scenes/Hook';
import {Motion} from './scenes/Motion';
import {WebA, WebB} from './scenes/Web';
import {Viz} from './scenes/Viz';
import {Caps} from './scenes/Caps';
import {Logo} from './scenes/Logo';

const SCENES: Record<keyof typeof CELLS, React.FC> = {
  hook: Hook,
  motion: Motion,
  webA: WebA,
  webB: WebB,
  viz: Viz,
  caps: Caps,
  logo: Logo,
};

/** Empty board cells keep the bento surface continuous when the camera pulls back. */
const FILLERS = [
  [ {x: 12, y: 12, w: 1056, h: 1896} ],
  [ {x: 12, y: 12, w: 1056, h: 1150}, {x: 12, y: 1186, w: 516, h: 722}, {x: 552, y: 1186, w: 516, h: 722} ],
  [ {x: 12, y: 12, w: 1056, h: 936}, {x: 12, y: 972, w: 1056, h: 936} ],
  [ {x: 12, y: 12, w: 516, h: 1896}, {x: 552, y: 12, w: 516, h: 936}, {x: 552, y: 972, w: 516, h: 936} ],
];

const used = new Set(Object.values(CELLS).map((c) => `${c.c},${c.r}`));
const hash = (c: number, r: number) => Math.abs((c * 73856093) ^ (r * 19349663)) % 997;

const Cell: React.FC<{c: number; r: number; children: React.ReactNode}> = ({c, r, children}) => (
  <div style={{position: 'absolute', left: c * CELL_W - W / 2, top: r * CELL_H - H / 2, width: W, height: H}}>{children}</div>
);

const Bokeh: React.FC<{cx: number; cy: number}> = ({cx, cy}) => {
  // warm, out-of-focus light behind the board (reference: soft bokeh under frosted cards) — slow parallax
  const spots = [
    [180, 300, 520, 0.55],
    [900, 700, 640, 0.4],
    [300, 1500, 700, 0.45],
    [820, 1750, 480, 0.35],
  ];
  return (
    <AbsoluteFill>
      {spots.map(([x, y, r, o], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: ((x - cx * 0.08) % 1400) - r / 2,
            top: ((y - cy * 0.08) % 2300) - r / 2,
            width: r,
            height: r,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,252,246,${o}) 0%, rgba(255,252,246,0) 70%)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const StoneLabs: React.FC = () => {
  const ready = useFonts();
  const t = useT();
  const frame = useCurrentFrame();
  const cam = cameraAt(t);
  const {vx, vy} = cameraSpeed(t);
  const bx = Math.min(14, Math.abs(vx / 60) * 0.16);
  const by = Math.min(14, Math.abs(vy / 60) * 0.16);
  const blurOn = bx > 0.8 || by > 0.8;

  const hw = W / 2 / cam.s + 60;
  const hh = H / 2 / cam.s + 60;
  const visible = (c: number, r: number) =>
    Math.abs(c * CELL_W - cam.x) < hw + W / 2 && Math.abs(r * CELL_H - cam.y) < hh + H / 2;

  const cells: React.ReactNode[] = [];
  for (let r = -2; r <= 5; r++) {
    for (let c = -2; c <= 4; c++) {
      if (!visible(c, r)) continue;
      const key = `${c},${r}`;
      if (used.has(key)) {
        const name = (Object.keys(CELLS) as (keyof typeof CELLS)[]).find((k) => CELLS[k].c === c && CELLS[k].r === r)!;
        const Scene = SCENES[name];
        cells.push(
          <Cell key={key} c={c} r={r}>
            <Scene />
          </Cell>,
        );
      } else {
        const layout = FILLERS[hash(c, r) % FILLERS.length];
        cells.push(
          <Cell key={key} c={c} r={r}>
            {layout.map((b, i) => (
              <Tile key={i} {...b} />
            ))}
          </Cell>,
        );
      }
    }
  }

  return (
    <AbsoluteFill style={{background: C.ivory, fontFamily: F.serif}}>
      <Bokeh cx={cam.x} cy={cam.y} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id="mb" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation={`${bx} ${by}`} />
        </filter>
      </svg>
      {ready && (
        <AbsoluteFill style={{filter: blurOn ? 'url(#mb)' : undefined}}>
          <div
            style={{
              position: 'absolute',
              left: W / 2,
              top: H / 2,
              transformOrigin: '0 0',
              transform: `scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`,
            }}
          >
            {cells}
          </div>
        </AbsoluteFill>
      )}
      {/* paper grain + gentle vignette */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('grain.png')})`,
          backgroundPosition: `${(frame * 137) % 512}px ${(frame * 241) % 512}px`,
          mixBlendMode: 'soft-light',
          opacity: 0.16,
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(60,45,30,0.10) 100%)'}} />
      <Audio src={staticFile('audio/score.wav')} />
    </AbsoluteFill>
  );
};

