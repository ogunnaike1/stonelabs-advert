import React from 'react';
import {OffthreadVideo, Sequence, staticFile} from 'remotion';
import {FPS} from '../timeline';
import {useT, prog, ease} from '../anim';

export type Segment = {at: number; src: number; dur: number};

const SCREEN_W = 640;
const SCREEN_H = 1062; // matches the 900×1494 crop of the iPhone recordings (status bar + Safari chrome removed)
const BEZEL = 14;

/**
 * Minimal graphite device frame showing a real site recording.
 * Segments cut with a masked upward wipe; the frame turns in 3D like the reference's floating phones.
 */
export const Phone: React.FC<{
  file: string;
  segments: Segment[];
  rotY: number;
  rotX: number;
  rotZ?: number;
  scale?: number;
  style?: React.CSSProperties;
}> = ({file, segments, rotY, rotX, rotZ = 0, scale = 1, style}) => {
  const t = useT();
  const W = SCREEN_W + BEZEL * 2;
  const Hh = SCREEN_H + BEZEL * 2;
  const glare = 0.5 + rotY / 60;
  return (
    <div style={{width: W, height: Hh, perspective: 2600, ...style}}>
      <div
        style={{
          width: W,
          height: Hh,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
        }}
      >
        {/* body thickness */}
        {[10, 8, 6, 4, 2].map((z) => (
          <div
            key={z}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 96,
              background: z > 6 ? '#8E877D' : '#3A3836',
              transform: `translateZ(${-z * 1.6}px)`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 96,
            background: '#1B1B1A',
            boxShadow: 'inset 0 0 0 3px #B9B2A8, inset 0 0 0 5px #2A2928',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: BEZEL,
            top: BEZEL,
            width: SCREEN_W,
            height: SCREEN_H,
            borderRadius: 82,
            overflow: 'hidden',
            background: '#111',
            transform: 'translateZ(0.5px)',
          }}
        >
          {segments.map((s, i) => {
            const p = i === 0 ? 1 : prog(t, s.at, 0.62, ease.inOut);
            const next = segments[i + 1];
            const dim = next ? prog(t, next.at, 0.62, ease.inOut) : 0;
            const from = Math.round(s.at * FPS) - (i === 0 ? 0 : 0);
            return (
              <Sequence key={i} from={from} durationInFrames={Math.round((s.dur + 0.7) * FPS)} layout="none">
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
                    transform: `scale(${1 + (1 - p) * 0.08}) translateY(${-dim * 6}%)`,
                    filter: `brightness(${1 - dim * 0.35})`,
                  }}
                >
                  <OffthreadVideo
                    src={staticFile(`web/${file}`)}
                    startFrom={Math.round(s.src * FPS)}
                    muted
                    style={{width: SCREEN_W, height: SCREEN_H, display: 'block'}}
                  />
                </div>
              </Sequence>
            );
          })}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(${115 + rotY}deg, rgba(255,255,255,0) ${glare * 60}%, rgba(255,255,255,0.10) ${glare * 60 + 8}%, rgba(255,255,255,0) ${glare * 60 + 22}%)`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const PHONE_SIZE = {w: SCREEN_W + BEZEL * 2, h: SCREEN_H + BEZEL * 2};
