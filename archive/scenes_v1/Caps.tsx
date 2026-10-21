import React from 'react';
import {OffthreadVideo, Sequence, staticFile} from 'remotion';
import {C, F} from '../theme';
import {Tile} from '../components/Tile';
import {Line, Label} from '../components/Type';
import {Panorama} from '../components/Panorama';
import {EaseCurve} from './Motion';
import {useT, prog, ease, lerp} from '../anim';
import {S, FPS} from '../timeline';

const T0 = S.caps;
const PW = 468;
const PH = 350;

const Preview: React.FC<{children: React.ReactNode; dark?: boolean}> = ({children, dark}) => (
  <div
    style={{
      position: 'absolute',
      left: 24,
      top: 24,
      width: PW,
      height: PH,
      borderRadius: 28,
      overflow: 'hidden',
      background: dark ? C.graphite : '#EDE8E0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

const MobileGlyph: React.FC<{t0: number}> = ({t0}) => {
  const t = useT();
  const d = prog(t, t0, 1.2, ease.inOut);
  const per = 2 * (150 + 300) + 40;
  return (
    <svg width={220} height={340} viewBox="-10 -10 220 340">
      {[0, 1].map((k) => (
        <rect
          key={k}
          x={k * 46}
          y={k * 14}
          width={150}
          height={300}
          rx={30}
          fill="none"
          stroke={k ? C.graphite : C.stone}
          strokeWidth={4}
          strokeDasharray={per}
          strokeDashoffset={per * (1 - prog(t, t0 + k * 0.2, 1.2, ease.inOut))}
        />
      ))}
      <rect x={46 + 50} y={14 + 16} width={50} height={12} rx={6} fill={C.graphite} opacity={d} />
    </svg>
  );
};

const SERVICES = [
  {n: '01', title: ['Motion &', 'Brand Ads'], sub: 'Ads · Identities · Social'},
  {n: '02', title: ['Web Design &', 'Development'], sub: 'Sites · E-commerce · Landing'},
  {n: '03', title: ['3D', 'Visualization'], sub: 'Interiors · Exteriors · 360°'},
  {n: '04', title: ['Mobile', 'Apps'], sub: 'iOS · Android · Interface'},
];

// 30:00 – 34:80 · one studio, four disciplines.
export const Caps: React.FC = () => {
  const t = useT();
  const big: React.CSSProperties = {fontFamily: F.serif, fontSize: 140, lineHeight: 0.9, color: C.graphite};
  const boxes = [
    {x: 12, y: 576},
    {x: 552, y: 576},
    {x: 12, y: 1254},
    {x: 552, y: 1254},
  ];
  return (
    <>
      <Tile x={12} y={12} w={1056} h={540}>
        <Label t0={T0 - 0.2} style={{position: 'absolute', left: 64, top: 172}}>
          Stone Labs — Capabilities
        </Label>
        <div style={{position: 'absolute', left: 60, top: 222}}>
          <Line t0={T0 - 0.25} style={big}>
            ONE STUDIO,
          </Line>
          <Line t0={T0 - 0.05} style={{...big, fontStyle: 'italic', color: C.walnut}}>
            four disciplines.
          </Line>
        </div>
      </Tile>
      {SERVICES.map((s, i) => {
        const t0 = T0 + 0.3 + i * 0.6;
        return (
          <Tile key={s.n} {...boxes[i]} w={516} h={654} t0={t0 - 0.25}>
            {i === 0 && (
              <Preview>
                <EaseCurve t0={t0} size={230} loop={2.4} showHandles={false} />
              </Preview>
            )}
            {i === 1 && (
              <Preview dark>
                <Sequence from={Math.round((T0 - 1) * FPS)} layout="none">
                  <OffthreadVideo
                    src={staticFile('web/website2.mp4')}
                    startFrom={Math.round(0.4 * FPS)}
                    muted
                    style={{width: PW, height: PW * (1494 / 900), position: 'absolute', top: -lerp(30, 140, prog(t, T0, 5, ease.soft))}}
                  />
                </Sequence>
              </Preview>
            )}
            {i === 2 && (
              <Preview>
                <Panorama
                  file="360-hallway.jpg"
                  width={PW}
                  height={PH}
                  pixelScale={1.1}
                  view={{yawDeg: (lerp(0.03, 0.1, prog(t, T0 - 0.5, 5.5, ease.soft)) - 0.5) * 360, pitchDeg: -2, vfovDeg: 72}}
                />
              </Preview>
            )}
            {i === 3 && (
              <Preview>
                <MobileGlyph t0={t0 + 0.1} />
              </Preview>
            )}
            <Label t0={t0} style={{position: 'absolute', left: 48, top: 410}} size={20}>
              {s.n}
            </Label>
            <div style={{position: 'absolute', left: 46, top: 446, fontFamily: F.serif, fontSize: 58, lineHeight: 0.98, color: C.graphite}}>
              <Line t0={t0 + 0.05}>{s.title[0]}</Line>
              <Line t0={t0 + 0.12} style={{fontStyle: 'italic'}}>
                {s.title[1]}
              </Line>
            </div>
            <Label t0={t0 + 0.25} style={{position: 'absolute', left: 48, top: 590}} size={16}>
              {s.sub}
            </Label>
          </Tile>
        );
      })}
    </>
  );
};
