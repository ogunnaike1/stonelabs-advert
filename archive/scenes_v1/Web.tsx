import React from 'react';
import {C, F} from '../theme';
import {Tile} from '../components/Tile';
import {Line, Label, Hairline} from '../components/Type';
import {Phone, PHONE_SIZE, Segment} from '../components/Phone';
import {useT, prog, ease, lerp} from '../anim';
import {S} from '../timeline';

// Real portfolio recordings (status bar + Safari chrome cropped away, design untouched).
const LEGACY: Segment[] = [
  {at: 11.3, src: 0.95, dur: 1.95}, // hero headline build
  {at: 13.25, src: 6.0, dur: 3.0}, // "The Form Bench"
  {at: 16.25, src: 8.7, dur: 5.4}, // collections scroll
];
const SKIN: Segment[] = [
  {at: 14.9, src: 2.1, dur: 2.2}, // "Radiance, Refined."
  {at: 17.1, src: 8.7, dur: 1.9}, // "Stillness, Reimagined."
  {at: 19.0, src: 13.0, dur: 2.7}, // treatment cards
];

const Url: React.FC<{t0: number; children: string; style?: React.CSSProperties}> = ({t0, children, style}) => {
  const t = useT();
  const p = prog(t, t0, 0.8);
  const n = Math.round(children.length * prog(t, t0, 0.9, ease.inOut));
  return (
    <div style={{fontFamily: F.ui, fontSize: 24, fontWeight: 450, color: C.graphite, opacity: p, whiteSpace: 'nowrap', ...style}}>
      {children.slice(0, n)}
      <span style={{opacity: n < children.length ? 1 : 0, color: C.walnut}}>|</span>
    </div>
  );
};

// 12:00 – 15:60 · Leave Your Legacy Fit
export const WebA: React.FC = () => {
  const t = useT();
  const T0 = S.webA;
  const enter = prog(t, 11.35, 1.5, ease.out);
  const drift = prog(t, 12.4, 9, ease.soft);
  const big: React.CSSProperties = {fontFamily: F.serif, fontSize: 160, lineHeight: 0.88, color: C.graphite};
  return (
    <>
      <Tile x={12} y={12} w={1056} h={540}>
        <Label t0={T0 - 0.35} style={{position: 'absolute', left: 64, top: 172}}>
          02 — Web Design &amp; Development
        </Label>
        <div style={{position: 'absolute', left: 60, top: 222}}>
          <Line t0={T0 - 0.4} style={big}>
            BUILT FOR
          </Line>
          <Line t0={T0 - 0.2} style={{...big, fontStyle: 'italic', color: C.walnut}}>
            the web.
          </Line>
        </div>
      </Tile>
      <Tile x={12} y={576} w={1056} h={1332}>
        <Label t0={T0 + 0.1} style={{position: 'absolute', left: 64, top: 52}}>
          Project 01
        </Label>
        <Url t0={T0 + 0.2} style={{position: 'absolute', right: 64, top: 46}}>
          leaveyourlegacyfit.com
        </Url>
        <div
          style={{
            position: 'absolute',
            left: (1056 - PHONE_SIZE.w) / 2,
            top: 100,
            transform: `translateY(${(1 - enter) * 420}px)`,
            opacity: Math.min(1, enter * 2),
          }}
        >
          <Phone file="website2.mp4" segments={LEGACY} rotY={lerp(-30, -10, enter) + drift * 16} rotX={lerp(14, 5, enter)} rotZ={lerp(-4, 0, enter)} />
        </div>
        <Hairline t0={T0 + 0.6} x={64} y={1226} w={928} />
        <Label t0={T0 + 0.8} style={{position: 'absolute', left: 64, top: 1256}} size={20}>
          E-commerce · Performance equipment
        </Label>
      </Tile>
    </>
  );
};

// 15:60 – 21:60 · Skin Essential Plus
export const WebB: React.FC = () => {
  const t = useT();
  const T0 = S.webB;
  const enter = prog(t, 14.95, 1.5, ease.out);
  const drift = prog(t, 16.0, 6, ease.soft);
  return (
    <>
      <Tile x={12} y={12} w={1056} h={1402}>
        <div
          style={{
            position: 'absolute',
            left: (1056 - PHONE_SIZE.w) / 2,
            top: 150,
            transform: `translateY(${(1 - enter) * 420}px)`,
            opacity: Math.min(1, enter * 2),
          }}
        >
          <Phone file="website1.mp4" segments={SKIN} rotY={lerp(30, 10, enter) - drift * 18} rotX={lerp(14, 5, enter)} rotZ={lerp(4, 0, enter)} />
        </div>
        <Label t0={T0 + 0.2} style={{position: 'absolute', left: 64, top: 1300}}>
          Project 02
        </Label>
        <Url t0={T0 + 0.3} style={{position: 'absolute', right: 64, top: 1294}}>
          skinessentialplus.com
        </Url>
      </Tile>
      <Tile x={12} y={1438} w={516} h={470} t0={T0 - 0.2}>
        <div style={{position: 'absolute', left: 48, top: 56, fontFamily: F.serif, fontSize: 70, lineHeight: 0.95, color: C.graphite}}>
          <Line t0={T0 + 0.3}>Wellness,</Line>
          <Line t0={T0 + 0.45} style={{fontStyle: 'italic', color: C.walnut}}>
            booked beautifully.
          </Line>
        </div>
      </Tile>
      <Tile x={552} y={1438} w={516} h={470} t0={T0 - 0.1}>
        <div style={{position: 'absolute', left: 48, top: 60, fontFamily: F.sans, fontSize: 22, letterSpacing: '0.2em', lineHeight: 2.2, textTransform: 'uppercase', color: C.taupe}}>
          {['Responsive build', 'Scroll storytelling', 'Booking flow'].map((s, i) => (
            <Line key={s} t0={T0 + 0.5 + i * 0.12}>
              {s}
            </Line>
          ))}
        </div>
      </Tile>
    </>
  );
};
