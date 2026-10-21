import React from 'react';
import {Easing} from 'remotion';
import {C, F} from '../theme';
import {Tile} from '../components/Tile';
import {Line, Label, Letters, Hairline} from '../components/Type';
import {useT, prog, ease, clamp, lerp} from '../anim';
import {S, BEAT} from '../timeline';

const T0 = S.motion;
const curve = Easing.bezier(0.83, 0, 0.17, 1);

/** Easing curve diagram with a dot riding the curve — motion design, explained by itself. */
export const EaseCurve: React.FC<{t0: number; size: number; loop?: number; showHandles?: boolean}> = ({
  t0,
  size,
  loop = BEAT * 4,
  showHandles = true,
}) => {
  const t = useT();
  const draw = prog(t, t0, 1.0, ease.inOut);
  const pts: string[] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    // parametric cubic bezier (0,0)(.83,0)(.17,1)(1,1)
    const u = i / N;
    const bx = 3 * (1 - u) ** 2 * u * 0.83 + 3 * (1 - u) * u * u * 0.17 + u ** 3;
    const by = 3 * (1 - u) * u * u + u ** 3;
    pts.push(`${bx * size},${size - by * size}`);
  }
  const lp = t < t0 + 1.0 ? 0 : ((t - t0 - 1.0) % loop) / loop;
  const travel = clamp(lp / 0.75);
  const y = curve(travel);
  const len = size * 2.2;
  return (
    <svg width={size + 40} height={size + 40} viewBox={`-20 -20 ${size + 40} ${size + 40}`} style={{overflow: 'visible'}}>
      <rect x={0} y={0} width={size} height={size} fill="none" stroke={C.stone} strokeWidth={2} strokeDasharray="4 10" opacity={draw} />
      {showHandles && (
        <g opacity={prog(t, t0 + 0.6, 0.6)} stroke={C.taupe} strokeWidth={2}>
          <line x1={0} y1={size} x2={0.83 * size} y2={size} />
          <line x1={size} y1={0} x2={0.17 * size} y2={0} />
          <circle cx={0.83 * size} cy={size} r={9} fill={C.porcelain} />
          <circle cx={0.17 * size} cy={0} r={9} fill={C.porcelain} />
        </g>
      )}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={C.graphite}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
      />
      <circle cx={travel * size} cy={size - y * size} r={15} fill={C.walnut} opacity={prog(t, t0 + 0.9, 0.3)} />
      <line x1={size + 20} y1={size} x2={size + 20} y2={size - y * size} stroke={C.walnut} strokeWidth={6} strokeLinecap="round" opacity={prog(t, t0 + 0.9, 0.3)} />
    </svg>
  );
};

const TRACKS = ['Position', 'Scale', 'Opacity', 'Rotate'];
const KEYS = [
  [0.1, 0.5, 0.9],
  [0.25, 0.65],
  [0.1, 0.4, 0.8],
  [0.45, 0.95],
];

const Timeline: React.FC<{t0: number}> = ({t0}) => {
  const t = useT();
  const w = 400;
  const loop = BEAT * 4;
  const head = t < t0 + 0.6 ? 0 : ((t - t0 - 0.6) % loop) / loop;
  return (
    <div style={{position: 'relative', width: w + 20, height: 300}}>
      {TRACKS.map((name, r) => {
        const pr = prog(t, t0 + r * 0.1, 0.7);
        return (
          <div key={name} style={{position: 'absolute', top: r * 74, left: 0, width: w, opacity: pr}}>
            <div style={{fontFamily: F.sans, fontSize: 17, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.taupe}}>{name}</div>
            <div style={{position: 'absolute', top: 50, left: 0, height: 2, width: w * pr, background: C.stone}} />
            {KEYS[r].map((k, i) => {
              const lit = head >= k;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: 41,
                    left: k * w - 10,
                    width: 20,
                    height: 20,
                    transform: `rotate(45deg) scale(${lit ? 1.15 : 0.9})`,
                    background: lit ? C.walnut : C.porcelain,
                    border: `2px solid ${lit ? C.walnut : C.taupe}`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
      <div style={{position: 'absolute', top: -12, bottom: -10, left: head * w, width: 3, background: C.graphite, opacity: prog(t, t0 + 0.5, 0.4)}} />
    </div>
  );
};

const WORDS = ['brands.', 'products.', 'launches.', 'identities.'];

const Roll: React.FC = () => {
  const t = useT();
  const start = T0 + 1.6;
  const step = BEAT * 2;
  const idx = Math.max(0, Math.min(WORDS.length - 1, Math.floor((t - start) / step)));
  return (
    <div style={{position: 'relative', height: 236, overflow: 'hidden', paddingTop: 20}}>
      {WORDS.map((wd, i) => {
        const pin = i === 0 ? prog(t, start - 0.3, 0.9) : prog(t, start + i * step + 0.12, 0.75, ease.out);
        const pout = i === WORDS.length - 1 ? 0 : prog(t, start + (i + 1) * step - 0.08, 0.3, ease.in);
        if (pin <= 0 || pout >= 1 || Math.abs(i - idx) > 1) return null;
        return (
          <div
            key={wd}
            style={{
              position: 'absolute',
              left: 0,
              top: 20,
              fontFamily: F.serif,
              fontStyle: 'italic',
              fontSize: 168,
              lineHeight: 1,
              color: C.graphite,
              transform: `translateY(${(1 - pin) * 100 - pout * 100}%)`,
              filter: `blur(${(1 - pin) * 10 + pout * 10}px)`,
              opacity: pin * (1 - pout),
              whiteSpace: 'nowrap',
            }}
          >
            {wd}
          </div>
        );
      })}
    </div>
  );
};

// 04:80 – 12:00 · Motion graphics & brand advertising, shown through motion itself.
export const Motion: React.FC = () => {
  const t = useT();
  const big: React.CSSProperties = {fontFamily: F.serif, fontSize: 168, lineHeight: 0.88, color: C.graphite};
  const prog4 = clamp((t - (T0 + 1.6)) / (BEAT * 2 * WORDS.length));
  return (
    <>
      <Tile x={12} y={12} w={1056} h={560}>
        <Label t0={T0 + 0.1} style={{position: 'absolute', left: 64, top: 172}}>
          01 — Motion &amp; Brand Advertising
        </Label>
        <div style={{position: 'absolute', left: 60, top: 222}}>
          <Line t0={T0 + 0.05} style={big}>
            DESIGN
          </Line>
          <div style={{...big, fontStyle: 'italic', color: C.walnut, marginTop: -6}}>
            <Letters text="in motion." t0={T0 + 0.3} />
          </div>
        </div>
      </Tile>
      <Tile x={12} y={596} w={1056} h={600}>
        <Label t0={T0 + 0.9} style={{position: 'absolute', left: 64, top: 64}}>
          We animate
        </Label>
        <div style={{position: 'absolute', left: 60, top: 150, width: 960}}>
          <Roll />
        </div>
        <Hairline t0={T0 + 1.0} x={64} y={420} w={928} />
        <div style={{position: 'absolute', left: 64, top: 418, height: 4, width: 928 * prog4, background: C.walnut}} />
        <Label t0={T0 + 1.2} style={{position: 'absolute', left: 64, top: 460}} size={20}>
          Brand films · Social ads · Animated identities
        </Label>
      </Tile>
      <Tile x={12} y={1220} w={516} h={688} t0={T0 + 0.2}>
        <Label t0={T0 + 0.8} style={{position: 'absolute', left: 48, top: 48}}>
          Easing
        </Label>
        <div style={{position: 'absolute', left: 78, top: 150}}>
          <EaseCurve t0={T0 + 0.9} size={320} />
        </div>
        <div style={{position: 'absolute', left: 48, top: 560, fontFamily: F.ui, fontSize: 20, color: C.taupe, opacity: prog(t, T0 + 1.6, 0.6)}}>
          cubic-bezier(.83, 0, .17, 1)
        </div>
      </Tile>
      <Tile x={552} y={1220} w={516} h={688} t0={T0 + 0.3}>
        <Label t0={T0 + 0.9} style={{position: 'absolute', left: 48, top: 48}}>
          Keyframes
        </Label>
        <div style={{position: 'absolute', left: 48, top: 160}}>
          <Timeline t0={T0 + 1.0} />
        </div>
        <div style={{position: 'absolute', left: 48, top: 560, fontFamily: F.ui, fontSize: 20, color: C.taupe, opacity: prog(t, T0 + 1.6, 0.6)}}>
          {`frame ${String(Math.floor(lerp(0, 144, ((t - T0 - 1.6 + 2.4 * 10) % 2.4) / 2.4))).padStart(3, '0')} / 144`}
        </div>
      </Tile>
    </>
  );
};
