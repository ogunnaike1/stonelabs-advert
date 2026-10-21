import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Phone, PhonePose, useLogoTexture, Screen} from './Phone';
import {Orb} from './Orb';
import {LogoStones, StonePose} from './LogoStones';
import {pick, H as H_} from '../format';
import {cameraAt} from '../camera';
import {useT, ease, clamp, lerp} from '../anim';
import {S, toBoard, PILE, ORB, CellName} from '../timeline';

const FOV = 30;
// vertical FOV maps exactly half the frame height onto the board plane at scale 1
export const CAM_D = H_ / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);

// ── pose helpers ────────────────────────────────────────────────────────────────
type Key = {t: number; p: Partial<PhonePose>; e?: (x: number) => number};
const FIELDS: (keyof PhonePose)[] = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'h'];
export const track = (t: number, base: PhonePose, keys: Key[]): PhonePose => {
  const out = {...base};
  for (const f of FIELDS) {
    const ks = keys.filter((k) => k.p[f] !== undefined);
    if (!ks.length) continue;
    if (t <= ks[0].t) {
      out[f] = ks[0].p[f]!;
      continue;
    }
    let v = ks[ks.length - 1].p[f]!;
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i].t) {
        const a = ks[i - 1];
        const b = ks[i];
        const p = (b.e ?? ease.out)(clamp((t - a.t) / (b.t - a.t)));
        v = lerp(a.p[f]!, b.p[f]!, p);
        break;
      }
    }
    out[f] = v;
  }
  return out;
};

const at = (cell: CellName, lx: number, ly: number, z: number, h: number, rx = 0, ry = 0, rz = 0): PhonePose => ({
  ...toBoard(cell, lx, ly),
  z,
  h,
  rx,
  ry,
  rz,
});

/** The reference's signature move: a phone rises from below back-first, turns through its edge, lands on its screen. */
const flipIn = (t0: number, dur: number, end: PhonePose, side = 1, from = 1500): Key[] => [
  {t: t0, p: {x: end.x + side * 160, y: end.y + from, z: end.z + 380, rx: 38, ry: end.ry + side * 200, rz: end.rz - side * 26}},
  {t: t0 + dur * 0.55, p: {x: end.x + side * 30, y: end.y + 90, z: end.z + 90, rx: end.rx + 8, ry: end.ry + side * 60, rz: end.rz - side * 4}, e: ease.inOut},
  {t: t0 + dur, p: {x: end.x, y: end.y, z: end.z, rx: end.rx, ry: end.ry, rz: end.rz}, e: ease.out},
];

const float = (p: PhonePose, t: number, k = 1): PhonePose => ({
  ...p,
  y: p.y + Math.sin(t * 1.25) * 9 * k,
  rx: p.rx + Math.sin(t * 0.9 + 1) * 1.6 * k,
  ry: p.ry + Math.sin(t * 0.7) * 2.6 * k,
});

const vis = (t: number, a: number, b: number) => t >= a && t <= b;

// ── hook: the two stones of the mark slam together, hold, then part and fly past the lens ──
export const HOOK = {slam: 0.6, part: 1.95, out: 2.6};
const HookStones: React.FC<{t: number}> = ({t}) => {
  const c = pick(toBoard('hook', 540, 880), toBoard('hook', 960, 540));
  const zero: StonePose = {x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0};
  const pose = (dir: 1 | -1): StonePose => {
    if (t < HOOK.slam) {
      const p = ease.in(clamp((t + 0.08) / (HOOK.slam + 0.08)));
      return {x: -dir * 520 * (1 - p), y: -dir * 640 * (1 - p), z: 420 * (1 - p), rx: dir * 40 * (1 - p), ry: -dir * 55 * (1 - p), rz: dir * 28 * (1 - p)};
    }
    if (t < HOOK.part) {
      const k = Math.exp(-(t - HOOK.slam) * 9) * Math.sin((t - HOOK.slam) * 40); // impact rebound
      return {...zero, y: -dir * k * 14, rz: dir * k * 1.2};
    }
    const p = ease.in(clamp((t - HOOK.part) / (HOOK.out - HOOK.part)));
    return {x: -dir * 900 * p, y: -dir * 700 * p, z: 2600 * p, rx: dir * 30 * p, ry: -dir * 40 * p, rz: dir * 25 * p};
  };
  const turn = t < HOOK.part ? Math.sin(clamp((t - HOOK.slam) / (HOOK.part - HOOK.slam)) * Math.PI * 0.5) : 1;
  return <LogoStones x={c.x} y={c.y} z={260} width={pick(720, 560)} rx={6 - 4 * turn} ry={-16 + 26 * turn} top={pose(1)} bottom={pose(-1)} />;
};

// ── scene contents ───────────────────────────────────────────────────────────────
const PILE_PHONES: {dx: number; dy: number; rz: number; back?: boolean; z: number; tilt: [number, number]; img?: string}[] = [
  {dx: -300, dy: -170, rz: -28, z: 34, tilt: [4, -6], img: 'stillsc/w2_strength.jpg'},
  {dx: -40, dy: -250, rz: 13, z: 72, tilt: [-5, 3], img: 'stillsc/w1_radiance.jpg'},
  {dx: 250, dy: -150, rz: 36, z: 44, tilt: [3, 6], img: 'stillsc/pano_living-room.jpg'},
  {dx: -270, dy: 190, rz: 19, z: 58, tilt: [-4, -4], back: true},
  {dx: 10, dy: 80, rz: -15, z: 126, tilt: [6, 2]}, // ← slot taken by the hero phone
  {dx: 300, dy: 210, rz: -38, z: 82, tilt: [-3, 5], img: 'stillsc/w1_cards.jpg'},
  {dx: -60, dy: 360, rz: 64, z: 40, tilt: [2, -3], img: 'stillsc/pano_kitchen.jpg'},
  {dx: 330, dy: -420, rz: -58, z: 30, tilt: [0, 4], img: 'stillsc/w1_ritual.jpg'},
];
const HERO_SLOT = 4;

const pileRest = (i: number, t: number): PhonePose => {
  const ph = PILE_PHONES[i];
  const c = toBoard(PILE.cell, PILE.x + ph.dx, PILE.y + ph.dy);
  const drift = Math.max(0, t - (S.motion + 1.2));
  return {x: c.x + drift * (i % 2 ? 6 : -5), y: c.y + drift * (i % 3 ? -4 : 5), z: ph.z, h: pick(560, 600), rx: ph.tilt[0], ry: (ph.back ? 180 : 0) + ph.tilt[1], rz: ph.rz + drift * (i % 2 ? 2.4 : -2.0)};
};

/** Explode → hold → collapse-and-lock, as 0..1. */
export const explodeAt = (t: number) => {
  const a = 14.15;
  if (t < a) return 0;
  if (t < a + 0.8) return ease.ramp(clamp((t - a) / 0.8));
  if (t < 15.5) return 1;
  return 1 - ease.in(clamp((t - 15.5) / 0.4));
};

/**
 * One continuous hero phone carries the story (precision assembly): flips in on the hook → spins down and
 * lands in the pile → rises out of the pile and flips into the web layout → explodes into its UI layers → locks.
 */
const HeroPhone: React.FC<{t: number; logo: THREE.Texture | null}> = ({t, logo}) => {
  const hook = pick(at('hook', 540, 610, 260, 1000, 6, -16, 3), at('hook', 1390, 545, 200, 740, 6, -16, 3));
  const web = pick(at('webA', 752, 1135, 230, 1090, 5, -18 + 360, 3), at('webA', 1375, 545, 200, 790, 5, -18 + 360, 3));
  const slotT = S.motion + 0.25 + HERO_SLOT * 0.09 + 0.75;
  let p = track(t, hook, flipIn(HOOK.part + 0.1, 1.8, hook, 1, 1500));
  p = float(p, t, clamp((t - HOOK.part - 1.8) / 0.6) * (t < 5 ? 1 : 0));
  if (t >= 4.9) {
    const slot = pileRest(HERO_SLOT, t);
    p = track(t, p, [
      {t: 4.9, p: {...hook}},
      {t: 5.75, p: {x: (hook.x + slot.x) / 2 + 160, y: (hook.y + slot.y) / 2, z: pick(900, 520), rx: 30, ry: hook.ry + 200, rz: -40, h: 760}, e: ease.ramp},
      {t: slotT, p: {...slot}, e: ease.out},
    ]);
    if (t > slotT) p = slot;
  }
  if (t >= 11.35) {
    const slot = pileRest(HERO_SLOT, 11.35);
    p = track(t, slot, [
      {t: 11.35, p: {...slot}},
      {t: 11.95, p: {x: slot.x + 260, y: slot.y - 240, z: pick(820, 480), rx: 22, ry: 190, rz: -10, h: 900}, e: ease.ramp},
      {t: 12.95, p: {...web}, e: ease.out},
    ]);
    p = float(p, t, clamp((t - 12.9) / 0.5));
    // exploded view: turn to a three-quarter view so the layer depth reads
    const e = explodeAt(t);
    p = {...p, ry: p.ry - 34 * e, rx: p.rx + 12 * e, rz: p.rz - 6 * e, x: p.x - 70 * e, z: p.z + 60 * e};
  }
  const screen = t < 12.0 ? ({seq: 'website2', startAt: 0, trim: 0.9} as const) : ({seq: 'website2', startAt: 12.0, trim: 0.5} as const);
  return <Phone pose={p} logoTex={logo} screen={screen} explode={explodeAt(t)} />;
};

const Pile: React.FC<{t: number; logo: THREE.Texture | null}> = ({t, logo}) => (
  <>
    {PILE_PHONES.map((ph, i) => {
      if (i === HERO_SLOT) return null;
      if (t < S.motion + 0.25 + i * 0.09 - 0.02) return null; // exists only once its drop begins
      const rest = pileRest(i, t);
      const t0 = S.motion + 0.25 + i * 0.09;
      const p = track(t, rest, [
        {t: t0, p: {z: pick(1400, 420) + i * pick(60, 25), rz: ph.rz + (i % 2 ? 70 : -70), rx: 40, y: rest.y - pick(200, 1100)}},
        {t: t0 + 0.75, p: {z: ph.z, rz: rest.rz, rx: rest.rx, y: rest.y}, e: ease.snap},
      ]);
      return <Phone key={i} pose={p} logoTex={logo} screen={{image: ph.img}} clip="pile" />;
    })}
  </>
);

const WebASmall: React.FC<{t: number; logo: THREE.Texture | null}> = ({t, logo}) => {
  const small = pick(at('webA', 240, 1190, 120, 340, 4, 0, -4), at('webA', 667, 765, 120, 330, 4, 0, -4));
  const ps = track(t, small, [
    {t: S.webA + 0.5, p: {ry: 120, y: small.y + 300, z: 60}},
    {t: S.webA + 1.6, p: {ry: 35, y: small.y, z: 120}, e: ease.snap},
    {t: S.webA + 6, p: {ry: -10}, e: ease.soft},
  ]);
  return <Phone pose={ps} logoTex={logo} screen={{image: 'stillsc/w2_cardio.jpg'}} clip="webAsmall" />;
};

const WebBPhones: React.FC<{t: number; logo: THREE.Texture | null}> = ({t, logo}) => {
  const end = pick(at('webB', 540, 1190, 260, 1060, 4, 0, 0), at('webB', 1375, 560, 220, 760, 4, 0, 0));
  const p = float(track(t, end, flipIn(S.webB - 0.55, 1.6, end, -1, 950)), t, clamp((t - S.webB - 1.05) / 0.6) * 0.7);
  const side = (dir: 1 | -1, img: string) => {
    const fin = pick(at('webB', 540 + dir * 270, 1250, 150, 900, 2, -dir * 26, dir * 7), at('webB', 1375 + dir * 250, 590, 130, 650, 2, -dir * 26, dir * 7));
    const q = track(t, fin, [
      {t: S.webB + 1.1, p: {x: end.x, z: 120, ry: 0, rz: 0}},
      {t: S.webB + 1.75, p: {x: fin.x, z: fin.z, ry: fin.ry, rz: fin.rz}, e: ease.snap},
    ]);
    return <Phone pose={float(q, t + dir, 0.6)} logoTex={logo} screen={{image: img}} />;
  };
  return (
    <>
      {t > S.webB + 1.0 && side(-1, 'stillsc/w2_bench.jpg')}
      {t > S.webB + 1.0 && side(1, 'stillsc/w1_stillness.jpg')}
      <Phone pose={p} logoTex={logo} screen={{seq: 'website1', startAt: S.webB - 0.3, trim: 2.0}} />
    </>
  );
};

const VizOrbs: React.FC<{t: number}> = ({t}) => {
  const c = toBoard(ORB.cell, ORB.x, ORB.y);
  const progress = clamp((t - S.render) / 1.7);
  const small = (lx: number, ly: number, room: string, d: number) => {
    const b = toBoard('viz', lx, ly);
    const pp = ease.snap(clamp((t - (S.viz + 0.95 + d)) / 0.7));
    return <Orb room={room} x={b.x} y={b.y} z={140} r={pick(98, 100) * pp} spin={-200 + t * 14} progress={clamp((t - S.render - 0.4 - d) / 1.6)} ring={0.7} />;
  };
  return (
    <>
      <Orb room="living-room" x={c.x} y={c.y + Math.sin(t * 1.1) * 8} z={340} r={ORB.r} spin={-231 + t * 9} progress={progress} />
      {small(pick(285, 1690), pick(1648, 270), 'kitchen', 0)}
      {small(pick(795, 1690), pick(1648, 765), 'bathroom', 0.15)}
    </>
  );
};

const MERGE = 33.3;
const MERGED = 33.85;
const trioSpin = (t: number) => {
  const base = (Math.min(t, MERGE) - S.caps) * 34;
  if (t <= MERGE) return base;
  return lerp(base, 360, ease.in(clamp((t - MERGE) / (MERGED - MERGE)))); // speed ramp into the merge
};

const CapsTrio: React.FC<{t: number; logo: THREE.Texture | null}> = ({t, logo}) => {
  const c = pick(toBoard('caps', 540, 992), toBoard('caps', 960, 540));
  const rise = ease.out(clamp((t - (S.caps - 0.5)) / 1.2));
  const spin = trioSpin(t);
  const rad = 175 * (1 - ease.in(clamp((t - MERGE) / (MERGED - MERGE))));
  const imgs = ['stillsc/w2_hero.jpg', 'stillsc/w1_radiance.jpg', 'stillsc/pano_living-room.jpg'];
  return (
    <>
      {imgs.map((img, i) => {
        const a = ((i * 120 + spin) * Math.PI) / 180;
        const p: PhonePose = {x: c.x + Math.sin(a) * rad, y: c.y + (1 - rise) * 900, z: 160 + Math.cos(a) * rad - i * 2, h: 610, rx: 4, ry: (a * 180) / Math.PI, rz: 0};
        return <Phone key={i} pose={p} logoTex={logo} screen={{image: img}} />;
      })}
    </>
  );
};

/** The merged trio phone travels with the camera and turns to show the Stone Labs mark on its back. */
const LogoPhone: React.FC<{t: number; logo: THREE.Texture | null}> = ({t, logo}) => {
  const c = pick(toBoard('caps', 540, 992), toBoard('caps', 960, 540));
  const end = pick(at('logo', 540, 880, 420, 1500, -4, 180, 0), at('logo', 960, 540, 420, 1150, -4, 180, 0));
  const p = track(t, end, [
    {t: MERGED, p: {x: c.x, y: c.y, z: 160, ry: 0, rz: 0, rx: 4, h: 610}},
    {t: 34.62, p: {x: end.x, y: end.y, z: end.z, ry: 180 + 360, rz: 0, rx: -4, h: end.h}, e: ease.ramp},
    {t: S.endCard - 0.25, p: {z: end.z + 120, ry: 180 + 360, y: end.y}, e: ease.soft},
    {t: S.endCard + 0.5, p: {z: end.z + 900, ry: 180 + 500, y: end.y - 3200, rz: -20}, e: ease.in},
  ]);
  return <Phone pose={p} logoTex={logo} screen={{image: 'stillsc/w2_hero.jpg'}} />;
};

// ── camera, lights, shadows ─────────────────────────────────────────────────────
const Rig: React.FC<{t: number}> = ({t}) => {
  const {camera, scene, gl} = useThree();
  const cam = cameraAt(t);
  const pmrem = useMemo(() => {
    const g = new THREE.PMREMGenerator(gl);
    const env = g.fromScene(new RoomEnvironment(), 0.04).texture;
    g.dispose();
    return env;
  }, [gl]);
  scene.environment = pmrem;
  gl.localClippingEnabled = true;
  const pc = camera as THREE.PerspectiveCamera;
  pc.fov = FOV;
  pc.near = 20;
  pc.far = 30000;
  pc.position.set(cam.x, -cam.y, CAM_D / cam.s);
  pc.rotation.set(0, 0, 0);
  pc.updateProjectionMatrix();
  const cx = cam.x;
  const cy = -cam.y;
  const span = 2600 / cam.s;
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(cx, cy, 0);
  target.updateMatrixWorld();
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#d8d2c8', 0.6]} />
      <directionalLight
        position={[cx - 900, cy + 1500, 2600]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={100}
        shadow-camera-far={8000}
        shadow-bias={-0.0004}
        shadow-radius={10}
        target={target}
      />
      <primitive object={target} />
      <mesh position={[cx, cy, 0]} receiveShadow>
        <planeGeometry args={[span * 3, span * 3]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
    </>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  const logo = useLogoTexture();
  return (
    <>
      <Rig t={t} />
      {vis(t, 0, HOOK.out + 0.05) && <HookStones t={t} />}
      {vis(t, HOOK.part, S.viz + 0.1) && <HeroPhone t={t} logo={logo} />}
      {vis(t, S.motion - 0.2, S.webA + 0.3) && <Pile t={t} logo={logo} />}
      {vis(t, S.webA - 0.4, S.viz + 0.1) && <WebASmall t={t} logo={logo} />}
      {vis(t, S.webB - 0.6, S.viz + 0.1) && <WebBPhones t={t} logo={logo} />}
      {vis(t, S.viz - 0.6, S.inside + 0.1) && <VizOrbs t={t} />}
      {vis(t, S.caps - 0.7, MERGED - 0.001) && <CapsTrio t={t} logo={logo} />}
      {vis(t, MERGED, S.endCard + 0.6) && <LogoPhone t={t} logo={logo} />}
    </>
  );
};

export const World: React.FC<{width: number; height: number}> = ({width, height}) => (
  <ThreeCanvas
    width={width}
    height={height}
    shadows={{type: THREE.PCFSoftShadowMap}}
    dpr={Math.max(1.5, typeof window !== 'undefined' ? window.devicePixelRatio : 1)}
    gl={{antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0}}
    camera={{fov: FOV, near: 20, far: 30000, position: [0, 0, CAM_D]}}
    style={{position: 'absolute', inset: 0}}
  >
    <Scene />
  </ThreeCanvas>
);
