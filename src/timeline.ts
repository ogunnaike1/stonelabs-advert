// Master timing. 100 BPM → beat 0.6 s. The Lyria bed is trimmed so its downbeats land on multiples of 0.6 s.
export const FPS = 60;
export const BPM = 100;
export const BEAT = 60 / BPM;
export const TOTAL = 40.0;

import {W, H, CX, CY, pick} from './format';

// Board grid: each layout is one frame-sized cell; 24 px gutters keep every card aligned into one surface.
export const CELL_W = W + 24;
export const CELL_H = H + 24;
export const CELLS = {
  hook: {c: 0, r: 0},
  motion: {c: 0, r: 1},
  webA: {c: 1, r: 1},
  webB: {c: 2, r: 1},
  viz: {c: 2, r: 2},
  caps: {c: 1, r: 2},
  logo: {c: 1, r: 3},
} as const;
export type CellName = keyof typeof CELLS;

/** Cell-local layout px (0..W, 0..H) → board px. */
export const toBoard = (cellName: CellName, lx: number, ly: number) => ({
  x: CELLS[cellName].c * CELL_W + lx - CX,
  y: CELLS[cellName].r * CELL_H + ly - CY,
});

export const S = {
  hook: 0,
  motion: 6.0,
  dive: 8.6,
  webA: 12.6,
  webB: 16.8,
  viz: 21.6,
  render: 22.6,
  inside: 25.3,
  room2: 27.6,
  caps: 30.0,
  logo: 34.2,
  endCard: 35.6,
};

// Voiceover (Gemini TTS, voice "Orus"; assets/audio/vo_master.wav = take t5_a + pickup line5_b at 30.16 s): [placeAt, srcIn, srcOut, tempo]. Used by tools/mix.py too.
export const VO_CUES: [number, number, number, number][] = [
  [0.82, 0.24, 4.02, 1.08], // Every idea deserves to be made real.  (right after the stone slam)
  [4.35, 4.44, 6.82, 1], // This is Stone Labs.
  [8.45, 7.16, 9.32, 1], // Design that moves.
  [13.45, 9.78, 12.98, 1], // Websites that feel as good as they look.
  [22.45, 30.36, 36.24, 1], // We design interiors in 3D — rendered down to every detail.
  [30.2, 19.23, 20.15, 1], // Motion.
  [31.2, 20.42, 20.98, 1], // Web.
  [32.2, 21.28, 22.2, 1], // 3D.
  [33.2, 22.47, 23.17, 1], // Mobile.
  [34.85, 23.8, 25.06, 1], // Stone Labs.
  [36.35, 25.55, 28.86, 1], // Digital experiences, thoughtfully made.
];
export const WORD_TIMES = [30.2, 31.2, 32.2, 33.2];

// Pile card + orb card centres (cell-local).
export const PILE = pick({cell: 'motion' as CellName, x: 540, y: 980, w: 1000, h: 800}, {cell: 'motion' as CellName, x: 1365, y: 540, w: 990, h: 960});
export const ORB = pick({cell: 'viz' as CellName, x: 540, y: 990, r: 330}, {cell: 'viz' as CellName, x: 1140, y: 540, r: 300});

type Stop = {t: number; x: number; y: number; s: number; ease: 'drift' | 'glide' | 'dive' | 'pull'; dip?: number};
const at = (k: CellName, lx = CX, ly = CY) => toBoard(k, lx, ly);

export const CAMERA: Stop[] = [
  {t: 0, ...at('hook', CX, CY - pick(80, 0)), s: 0.92, ease: 'drift'},
  {t: 1.95, ...at('hook', CX, CY - pick(80, 0)), s: 0.97, ease: 'drift'},
  {t: 2.9, ...at('hook', CX, CY - pick(30, 0)), s: 1.0, ease: 'pull'},
  {t: 5.2, ...at('hook', CX, CY + pick(30, 10)), s: 1.02, ease: 'drift'},
  {t: 6.0, ...at('motion'), s: 1.0, ease: 'glide', dip: 0.15},
  {t: 7.8, ...at('motion', CX+ 0, CY+ 15), s: 1.02, ease: 'drift'},
  {t: 8.6, ...at('motion', PILE.x - 60, PILE.y + 40), s: 2.1, ease: 'glide'},
  {t: 10.6, ...at('motion', PILE.x + 150, PILE.y - 40), s: 2.35, ease: 'drift'},
  {t: 11.4, ...at('motion'), s: 1.0, ease: 'glide'},
  {t: 11.8, ...at('motion', CX+ 0, CY+ 5), s: 1.01, ease: 'drift'},
  {t: 12.6, ...at('webA'), s: 1.0, ease: 'glide', dip: 0.2},
  {t: 16.0, ...at('webA', CX+ 0, CY+ 15), s: 1.02, ease: 'drift'},
  {t: 16.8, ...at('webB'), s: 1.0, ease: 'glide', dip: 0.2},
  {t: 20.2, ...at('webB', CX+ 0, CY+ 15), s: 1.02, ease: 'drift'},
  {t: 20.9, ...at('webA', CX + CELL_W / 2), s: 0.5, ease: 'glide'},
  {t: 21.0, ...at('webA', CX + CELL_W / 2), s: 0.505, ease: 'drift'},
  {t: 21.6, ...at('viz', ORB.x + 40, ORB.y - 60), s: 4.6, ease: 'glide'}, // push all the way into a macro of the orb
  {t: 21.75, ...at('viz', ORB.x + 38, ORB.y - 56), s: 4.45, ease: 'drift'},
  {t: 23.0, ...at('viz'), s: 1.0, ease: 'pull'}, // macro → wide reveal of the whole layout
  {t: 24.4, ...at('viz', CX+ 0, CY+ 15), s: 1.03, ease: 'drift'},
  {t: S.inside, ...at('viz', ORB.x, ORB.y), s: 3.4, ease: 'dive'},
  {t: 29.35, ...at('caps', CX+ 0, CY+ 40), s: 0.42, ease: 'drift'}, // continue the push-through: arrive from far out
  {t: 30.0, ...at('caps'), s: 1.0, ease: 'pull'},
  {t: 33.85, ...at('caps', CX+ 0, CY+ 20), s: 1.02, ease: 'drift'},
  {t: 34.6, ...at('logo'), s: 1.0, ease: 'glide', dip: 0.12},
  {t: TOTAL, ...at('logo', CX+ 0, CY- 10), s: 1.04, ease: 'drift'},
];
