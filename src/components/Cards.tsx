import React from 'react';
import {C, F} from '../theme';
import {useT, prog, ease, clamp} from '../anim';

export type Box = {x: number; y: number; w: number; h: number};

/** Frosted studio card (reference: soft white glass tiles over a bokeh backdrop). Rises + un-blurs on entry. */
export const Card: React.FC<
  Box & {t0?: number; children?: React.ReactNode; style?: React.CSSProperties; radius?: number; from?: [number, number, number]}
> = ({x, y, w, h, t0, children, style, radius = 46, from}) => {
  const t = useT();
  const p = t0 === undefined ? 1 : prog(t, t0, 0.85, ease.out);
  const a = from && t0 !== undefined ? prog(t, t0, 0.7, ease.snap) : 1;
  const assembled = from
    ? `translate(${(1 - a) * from[0]}px, ${(1 - a) * from[1]}px) rotate(${(1 - a) * from[2]}deg) scale(${1 + (1 - a) * 0.12})`
    : `translateY(${(1 - p) * 90}px) scale(${0.96 + 0.04 * p})`;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.78) 0%, rgba(248,247,245,0.62) 55%, rgba(240,238,235,0.58) 100%)',
        backdropFilter: 'blur(22px) saturate(1.05)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.05)',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 0 0 1.5px rgba(255,255,255,0.45), 0 30px 60px -30px rgba(40,36,32,0.30), 0 4px 14px rgba(40,36,32,0.05)',
        opacity: p,
        transform: assembled,
        filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export type TitleMode = 'split' | 'mask' | 'track';

const lineStyle = (size: number): React.CSSProperties => ({
  fontFamily: F.display,
  fontWeight: 600,
  fontSize: size,
  lineHeight: 0.98,
  letterSpacing: '-0.01em',
  color: C.ink,
  whiteSpace: 'nowrap',
});

/** Split & snap: the line's top and bottom halves slide in from opposite sides and lock together. */
const SplitLine: React.FC<{text: React.ReactNode; t0: number; size: number; dir: 1 | -1}> = ({text, t0, size, dir}) => {
  const t = useT();
  const p = prog(t, t0, 0.62, ease.snap);
  const o = clamp(prog(t, t0, 0.3, ease.out) * 1.2);
  const blur = (1 - clamp(p)) * 10;
  const off = (1 - p) * 520;
  const gap = (1 - clamp(p)) * 18;
  const half = (top: boolean) => (
    <div
      style={{
        ...lineStyle(size),
        position: top ? 'relative' : 'absolute',
        inset: top ? undefined : 0,
        clipPath: top ? 'inset(-10% -5% 50% -5%)' : 'inset(50% -5% -10% -5%)',
        transform: `translate(${(top ? -1 : 1) * dir * off}px, ${(top ? -1 : 1) * gap}px)`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
        opacity: o,
      }}
    >
      {text}
    </div>
  );
  return (
    <div style={{position: 'relative'}}>
      {half(true)}
      {half(false)}
    </div>
  );
};

/** Per-letter masked rise with a tiny overshoot snap. */
const MaskLine: React.FC<{text: string; t0: number; size: number}> = ({text, t0, size}) => {
  const t = useT();
  return (
    <div style={{...lineStyle(size), display: 'flex'}}>
      {text.split('').map((ch, i) => {
        const p = prog(t, t0 + i * 0.028, 0.55, ease.snap);
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: '0.06em 0', margin: '-0.06em 0'}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 105}%)`, whiteSpace: 'pre'}}>{ch}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Tracking snap: letters arrive spread wide and blurred, then lock to their spacing. */
const TrackLine: React.FC<{text: string; t0: number; size: number; spacing?: number}> = ({text, t0, size, spacing = 0.08}) => {
  const t = useT();
  const p = prog(t, t0, 0.75, ease.snap);
  const o = prog(t, t0, 0.35, ease.out);
  return (
    <div style={{...lineStyle(size), letterSpacing: `${spacing + (1 - p) * 0.9}em`, marginRight: `-${spacing + (1 - p) * 0.9}em`, opacity: o, filter: `blur(${(1 - clamp(p)) * 9}px)`}}>
      {text}
    </div>
  );
};

/** Reference-style title block (bold display + small caption) with premium kinetic modes. */
export const Title: React.FC<{
  t0: number;
  lines: React.ReactNode[];
  sub?: React.ReactNode;
  size?: number;
  subSize?: number;
  align?: 'center' | 'left';
  style?: React.CSSProperties;
  mode?: TitleMode;
}> = ({t0, lines, sub, size = 112, subSize = 34, align = 'center', style, mode = 'split'}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start', padding: '0 60px', textAlign: align, ...style}}>
      {lines.map((ln, i) => {
        const lt = t0 + i * 0.14;
        if (mode === 'mask' && typeof ln === 'string') return <MaskLine key={i} text={ln} t0={lt} size={size} />;
        if (mode === 'track' && typeof ln === 'string') return <TrackLine key={i} text={ln} t0={lt} size={size} />;
        return <SplitLine key={i} text={ln} t0={lt} size={size} dir={i % 2 ? -1 : 1} />;
      })}
      {sub && (
        <div style={{marginTop: 22, overflow: 'hidden', paddingBottom: 6}}>
          <div
            style={{
              fontFamily: F.serif,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: subSize,
              color: C.sub,
              whiteSpace: 'nowrap',
              transform: `translateY(${(1 - prog(t, t0 + 0.45, 0.7, ease.out)) * 110}%)`,
              opacity: prog(t, t0 + 0.45, 0.5),
            }}
          >
            {sub}
          </div>
        </div>
      )}
    </div>
  );
};

/** Aesthetic Monoline written on with a left→right reveal, like a pen stroke. */
export const Script: React.FC<{t0: number; dur?: number; children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({
  t0,
  dur = 0.9,
  children,
  size = 120,
  color = C.walnut,
  style,
}) => {
  const t = useT();
  const p = prog(t, t0, dur, ease.inOut);
  return (
    <div
      style={{
        fontFamily: F.script,
        fontSize: size,
        lineHeight: 1.15,
        color,
        whiteSpace: 'nowrap',
        clipPath: `inset(-20% ${(1 - p) * 102}% -30% -5%)`,
        opacity: p > 0 ? 1 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── monoline icons (walnut → taupe gradient strokes, like the reference's gradient line icons) ──
const Grad: React.FC<{id: string}> = ({id}) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#3B2C22" />
      <stop offset="100%" stopColor="#B08D6E" />
    </linearGradient>
  </defs>
);
const ICONS: Record<string, React.ReactNode> = {
  play: (
    <>
      <rect x="10" y="18" width="80" height="58" rx="12" />
      <path d="M43 36 L62 47 L43 58 Z" />
      <path d="M22 88 H78" />
    </>
  ),
  spark: (
    <>
      <path d="M50 10 C53 34 66 47 90 50 C66 53 53 66 50 90 C47 66 34 53 10 50 C34 47 47 34 50 10 Z" />
    </>
  ),
  stones: (
    <>
      <ellipse cx="42" cy="30" rx="30" ry="15" transform="rotate(-14 42 30)" />
      <ellipse cx="58" cy="72" rx="32" ry="17" transform="rotate(-14 58 72)" />
    </>
  ),
  devices: (
    <>
      <rect x="8" y="16" width="64" height="46" rx="6" />
      <path d="M26 74 H54" />
      <rect x="62" y="34" width="30" height="54" rx="7" />
    </>
  ),
  bag: (
    <>
      <path d="M20 34 H80 L74 88 H26 Z" />
      <path d="M36 34 C36 14 64 14 64 34" />
    </>
  ),
  calendar: (
    <>
      <rect x="12" y="18" width="76" height="70" rx="10" />
      <path d="M12 38 H88 M32 10 V26 M68 10 V26" />
      <path d="M34 60 L46 70 L68 50" />
    </>
  ),
  cube: (
    <>
      <path d="M50 10 L86 30 V70 L50 90 L14 70 V30 Z" />
      <path d="M14 30 L50 50 L86 30 M50 50 V90" />
    </>
  ),
  orbit: (
    <>
      <circle cx="50" cy="50" r="22" />
      <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(-18 50 50)" />
    </>
  ),
  motion: (
    <>
      <circle cx="62" cy="50" r="20" />
      <path d="M10 38 H34 M16 50 H38 M10 62 H34" />
    </>
  ),
  web: (
    <>
      <rect x="10" y="16" width="80" height="68" rx="10" />
      <path d="M10 34 H90" />
      <circle cx="22" cy="25" r="2.5" />
      <circle cx="31" cy="25" r="2.5" />
    </>
  ),
  mobile: (
    <>
      <rect x="28" y="8" width="44" height="84" rx="11" />
      <path d="M42 18 H58" />
    </>
  ),
};

export const Icon: React.FC<{name: string; size?: number; draw?: number}> = ({name, size = 120, draw = 1}) => {
  const id = `g-${name}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
      <Grad id={id} />
      <g fill="none" stroke={`url(#${id})`} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw}>
        {React.Children.map((ICONS[name] as React.ReactElement<{children: React.ReactNode}>).props.children, (c) =>
          React.cloneElement(c as React.ReactElement<React.SVGProps<SVGElement>>, {pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - draw}),
        )}
      </g>
    </svg>
  );
};

/** Icon + label card (reference: "Easy Customization", "Full Control", "Trendy"...). */
export const IconCard: React.FC<Box & {t0: number; icon: string; label: string; hi?: number; from?: [number, number, number]}> = ({t0, icon, label, hi = 0, from, ...b}) => {
  const t = useT();
  const d = prog(t, t0 + 0.15, 0.9, ease.inOut);
  return (
    <Card {...b} t0={t0} from={from} style={hi ? {outline: `${hi * 3}px solid rgba(90,69,53,${hi * 0.45})`, outlineOffset: -hi * 3} : undefined}>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, transform: `scale(${1 + hi * 0.08})`}}>
        <Icon name={icon} size={Math.min(130, b.w * 0.42)} draw={d} />
        <div style={{fontFamily: F.display, fontWeight: 500, fontSize: Math.min(34, b.w * 0.13), color: C.ink, opacity: prog(t, t0 + 0.35, 0.6), whiteSpace: 'nowrap'}}>{label}</div>
      </div>
    </Card>
  );
};
