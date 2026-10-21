import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, F} from '../theme';
import {Tile} from '../components/Tile';
import {Line, Label, Hairline} from '../components/Type';
import {useT, prog, ease} from '../anim';
import {S} from '../timeline';

const T0 = S.logo;
const LOGO_W = 360;
const LOGO_H = (LOGO_W * 1040) / 970; // official mark proportions, untouched

/**
 * 34:80 – 39:60 · The two stones of the official mark settle together.
 * Each stone is cut pixel-exactly from the supplied logo on the same canvas, so the resting state is the original mark.
 */
export const Logo: React.FC = () => {
  const t = useT();
  const p = prog(t, T0 - 0.1, 1.5, ease.out);
  const stone = (part: 'top' | 'bottom', dir: 1 | -1) => (
    <Img
      src={staticFile(`logo/stone-${part}-graphite.png`)}
      style={{
        position: 'absolute',
        inset: 0,
        width: LOGO_W,
        height: LOGO_H,
        transform: `translate(${dir * (1 - p) * -170}px, ${dir * (1 - p) * -260}px) rotate(${dir * (1 - p) * -16}deg)`,
        opacity: prog(t, T0 - 0.1, 0.5),
        filter: `blur(${(1 - p) * 6}px)`,
      }}
    />
  );
  return (
    <Tile x={12} y={12} w={1056} h={1896}>
      <div style={{position: 'absolute', left: (1056 - LOGO_W) / 2, top: 470, width: LOGO_W, height: LOGO_H}}>
        {stone('top', 1)}
        {stone('bottom', -1)}
      </div>
      <div style={{position: 'absolute', left: 0, width: 1056, top: 990, textAlign: 'center'}}>
        <Line t0={T0 + 0.9} dur={1.1} style={{fontFamily: F.serif, fontSize: 132, letterSpacing: '0.05em', lineHeight: 1, color: C.graphite}}>
          STONE LABS
        </Line>
      </div>
      <div style={{position: 'absolute', left: 0, width: 1056, top: 1150, textAlign: 'center', color: C.graphite}}>
        <Line t0={T0 + 1.3} style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 56, lineHeight: 1.1}}>
          Digital experiences,
        </Line>
        <Line t0={T0 + 1.45} pad={0.4} style={{lineHeight: 1.1}}>
          <span style={{fontFamily: F.script, fontSize: 96, color: C.walnut, marginRight: 14, position: 'relative', top: 8}}>thoughtfully</span>
          <span style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 56}}>made.</span>
        </Line>
      </div>
      <Hairline t0={T0 + 1.9} x={(1056 - 120) / 2} y={1380} w={120} color={C.taupe} />
      <div style={{position: 'absolute', left: 0, width: 1056, top: 1418, textAlign: 'center'}}>
        <Label t0={T0 + 2.1} color={C.graphite} size={26} style={{letterSpacing: '0.12em', textTransform: 'none', fontFamily: F.ui, fontWeight: 400}}>
          hello@stonelabs.com
        </Label>
        <Label t0={T0 + 2.25} color={C.taupe} size={26} style={{marginTop: 16, letterSpacing: '0.12em', textTransform: 'none', fontFamily: F.ui, fontWeight: 400}}>
          WhatsApp&nbsp;&nbsp;+234 813 156 1562
        </Label>
      </div>
    </Tile>
  );
};
