import {getInputProps} from 'remotion';

/**
 * One source, two deliverables. Render with --props='{"format":"16x9"}' for landscape; default is 9:16.
 * (Remotion Studio: npx remotion studio src/index.ts --props='{"format":"16x9"}')
 */
export const LANDSCAPE = (getInputProps() as {format?: string}).format === '16x9';
export const W = LANDSCAPE ? 1920 : 1080;
export const H = LANDSCAPE ? 1080 : 1920;
export const CX = W / 2;
export const CY = H / 2;
/** pick(portrait, landscape) */
export const pick = <T,>(portrait: T, landscape: T): T => (LANDSCAPE ? landscape : portrait);
