import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, F} from '../theme';
import {Tile} from '../components/Tile';
import {Line, Label, Pill, Hairline} from '../components/Type';
import {useT, prog, ease} from '../anim';

// 00:00 – 04:80 · "IDEAS, MADE REAL." — a single editorial headline set like the serif specimen.
export const Hook: React.FC = () => {
  const t = useT();
  const big: React.CSSProperties = {
    fontFamily: F.serif,
    fontSize: 300,
    lineHeight: 0.84,
    letterSpacing: '-0.01em',
    color: C.graphite,
  };
  const mark = prog(t, 2.9, 1.1, ease.out);
  return (
    <>
      <Tile x={12} y={12} w={1056} h={1380}>
        <Label t0={0.0} style={{position: 'absolute', left: 64, top: 230}}>
          Stone Labs
        </Label>
        <Label t0={0.1} style={{position: 'absolute', right: 64, top: 230}}>
          Nº 01 — Studio Reel
        </Label>
        <Hairline t0={0.0} x={64} y={290} w={928} />
        <div style={{position: 'absolute', left: 58, top: 420}}>
          <Line t0={0.06} dur={1.0} style={big}>
            IDEAS,
          </Line>
          <Line t0={0.36} dur={1.0} style={big}>
            MADE
          </Line>
          <Line t0={0.66} dur={1.0} style={{...big, fontStyle: 'italic', color: C.walnut}}>
            REAL.
          </Line>
        </div>
        <Pill t0={1.75} x={800} y={520} rot={-4}>
          Motion
        </Pill>
        <Pill t0={2.0} x={745} y={785} rot={3}>
          Web
        </Pill>
        <Pill t0={2.25} x={225} y={1060} rot={-3}>
          3D
        </Pill>
        <Pill t0={2.5} x={790} y={1065} rot={2}>
          Mobile
        </Pill>
        <Hairline t0={1.2} x={64} y={1250} w={928} />
        <Label t0={1.4} style={{position: 'absolute', left: 64, top: 1282}}>
          Creative digital studio
        </Label>
        <Label t0={1.5} style={{position: 'absolute', right: 64, top: 1282}}>
          Design × Technology
        </Label>
      </Tile>
      <Tile x={12} y={1416} w={516} h={492} t0={0.5}>
        <Label t0={1.6} style={{position: 'absolute', left: 48, top: 48}}>
          What we do
        </Label>
        <div style={{position: 'absolute', left: 48, top: 130, fontFamily: F.serif, fontSize: 64, lineHeight: 1.0, color: C.graphite}}>
          <Line t0={1.8}>Brands, sites</Line>
          <Line t0={1.95}>&amp; spaces —</Line>
          <Line t0={2.1} style={{fontStyle: 'italic', color: C.taupe}}>
            brought to life.
          </Line>
        </div>
      </Tile>
      <Tile x={552} y={1416} w={516} h={492} t0={0.65}>
        <Img
          src={staticFile('logo/mark-graphite.png')}
          style={{
            position: 'absolute',
            width: 170,
            left: (516 - 170) / 2,
            top: (492 - 182) / 2,
            opacity: mark,
            transform: `translateY(${(1 - mark) * 24}px)`,
            filter: `blur(${(1 - mark) * 8}px)`,
          }}
        />
      </Tile>
    </>
  );
};
