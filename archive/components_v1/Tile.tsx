import React from 'react';
import {C} from '../theme';
import {useT, prog, ease} from '../anim';

export type Box = {x: number; y: number; w: number; h: number};

/** Porcelain bento tile. `t0` fades/settles it in (reference: cards ease up out of a soft blur). */
export const Tile: React.FC<
  Box & {t0?: number; dark?: boolean; children?: React.ReactNode; style?: React.CSSProperties; radius?: number}
> = ({x, y, w, h, t0, dark, children, style, radius = 44}) => {
  const t = useT();
  const p = t0 === undefined ? 1 : prog(t, t0, 0.9, ease.out);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        overflow: 'hidden',
        background: dark
          ? `linear-gradient(165deg, #262524 0%, ${C.graphite} 100%)`
          : `linear-gradient(165deg, #FAF8F4 0%, ${C.porcelain} 45%, #F0ECE5 100%)`,
        boxShadow: dark
          ? '0 30px 60px -24px rgba(30,24,18,0.45)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.35), 0 28px 56px -26px rgba(74,58,42,0.28), 0 3px 10px rgba(74,58,42,0.05)',
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px) scale(${0.97 + 0.03 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
