import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {C, W, H} from './theme';
import {pick} from './format';
import {useFonts} from './components/Fonts';
import {Card} from './components/Cards';
import {cameraAt, cameraSpeed} from './camera';
import {CELLS, CELL_W, CELL_H, CellName} from './timeline';
import {useT} from './anim';
import {World} from './three/World';
import {HookCards, HookType, MotionCards, WebACards, WebBCards, VizCards, CapsCards, LogoCard} from './scenes/Sections';
import {Inside} from './scenes/Inside';

const SECTIONS: Record<CellName, React.FC> = {
  hook: HookCards,
  motion: MotionCards,
  webA: WebACards,
  webB: WebBCards,
  viz: VizCards,
  caps: CapsCards,
  logo: LogoCard,
};

/** Empty cells keep the bento board continuous whenever the camera pulls back. */
const FILLERS = pick(
  [
    [{x: 40, y: 150, w: 1000, h: 1730}],
    [{x: 40, y: 150, w: 1000, h: 400}, {x: 40, y: 580, w: 490, h: 1300}, {x: 550, y: 580, w: 490, h: 1300}],
    [{x: 40, y: 150, w: 1000, h: 860}, {x: 40, y: 1040, w: 1000, h: 840}],
    [{x: 40, y: 150, w: 490, h: 1730}, {x: 550, y: 150, w: 490, h: 850}, {x: 550, y: 1030, w: 490, h: 850}],
  ],
  [
    [{x: 60, y: 60, w: 1800, h: 960}],
    [{x: 60, y: 60, w: 880, h: 960}, {x: 970, y: 60, w: 890, h: 465}, {x: 970, y: 555, w: 890, h: 465}],
    [{x: 60, y: 60, w: 560, h: 960}, {x: 650, y: 60, w: 1210, h: 960}],
    [{x: 60, y: 60, w: 880, h: 465}, {x: 60, y: 555, w: 880, h: 465}, {x: 970, y: 60, w: 890, h: 960}],
  ],
);
const used = new Set(Object.values(CELLS).map((c) => `${c.c},${c.r}`));
const hash = (c: number, r: number) => Math.abs((c * 73856093) ^ (r * 19349663)) % 997;

const Cell: React.FC<{c: number; r: number; children: React.ReactNode}> = ({c, r, children}) => (
  <div style={{position: 'absolute', left: c * CELL_W - W / 2, top: r * CELL_H - H / 2, width: W, height: H}}>{children}</div>
);

/** Soft studio backdrop: grey gradient with big out-of-focus lights (reference), slow parallax. */
const Backdrop: React.FC<{cx: number; cy: number}> = ({cx, cy}) => {
  const spots: [number, number, number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const f = a - Math.floor(a);
    const b = Math.sin(i * 78.233) * 12345.678;
    const g = b - Math.floor(b);
    spots.push([f * 1500 - 200, g * 2600 - 300, 60 + ((i * 37) % 220), 0.22 + ((i * 13) % 10) / 30]);
  }
  return (
    <AbsoluteFill style={{background: `radial-gradient(120% 80% at 30% 20%, ${C.bgLight} 0%, #E2DFDA 45%, ${C.bgDark} 100%)`}}>
      {spots.map(([x, y, r, o], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: ((((x * (W / 1080) - cx * 0.06) % (W + 420)) + W + 420) % (W + 420)) - 200 - r,
            top: ((((y * (H / 1920) - cy * 0.06) % (H + 680)) + H + 680) % (H + 680)) - 300 - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,${o}) 0%, rgba(255,255,255,${o * 0.6}) 45%, rgba(255,255,255,0) 72%)`,
          }}
        />
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(40,34,28,0.16) 100%)'}} />
    </AbsoluteFill>
  );
};

/** Out-of-focus foreground lights between lens and board: move ~1.4× the camera for real parallax depth. */
const Foreground: React.FC<{cx: number; cy: number; s: number}> = ({cx, cy, s}) => {
  const spots: [number, number, number][] = [
    [120, 300, 260],
    [980, 820, 340],
    [260, 1500, 420],
    [860, 1900, 300],
    [540, 2600, 380],
    [60, 2300, 220],
  ];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {spots.map(([x, y, r], i) => {
        const px = ((((x * (W / 1080) - cx * 1.4) % (W + 520)) + W + 520) % (W + 520)) - 260;
        const py = ((((y * (H / 1920) - cy * 1.4) % (H + 980)) + H + 980) % (H + 980)) - 480;
        const rr = r * (0.8 + 0.25 * s);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px - rr,
              top: py - rr,
              width: rr * 2,
              height: rr * 2,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,253,248,0.22) 0%, rgba(255,253,248,0.1) 50%, rgba(255,253,248,0) 72%)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Fast-motion windows (s) that get true multi-sample motion blur: flips, dives, glides, pushes, merges. */
export const MB_WINDOWS: [number, number][] = [
  [0.0, 0.95],
  [1.85, 3.1],
  [4.9, 6.25],
  [7.7, 8.8],
  [10.5, 13.05],
  [15.9, 17.5],
  [20.1, 22.9],
  [24.3, 25.45],
  [29.3, 30.35],
  [33.3, 34.8],
  [35.55, 36.4],
];
const inMB = (t: number) => MB_WINDOWS.some(([a, b]) => t >= a && t <= b);

export const StoneLabs: React.FC = () => {
  const ready = useFonts();
  const t = useT();
  const frame = useCurrentFrame();
  const mb = inMB(t);
  return (
    <AbsoluteFill style={{background: C.bgLight}}>
      {ready &&
        (mb ? (
          <CameraMotionBlur shutterAngle={200} samples={6}>
            <Visual svgBlur={false} />
          </CameraMotionBlur>
        ) : (
          <Visual svgBlur />
        ))}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('grain.png')})`,
          backgroundPosition: `${(frame * 137) % 512}px ${(frame * 241) % 512}px`,
          mixBlendMode: 'soft-light',
          opacity: 0.12,
          pointerEvents: 'none',
        }}
      />
      <Audio src={staticFile('audio/final_mix.wav')} />
    </AbsoluteFill>
  );
};

/** Camera shake on the hook impact (decaying, slightly rotational). */
const shake = (t: number) => {
  const d = t - 0.6;
  if (d < 0 || d > 0.7) return undefined;
  const a = Math.exp(-d * 7.5);
  return `translate(${Math.sin(d * 71) * 16 * a}px, ${Math.sin(d * 53 + 1) * 22 * a}px) rotate(${Math.sin(d * 37) * 0.5 * a}deg)`;
};

const Visual: React.FC<{svgBlur: boolean}> = ({svgBlur}) => {
  const t = useT();
  const cam = cameraAt(t);
  const {vx, vy} = cameraSpeed(t);
  const bx = Math.min(12, Math.abs(vx / 60) * 0.14);
  const by = Math.min(12, Math.abs(vy / 60) * 0.14);
  const blurOn = svgBlur && (bx > 0.8 || by > 0.8);
  const hw = W / 2 / cam.s + 60;
  const hh = H / 2 / cam.s + 60;
  const visible = (c: number, r: number) => Math.abs(c * CELL_W - cam.x) < hw + W / 2 && Math.abs(r * CELL_H - cam.y) < hh + H / 2;

  const cells: React.ReactNode[] = [];
  for (let r = -2; r <= 5; r++) {
    for (let c = -2; c <= 4; c++) {
      if (!visible(c, r)) continue;
      const key = `${c},${r}`;
      if (used.has(key)) {
        const name = (Object.keys(CELLS) as CellName[]).find((k) => CELLS[k].c === c && CELLS[k].r === r)!;
        const Sec = SECTIONS[name];
        cells.push(
          <Cell key={key} c={c} r={r}>
            <Sec />
          </Cell>,
        );
      } else {
        cells.push(
          <Cell key={key} c={c} r={r}>
            {FILLERS[hash(c, r) % FILLERS.length].map((b, i) => (
              <Card key={i} {...b} />
            ))}
          </Cell>,
        );
      }
    }
  }

  return (
    <AbsoluteFill style={{background: C.bgLight}}>
      <Backdrop cx={cam.x * cam.s} cy={cam.y * cam.s} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id="mb" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation={`${bx} ${by}`} />
        </filter>
      </svg>
      <AbsoluteFill style={{filter: blurOn ? 'url(#mb)' : undefined, transform: shake(t)}}>
        <div style={{position: 'absolute', left: W / 2, top: H / 2, transformOrigin: '0 0', transform: `scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`}}>{cells}</div>
        <World width={W} height={H} />
        <HookType />
      </AbsoluteFill>
      <Foreground cx={cam.x * cam.s} cy={cam.y * cam.s} s={cam.s} />
      <Inside />
    </AbsoluteFill>
  );
};
