import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {Video} from '@remotion/media';
import {continueRender, delayRender, Sequence, staticFile, useRemotionEnvironment} from 'remotion';
import {FPS, toBoard} from '../timeline';
import {useT} from '../anim';
import {CLIPS} from '../layout';

/**
 * The Stone Labs "slab": a thick honed-stone tablet with soft pebble edges — the studio's own object, not a
 * phone. The face carries an inlaid display showing the real website (site content only, no device UI);
 * the back carries the Stone Labs mark as a polished graphite inlay.
 * Units: 1000 tall; scale from outside.
 */
export const PHONE_H = 1000;
const BEZ = 26;
const SCR_H = PHONE_H - BEZ * 2;
const SCR_W = SCR_H * (1290 / 2140); // aspect of the cropped site recordings
export const PHONE_W = SCR_W + BEZ * 2;
const T = 78;
const R = 74;

const rr = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
};

const flatGeo = (w: number, h: number, r: number) => {
  const g = new THREE.ShapeGeometry(rr(w, h, r), 48);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
};

const extrude = (w: number, h: number, r: number, depth: number, bevel: number) => {
  const g = new THREE.ExtrudeGeometry(rr(w - bevel * 2, h - bevel * 2, Math.max(1, r - bevel)), {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 10,
    curveSegments: 56,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return g;
};

const clipPlanes = (key?: string): THREE.Plane[] => {
  if (!key) return [];
  const {cell, box} = CLIPS[key];
  const a = toBoard(cell, box.x, box.y);
  const b = toBoard(cell, box.x + box.w, box.y + box.h);
  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -a.x),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), b.x),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), -a.y), // three y = -board y
    new THREE.Plane(new THREE.Vector3(0, 1, 0), b.y),
  ];
};

// honed stone maps (world-unit UVs on the extrusion → repeat scaled to ~1 tile per slab)
let stoneCache: {map: THREE.Texture; rough: THREE.Texture; mapBack: THREE.Texture; roughBack: THREE.Texture} | null = null;
const stoneTextures = () => {
  if (stoneCache) return stoneCache;
  const ld = new THREE.TextureLoader();
  const mk = (f: string, srgb: boolean, rep: number) => {
    const t = ld.load(staticFile(f));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  stoneCache = {map: mk('stone/honed.jpg', true, 1 / 700), rough: mk('stone/rough.jpg', false, 1 / 700), mapBack: mk('stone/honed.jpg', true, 1), roughBack: mk('stone/rough.jpg', false, 1)};
  return stoneCache;
};

// Shared geometry + materials (built once per clip region).
const sharedByClip = new Map<string, ReturnType<typeof build>>();
const build = (clip?: string) => {
  const clippingPlanes = clipPlanes(clip);
  const clipShadows = !!clip;
  const stone = stoneTextures();
  const frameMat = new THREE.MeshPhysicalMaterial({clippingPlanes, clipShadows, map: stone.map, roughnessMap: stone.rough, color: '#ffffff', roughness: 0.85, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.5, envMapIntensity: 0.8});
  const backMat = new THREE.MeshPhysicalMaterial({clippingPlanes, clipShadows, map: stone.mapBack, roughnessMap: stone.roughBack, color: '#ffffff', roughness: 0.8, clearcoat: 0.22, clearcoatRoughness: 0.45, envMapIntensity: 0.8});
  const frontMat = new THREE.MeshPhysicalMaterial({clippingPlanes, clipShadows, color: '#1B1B1A', roughness: 0.25, clearcoat: 0.8, envMapIntensity: 1.0});
  const glassMat = new THREE.MeshPhysicalMaterial({clippingPlanes, clipShadows, color: '#0a0a0a', roughness: 0.02, metalness: 0.0, clearcoat: 1, transparent: true, opacity: 0.09, envMapIntensity: 3, depthWrite: false});
  const lensMat = new THREE.MeshPhysicalMaterial({clippingPlanes, clipShadows, color: '#0b0c10', roughness: 0.04, clearcoat: 1, envMapIntensity: 2});
  const blackMat = new THREE.MeshBasicMaterial({clippingPlanes, clipShadows, color: '#000000'});
  return {
    clippingPlanes,
    frameMat,
    backMat,
    frontMat,
    glassMat,
    lensMat,
    blackMat,
    body: extrude(PHONE_W, PHONE_H, R, T, T * 0.42),
    back: flatGeo(PHONE_W - T * 0.84, PHONE_H - T * 0.84, R - T * 0.42),
    front: flatGeo(SCR_W + 10, SCR_H + 10, R - BEZ + 5),
    screen: flatGeo(SCR_W, SCR_H, R - BEZ),
  };
};
const getShared = (clip?: string) => {
  const k = clip ?? '';
  if (!sharedByClip.has(k)) sharedByClip.set(k, build(clip));
  return sharedByClip.get(k)!;
};

// ── screen textures ────────────────────────────────────────────────────────────
const texCache = new Map<string, THREE.Texture>();
const loading = new Map<string, Promise<THREE.Texture>>();
const SEQ_KEEP = 48; // LRU budget for image-sequence frames (GPU memory)
const evict = () => {
  const seq = [...texCache.keys()].filter((k) => k.startsWith('seqc/'));
  for (const k of seq.slice(0, Math.max(0, seq.length - SEQ_KEEP))) {
    texCache.get(k)?.dispose();
    texCache.delete(k);
    loading.delete(k);
  }
};
const loadOnce = (file: string, attempt: number) =>
  new Promise<THREE.Texture>((res, rej) => {
    const url = staticFile(file) + (attempt ? `?r=${attempt}` : '');
    new THREE.TextureLoader().load(url, res, undefined, rej);
  });
const loadTex = (file: string): Promise<THREE.Texture | null> => {
  if (!loading.has(file)) {
    const p = (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const t = await loadOnce(file, attempt);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          texCache.set(file, t);
          if (file.startsWith('seqc/')) evict();
          return t;
        } catch (e) {
          console.warn('texture load failed, retrying', file, attempt, e);
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
      }
      loading.delete(file);
      return null;
    })();
    loading.set(file, p as Promise<THREE.Texture>);
  }
  return loading.get(file)!;
};
/** Warm the next frames of an image sequence so motion-blur samples rarely wait on I/O. */
const prefetch = (file: string) => {
  const m = file.match(/^(seqc\/[^/]+\/)(\d{4})\.jpg$/);
  if (!m) return;
  const n = parseInt(m[2], 10);
  for (let k = 1; k <= 4; k++) {
    const f = `${m[1]}${String(n + k).padStart(4, '0')}.jpg`;
    if (!texCache.has(f) && !loading.has(f)) loadTex(f);
  }
};

/**
 * Image texture that holds the frame (delayRender) until *this* canvas has redrawn with it — required because
 * the Three canvas renders on demand, and because motion-blur samples each own a canvas.
 */
export const useImageTexture = (file: string | undefined) => {
  const {advance, invalidate} = useThree();
  const [, setTick] = useState(0);
  const waiting = useRef<{file: string; handle: number} | null>(null);
  const tex = file ? texCache.get(file) ?? null : null;
  if (file && !tex && waiting.current?.file !== file) {
    if (waiting.current) continueRender(waiting.current.handle);
    const w = {file, handle: delayRender(`tex ${file}`, {timeoutInMilliseconds: 120000})};
    waiting.current = w;
    loadTex(file).then((t) => {
      if (!t && waiting.current === w) {
        // give up gracefully rather than hang the render
        continueRender(w.handle);
        waiting.current = null;
      }
      setTick((x) => x + 1);
    });
  }
  if (file) prefetch(file);
  useLayoutEffect(() => {
    if (!tex) return;
    invalidate();
    advance(performance.now());
    if (waiting.current && waiting.current.file === file) {
      continueRender(waiting.current.handle);
      waiting.current = null;
    }
  }, [tex, file, advance, invalidate]);
  return tex;
};

const VW = 860;
const VHH = 1864;

/** Live video → CanvasTexture (Remotion's recommended path for Three.js video textures). */
const VideoScreen: React.FC<{src: string; startAt: number; trim: number; children: (t: THREE.Texture) => React.ReactNode}> = ({
  src,
  startAt,
  trim,
  children,
}) => {
  const [surface] = useState(() => {
    const c = document.createElement('canvas');
    c.width = VW;
    c.height = VHH;
    const ctx = c.getContext('2d')!;
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return {ctx, texture};
  });
  const {invalidate, advance} = useThree();
  const {isRendering} = useRemotionEnvironment();
  const onFrame = useCallback(
    (frame: CanvasImageSource) => {
      surface.ctx.drawImage(frame, 0, 0, VW, VHH);
      surface.texture.needsUpdate = true;
      if (isRendering) advance(performance.now());
      else invalidate();
    },
    [surface, invalidate, advance, isRendering],
  );
  return (
    <>
      <Sequence from={Math.round(startAt * FPS)} layout="none">
        <Video src={staticFile(src)} trimBefore={Math.round(trim * FPS)} onVideoFrame={onFrame} muted headless />
      </Sequence>
      {children(surface.texture)}
    </>
  );
};

export type Screen = {video?: string; seq?: 'website1' | 'website2'; startAt?: number; trim?: number; image?: string};
const SEQ_LEN = {website1: 685, website2: 441};

// ── exploded view: the live screen splits into its UI bands (browser bar · hero · content · toolbar) ──
const BANDS: [number, number][] = [
  [0, 0.09], // site navigation
  [0.09, 0.5], // hero
  [0.5, 0.8], // content
  [0.8, 1], // footer / CTA
];
const bandGeo = (v0: number, v1: number) => {
  const w = SCR_W;
  const h = SCR_H;
  const r = R - BEZ;
  const top = h / 2 - v0 * h;
  const bot = h / 2 - v1 * h;
  const x0 = -w / 2;
  const x1 = w / 2;
  const sh = new THREE.Shape();
  const rt = v0 === 0 ? r : 0;
  const rb = v1 === 1 ? r : 0;
  sh.moveTo(x0 + rb, bot);
  sh.lineTo(x1 - rb, bot);
  if (rb) sh.absarc(x1 - rb, bot + rb, rb, -Math.PI / 2, 0, false);
  sh.lineTo(x1, top - rt);
  if (rt) sh.absarc(x1 - rt, top - rt, rt, 0, Math.PI / 2, false);
  sh.lineTo(x0 + rt, top);
  if (rt) sh.absarc(x0 + rt, top - rt, rt, Math.PI / 2, Math.PI, false);
  sh.lineTo(x0, bot + rb);
  if (rb) sh.absarc(x0 + rb, bot + rb, rb, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ShapeGeometry(sh, 32);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
};
let bandCache: {geo: THREE.ShapeGeometry; edges: THREE.EdgesGeometry}[] | null = null;
const getBands = () =>
  (bandCache ??= BANDS.map(([a, b]) => {
    const geo = bandGeo(a, b);
    return {geo, edges: new THREE.EdgesGeometry(geo)};
  }));
const GAP = 120;

const ExplodedScreen: React.FC<{tex: THREE.Texture | null; e: number}> = ({tex, e}) => (
  <>
    {getBands().map((b, i) => (
      <group key={i} position={[(i % 2 ? 1 : -1) * e * 18, 0, T / 2 + 0.6 + e * (90 + i * GAP)]}>
        <mesh geometry={b.geo}>
          <meshBasicMaterial key={tex ? tex.uuid : 'none'} map={tex ?? undefined} color={tex ? '#ffffff' : '#111'} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={b.edges} position={[0, 0, 0.5]}>
          <lineBasicMaterial color="#B08D6E" transparent opacity={Math.min(1, e * 1.6)} />
        </lineSegments>
      </group>
    ))}
  </>
);

const ScreenMesh: React.FC<{tex: THREE.Texture | null; dim: number; clip?: string}> = ({tex, dim, clip}) => {
  const s = getShared(clip);
  return (
    <mesh geometry={s.screen} position={[0, 0, T / 2 + 0.6]}>
      <meshBasicMaterial key={tex ? tex.uuid : 'none'} map={tex ?? undefined} color={tex ? new THREE.Color(dim, dim, dim) : '#111'} toneMapped={false} clippingPlanes={s.clippingPlanes} />
    </mesh>
  );
};

export type PhonePose = {x: number; y: number; z: number; rx: number; ry: number; rz: number; h: number};

/** Pose in board pixels (y down) → Three world (y up). Rotations in degrees. */
export const Phone: React.FC<{pose: PhonePose; screen: Screen; logoTex?: THREE.Texture | null; dim?: number; clip?: string; explode?: number}> = ({
  pose,
  screen,
  logoTex,
  dim = 1,
  clip,
  explode = 0,
}) => {
  const e = explode;
  const exploded = e > 0.003;
  const coverZ = e * (90 + BANDS.length * GAP + 60);
  const s = getShared(clip);
  const t = useT();
  const seqFile = screen.seq
    ? `seqc/${screen.seq}/${String(Math.max(0, Math.min(SEQ_LEN[screen.seq] - 1, Math.floor((t - (screen.startAt ?? 0) + (screen.trim ?? 0)) * 30)))).padStart(4, '0')}.jpg`
    : undefined;
  const imgTex = useImageTexture(seqFile ?? screen.image);
  const k = pose.h / PHONE_H;
  const d2r = Math.PI / 180;
  const logoW = PHONE_W * 0.36;
  const body = (
    <>
      <mesh geometry={s.body} material={s.frameMat} castShadow />
      <group position={[0, 0, e * 40]}>
        <mesh geometry={s.front} material={s.frontMat} position={[0, 0, T / 2 + 0.3]} />
      </group>
      <group position={[0, 0, coverZ]}>
        <mesh geometry={s.screen} material={s.glassMat} position={[0, 0, T / 2 + 1.2]} />
        {exploded && (
          <lineSegments position={[0, 0, T / 2 + 1.4]}>
            <edgesGeometry args={[s.screen]} />
            <lineBasicMaterial color="#B08D6E" transparent opacity={Math.min(1, e * 1.6)} />
          </lineSegments>
        )}
      </group>
      <group position={[0, 0, -e * 300]}>
      <mesh geometry={s.back} material={s.backMat} position={[0, 0, -T / 2 - 0.4]} rotation={[0, Math.PI, 0]} />
      {logoTex && (
        <mesh position={[0, 0, -T / 2 - 0.9]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[logoW, (logoW * 1040) / 970]} />
          <meshPhysicalMaterial key={logoTex.uuid} map={logoTex} transparent roughness={0.3} metalness={0} clearcoat={0.9} clearcoatRoughness={0.1} clippingPlanes={s.clippingPlanes} />
        </mesh>
      )}
      </group>
    </>
  );
  return (
    <group position={[pose.x, -pose.y, pose.z]} rotation={[pose.rx * d2r, pose.ry * d2r, pose.rz * d2r, 'YXZ']} scale={[k, k, k]}>
      {body}
      {screen.video ? (
        <VideoScreen src={screen.video} startAt={screen.startAt ?? 0} trim={screen.trim ?? 0}>
          {(tex) => (exploded ? <ExplodedScreen tex={tex} e={e} /> : <ScreenMesh tex={tex} dim={dim} clip={clip} />)}
        </VideoScreen>
      ) : exploded ? (
        <ExplodedScreen tex={imgTex} e={e} />
      ) : (
        <ScreenMesh tex={imgTex} dim={dim} clip={clip} />
      )}
    </group>
  );
};

/** Stone Labs mark as a texture for the phone backs. */
export const useLogoTexture = () => useImageTexture('logo/mark-graphite.png');
