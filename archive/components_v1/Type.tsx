import React from 'react';
import {C, F} from '../theme';
import {useT, prog, ease, clamp} from '../anim';

/** Masked line rise + blur settle — the reel's signature text reveal. */
export const Line: React.FC<{
  t0: number;
  dur?: number;
  out?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  pad?: number;
}> = ({t0, dur = 0.9, out, children, style, pad = 0.18}) => {
  const t = useT();
  const p = prog(t, t0, dur, ease.out);
  const q = out === undefined ? 0 : prog(t, out, 0.45, ease.in);
  return (
    <div style={{overflow: 'hidden', paddingTop: `${pad}em`, marginTop: `-${pad}em`, paddingBottom: `${pad}em`, marginBottom: `-${pad}em`, ...style}}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 105 - q * 60}%)`,
          filter: `blur(${(1 - p) * 10 + q * 8}px)`,
          opacity: clamp(p * 1.6) * (1 - q),
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Tracked geometric caps (Jost) — labels, after the "INTRODUCING" line in the type reference. */
export const Label: React.FC<{
  children: React.ReactNode;
  t0: number;
  style?: React.CSSProperties;
  size?: number;
  color?: string;
  out?: number;
}> = ({children, t0, style, size = 22, color = C.taupe, out}) => {
  const t = useT();
  const p = prog(t, t0, 0.8, ease.out);
  const q = out === undefined ? 0 : prog(t, out, 0.4, ease.in);
  return (
    <div
      style={{
        fontFamily: F.sans,
        fontWeight: 450,
        fontSize: size,
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        color,
        opacity: p * (1 - q),
        transform: `translateX(${(1 - p) * -16}px)`,
        filter: `blur(${(1 - p) * 6}px)`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Per-letter kinetic set — each glyph on its own offset of the same curve. */
export const Letters: React.FC<{text: string; t0: number; stagger?: number; style?: React.CSSProperties}> = ({
  text,
  t0,
  stagger = 0.045,
  style,
}) => {
  const t = useT();
  return (
    <span style={{display: 'inline-block', whiteSpace: 'pre', ...style}}>
      {text.split('').map((ch, i) => {
        const p = prog(t, t0 + i * stagger, 0.85, ease.out);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${(1 - p) * 0.55}em) rotate(${(1 - p) * 9}deg)`,
              opacity: clamp(p * 1.5),
              filter: `blur(${(1 - p) * 8}px)`,
              transformOrigin: '0% 100%',
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

/** Outlined pill tag — lifted from the serif reference's "Sleek / Contemporary / Stylish" tags. */
export const Pill: React.FC<{children: React.ReactNode; t0: number; x: number; y: number; size?: number; rot?: number}> = ({
  children,
  t0,
  x,
  y,
  size = 46,
  rot = 0,
}) => {
  const t = useT();
  const p = prog(t, t0, 0.7, ease.out);
  const s = 0.6 + 0.4 * p + Math.sin(clamp(p) * Math.PI) * 0.06;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%,-50%) rotate(${rot * p}deg) scale(${s})`,
        opacity: clamp(p * 2),
        fontFamily: F.serif,
        fontSize: size,
        lineHeight: 1,
        color: C.graphite,
        padding: `${size * 0.2}px ${size * 0.46}px ${size * 0.26}px`,
        border: `2px solid ${C.graphite}`,
        borderRadius: 999,
        background: 'rgba(247,245,240,0.92)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
};

export const Hairline: React.FC<{t0: number; x: number; y: number; w: number; color?: string; dur?: number}> = ({
  t0,
  x,
  y,
  w,
  color = C.stone,
  dur = 1.1,
}) => {
  const t = useT();
  const p = prog(t, t0, dur, ease.inOut);
  return <div style={{position: 'absolute', left: x, top: y, width: w * p, height: 2, background: color}} />;
};
