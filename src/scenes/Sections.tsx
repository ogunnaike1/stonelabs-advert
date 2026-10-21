import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, F} from '../theme';
import {Card, Title, Script, IconCard} from '../components/Cards';
import {L} from '../layout';
import {useT, prog, ease, clamp, lerp} from '../anim';
import {S, WORD_TIMES} from '../timeline';
import {LANDSCAPE, pick} from '../format';

const Mono: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; o?: number}> = ({children, size = 22, color = C.sub, style, o = 1}) => (
  <div style={{fontFamily: F.display, fontWeight: 500, fontSize: size, letterSpacing: '0.16em', textTransform: 'uppercase', color, opacity: o, whiteSpace: 'nowrap', ...style}}>{children}</div>
);

// 0:00 — IDEAS, made real.
export const HookCards: React.FC = () => {
  const t = useT();
  const b = L.hook.title;
  return (
    <Card {...b} t0={2.35} from={[0, 320, 0]}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 96, textAlign: 'center'}}>
        <Title t0={2.6} lines={['STONE LABS']} size={118} mode="track" style={{position: 'relative', inset: 'auto', padding: 0}} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 232, display: 'flex', justifyContent: 'center'}}>
        <Script t0={3.2} dur={0.9} size={100}>
          creative digital studio
        </Script>
      </div>
    </Card>
  );
};

/** Screen-space hook type around the slammed stones: splits in on the impact, then tears apart with the push-through. */
export const HookType: React.FC = () => {
  const t = useT();
  if (t > 2.7) return null;
  const out = ease.in(clamp((t - 1.95) / 0.6));
  // portrait: above / below the stones · landscape: left / right of them
  const line = (top: number, dir: 1 | -1, el: React.ReactNode) => (
    <div
      style={{
        position: 'absolute',
        left: LANDSCAPE ? (dir < 0 ? 0 : 1160) : 0,
        width: LANDSCAPE ? 760 : undefined,
        right: LANDSCAPE ? undefined : 0,
        top,
        height: 200,
        transform: LANDSCAPE ? `translateX(${dir * out * 640}px) scale(${1 + out * 0.5})` : `translateY(${dir * out * 520}px) scale(${1 + out * 0.5})`,
        filter: out > 0.01 ? `blur(${out * 14}px)` : undefined,
        opacity: 1 - out,
      }}
    >
      {el}
    </div>
  );
  return (
    <>
      {line(pick(150, 440), -1, <Title t0={0.62} lines={['IDEAS,']} size={pick(182, 150)} />)}
      {line(pick(1500, 440), 1, <Title t0={0.8} lines={LANDSCAPE ? ['MADE', 'REAL.'] : ['MADE REAL.']} size={pick(150, 130)} />)}
    </>
  );
};

// 0:06 — Design in motion (+ phone pile card)
export const MotionCards: React.FC = () => {
  const T0 = S.motion;
  const l = L.motion;
  return (
    <>
      <Card {...l.title} t0={T0 - 0.15}>
        <Title t0={T0 + 0.1} lines={['DESIGN', 'IN MOTION.']} size={112} sub="Brand films · social ads · animated identities" />
      </Card>
      <Card {...l.pile} t0={T0 - 0.05} />
      <IconCard {...l.i1} t0={T0 + 0.25} icon="play" label="Brand films" from={[-260, 220, -9]} />
      <IconCard {...l.i2} t0={T0 + 0.35} icon="spark" label="Social ads" from={[0, 300, 0]} />
      <IconCard {...l.i3} t0={T0 + 0.45} icon="stones" label="Identities" from={[260, 220, 9]} />
    </>
  );
};

// 0:12.6 — Built for the web (Leave Your Legacy Fit)
export const WebACards: React.FC = () => {
  const t = useT();
  const T0 = S.webA;
  const l = L.webA;
  return (
    <>
      <Card {...l.title} t0={T0 - 0.25}>
        <Title t0={T0} lines={['BUILT FOR', 'THE WEB.']} size={104} sub={pick('E-commerce for performance equipment', 'leaveyourlegacyfit.com — e-commerce')} subSize={30} />
      </Card>
      <IconCard {...l.i1} t0={T0 + 0.2} icon="devices" label="Responsive" from={[-380, -40, -7]} />
      <Card {...l.small} t0={T0 + 0.3} from={[-380, 0, 6]}>
        <Mono size={20} style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center'}} o={prog(t, T0 + 0.9, 0.6)}>
          Collections
        </Mono>
      </Card>
      <Card {...l.stage} t0={T0 - 0.1} />
      {l.url && (
        <Card {...l.url} t0={T0 + 0.4} from={[-380, 60, -5]}>
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 18}}>
            <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 34, color: C.sub, opacity: prog(t, T0 + 0.8, 0.6)}}>Live at</div>
            <div style={{fontFamily: F.display, fontWeight: 500, fontSize: 25, color: C.ink, opacity: prog(t, T0 + 0.95, 0.6)}}>leaveyourlegacyfit.com</div>
          </div>
        </Card>
      )}
    </>
  );
};

// 0:16.8 — Skin Essential Plus (three-phone fan)
export const WebBCards: React.FC = () => {
  const t = useT();
  const T0 = S.webB;
  const l = L.webB;
  return (
    <>
      <Card {...l.title} t0={T0 - 0.25}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 36, textAlign: 'center'}}>
          <Title t0={T0} lines={['WELLNESS,']} size={104} mode="mask" style={{position: 'relative', inset: 'auto', padding: 0}} />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 176, display: 'flex', justifyContent: 'center'}}>
          <Script t0={T0 + 0.45} size={104}>
            booked beautifully.
          </Script>
        </div>
      </Card>
      {l.info && (
        <Card {...l.info} t0={T0 + 0.1} from={[-360, 120, -5]}>
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 26}}>
            {['Responsive build', 'Scroll storytelling', 'Booking flow'].map((txt, i) => (
              <Mono key={txt} size={24} o={prog(t, T0 + 0.5 + i * 0.15, 0.5)}>
                {txt}
              </Mono>
            ))}
            <div style={{marginTop: 18, fontFamily: F.display, fontWeight: 500, fontSize: 28, color: C.ink, opacity: prog(t, T0 + 1.0, 0.6)}}>skinessentialplus.com</div>
          </div>
        </Card>
      )}
      <Card {...l.fan} t0={T0 - 0.1}>
        {!LANDSCAPE && (
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 54, textAlign: 'center', fontFamily: F.display, fontWeight: 500, fontSize: 26, color: C.ink, opacity: prog(t, T0 + 1.6, 0.6)}}>
            skinessentialplus.com
          </div>
        )}
      </Card>
    </>
  );
};

// 0:21.6 — Beyond the screen (Blender interiors as 360° orbs)
export const VizCards: React.FC = () => {
  const t = useT();
  const T0 = S.viz;
  const l = L.viz;
  const r = clamp((t - S.render) / 1.7);
  const samples = Math.round(lerp(1, 4096, r ** 2));
  return (
    <>
      <Card {...l.title} t0={T0 + 0.55} from={[0, -260, 0]}>
        <Title t0={T0 + 0.75} lines={['3D INTERIOR', 'DESIGN.']} size={pick(104, 88)} sub="Designed & rendered in Blender" subSize={28} />
      </Card>
      <Card {...l.orb} t0={T0 - 0.1}>
        <Mono size={19} style={{position: 'absolute', left: 44, top: 40}} o={prog(t, T0 + 0.5, 0.5)}>
          {r < 0.02 ? 'Viewport · Clay + lines' : r < 1 ? 'Rendering · Cycles' : 'Render · Cycles'}
        </Mono>
        <Mono size={19} style={{position: 'absolute', right: 44, top: 40, fontVariantNumeric: 'tabular-nums'}} o={prog(t, T0 + 0.5, 0.5)}>
          {`${samples} / 4096 spp`}
        </Mono>
        <div style={{position: 'absolute', left: 44, right: 44, bottom: 46, height: 3, background: 'rgba(27,27,26,0.10)', borderRadius: 2, opacity: prog(t, T0 + 0.6, 0.5)}}>
          <div style={{width: `${r * 100}%`, height: '100%', background: C.walnut, borderRadius: 2}} />
        </div>
        <div style={{position: 'absolute', left: 44, bottom: 66, fontFamily: F.serif, fontStyle: 'italic', fontSize: 28, color: C.sub, opacity: prog(t, T0 + 0.7, 0.5)}}>Living room — 3D interior render</div>
      </Card>
      {l.info && (
        <Card {...l.info} t0={T0 + 0.85} from={[-300, 260, -6]}>
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20}}>
            <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 40, color: C.ink, opacity: prog(t, T0 + 1.1, 0.6)}}>From clay viewport to final render</div>
            <Mono size={22} o={prog(t, T0 + 1.3, 0.6)}>Living room · Kitchen · Bathroom</Mono>
          </div>
        </Card>
      )}
      {[
        [l.k, 'Kitchen'],
        [l.b, 'Bathroom'],
      ].map(([b, name], i) => (
        <Card key={name as string} {...(b as typeof l.k)} t0={T0 + 0.75 + i * 0.1} from={[i ? 240 : -240, 260, i ? 8 : -8]}>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 30, textAlign: 'center', fontFamily: F.serif, fontStyle: 'italic', fontSize: 30, color: C.sub, opacity: prog(t, T0 + 0.8 + i * 0.1, 0.5)}}>
            {name as string}
          </div>
        </Card>
      ))}
    </>
  );
};

// 0:30 — One studio (icon cards land on each spoken word)
export const CapsCards: React.FC = () => {
  const t = useT();
  const T0 = S.caps;
  const l = L.caps;
  const hi = (i: number) => {
    const w = WORD_TIMES[i];
    return clamp(1 - Math.abs(t - w - 0.25) / 0.5) ** 1.5;
  };
  return (
    <>
      <Card {...l.title} t0={T0 - 0.55} from={[0, -320, 0]}>
        <Title t0={T0 - 0.2} lines={['ONE STUDIO.']} size={pick(112, 84)} sub="Design × technology, under one roof" subSize={30} />
      </Card>
      <IconCard {...l.motion} t0={WORD_TIMES[0] - 0.2} icon="motion" label="Motion" hi={hi(0)} from={[-320, -120, -12]} />
      <IconCard {...l.web} t0={WORD_TIMES[1] - 0.2} icon="web" label="Web" hi={hi(1)} from={[-320, 140, 12]} />
      <IconCard {...l.d3} t0={WORD_TIMES[2] - 0.2} icon="cube" label="3D Interiors" hi={hi(2)} from={[320, -120, 12]} />
      <IconCard {...l.mobile} t0={WORD_TIMES[3] - 0.2} icon="mobile" label="Mobile" hi={hi(3)} from={[320, 140, -12]} />
      <Card {...l.trio} t0={T0 - 0.5} from={[0, 380, 0]} />
      <Card {...l.foot} t0={T0 - 0.4} from={[0, 340, 0]}>
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Script t0={T0 + 0.6} size={pick(128, 82)} dur={1.1}>
            ideas, made real.
          </Script>
        </div>
      </Card>
    </>
  );
};

// 0:35.6 — End card: the two stones of the official mark settle together.
export const LogoCard: React.FC = () => {
  const t = useT();
  const T0 = S.endCard;
  const b = L.logo.end;
  const p = prog(t, T0 - 0.1, 1.4, ease.out);
  const LW = pick(330, 250);
  const Y = pick({logo: 300, title: 800, sub: 960, script: 1030, rule: 1270, mail: 1316, wa: 1372}, {logo: 100, title: 410, sub: 545, script: 600, rule: 790, mail: 818, wa: 868});
  const LH = (LW * 1040) / 970;
  const stone = (part: 'top' | 'bottom', dir: 1 | -1) => (
    <Img
      src={staticFile(`logo/stone-${part}-graphite.png`)}
      style={{
        position: 'absolute',
        inset: 0,
        width: LW,
        height: LH,
        transform: `translate(${dir * (1 - p) * -150}px, ${dir * (1 - p) * -230}px) rotate(${dir * (1 - p) * -18}deg)`,
        opacity: prog(t, T0 - 0.1, 0.45),
        filter: `blur(${(1 - p) * 6}px)`,
      }}
    />
  );
  return (
    <Card {...b} t0={S.logo + 0.2}>
      <div style={{position: 'absolute', left: (b.w - LW) / 2, top: Y.logo, width: LW, height: LH}}>
        {stone('top', 1)}
        {stone('bottom', -1)}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: Y.title, textAlign: 'center'}}>
        <Title t0={T0 + 0.75} lines={['STONE LABS']} size={pick(112, 100)} mode="track" style={{position: 'relative', inset: 'auto', padding: 0}} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: Y.sub, textAlign: 'center', fontFamily: F.serif, fontStyle: 'italic', fontSize: pick(50, 44), color: C.ink, opacity: prog(t, T0 + 0.95, 0.7), filter: `blur(${(1 - prog(t, T0 + 0.95, 0.7)) * 8}px)`}}>
        Digital experiences,
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: Y.script, display: 'flex', justifyContent: 'center'}}>
        <Script t0={T0 + 2.0} dur={1.1} size={pick(124, 108)}>
          thoughtfully made.
        </Script>
      </div>
      <div style={{position: 'absolute', left: (b.w - 120) / 2, top: Y.rule, width: 120 * prog(t, T0 + 1.4, 0.8, ease.inOut), height: 2, background: C.taupe}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: Y.mail, textAlign: 'center', fontFamily: F.display, fontWeight: 500, fontSize: 32, color: C.ink, opacity: prog(t, T0 + 1.6, 0.6)}}>
        hello@stonelabs.com
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: Y.wa, textAlign: 'center', fontFamily: F.display, fontWeight: 400, fontSize: 30, color: C.sub, opacity: prog(t, T0 + 1.75, 0.6)}}>
        WhatsApp +234 813 156 1562
      </div>
    </Card>
  );
};
