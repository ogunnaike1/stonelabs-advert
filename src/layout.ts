// Cell-local card boxes (0..W × 0..H). Shared by the HTML cards and the 3D clipping regions.
import type {CellName} from './timeline';
import {pick} from './format';

type B = {x: number; y: number; w: number; h: number};

const PORTRAIT = {
  hook: {title: {x: 40, y: 1190, w: 1000, h: 420}},
  motion: {
    title: {x: 40, y: 150, w: 1000, h: 400},
    pile: {x: 40, y: 580, w: 1000, h: 800},
    i1: {x: 40, y: 1410, w: 317, h: 470},
    i2: {x: 381, y: 1410, w: 318, h: 470},
    i3: {x: 723, y: 1410, w: 317, h: 470},
  },
  webA: {
    title: {x: 40, y: 150, w: 1000, h: 360},
    i1: {x: 40, y: 540, w: 400, h: 420},
    small: {x: 40, y: 990, w: 400, h: 420},
    stage: {x: 464, y: 540, w: 576, h: 1340},
    url: {x: 40, y: 1440, w: 400, h: 440} as B | null,
  },
  webB: {
    title: {x: 40, y: 150, w: 1000, h: 360},
    fan: {x: 40, y: 540, w: 1000, h: 1340},
    info: null as B | null,
  },
  viz: {
    title: {x: 40, y: 150, w: 1000, h: 360},
    orb: {x: 40, y: 540, w: 1000, h: 900},
    k: {x: 40, y: 1470, w: 490, h: 410},
    b: {x: 550, y: 1470, w: 490, h: 410},
    info: null as B | null,
  },
  caps: {
    title: {x: 40, y: 150, w: 1000, h: 360},
    motion: {x: 40, y: 540, w: 236, h: 440},
    web: {x: 40, y: 1004, w: 236, h: 440},
    trio: {x: 300, y: 540, w: 480, h: 904},
    d3: {x: 804, y: 540, w: 236, h: 440},
    mobile: {x: 804, y: 1004, w: 236, h: 440},
    foot: {x: 40, y: 1468, w: 1000, h: 412},
  },
  logo: {end: {x: 40, y: 150, w: 1000, h: 1730}},
};

// 16:9 — bento grids modelled on the reference's own landscape layouts (title card + device + feature cards)
const LANDSCAPE: typeof PORTRAIT = {
  hook: {title: {x: 110, y: 300, w: 840, h: 480}},
  motion: {
    title: {x: 60, y: 60, w: 780, h: 420},
    pile: {x: 870, y: 60, w: 990, h: 960},
    i1: {x: 60, y: 510, w: 240, h: 510},
    i2: {x: 330, y: 510, w: 240, h: 510},
    i3: {x: 600, y: 510, w: 240, h: 510},
  },
  webA: {
    title: {x: 60, y: 60, w: 800, h: 420},
    i1: {x: 60, y: 510, w: 385, h: 510},
    small: {x: 475, y: 510, w: 385, h: 510},
    stage: {x: 890, y: 60, w: 970, h: 960},
    url: null,
  },
  webB: {
    title: {x: 60, y: 60, w: 800, h: 420},
    fan: {x: 890, y: 60, w: 970, h: 960},
    info: {x: 60, y: 510, w: 800, h: 510},
  },
  viz: {
    title: {x: 60, y: 60, w: 700, h: 460},
    orb: {x: 790, y: 60, w: 700, h: 960},
    k: {x: 1520, y: 60, w: 340, h: 465},
    b: {x: 1520, y: 555, w: 340, h: 465},
    info: {x: 60, y: 550, w: 700, h: 470},
  },
  caps: {
    title: {x: 60, y: 60, w: 560, h: 460},
    motion: {x: 1300, y: 60, w: 265, h: 460},
    web: {x: 1595, y: 60, w: 265, h: 460},
    trio: {x: 650, y: 60, w: 620, h: 960},
    d3: {x: 1300, y: 550, w: 265, h: 470},
    mobile: {x: 1595, y: 550, w: 265, h: 470},
    foot: {x: 60, y: 550, w: 560, h: 470},
  },
  logo: {end: {x: 60, y: 60, w: 1800, h: 960}},
};

export const L = pick(PORTRAIT, LANDSCAPE);

/** Card rects that clip 3D slabs (so a pile sits *inside* its card like the reference). */
export const CLIPS: Record<string, {cell: CellName; box: B}> = {
  pile: {cell: 'motion', box: L.motion.pile},
  webAsmall: {cell: 'webA', box: L.webA.small},
};
