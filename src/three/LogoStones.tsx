import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * The two stones of the official Stone Labs mark as real 3D objects: each outline is traced from the supplied
 * logo artwork (tools/stone_assets.py) and extruded with a soft bevel — the silhouette seen head-on is the mark itself.
 */
type Contours = {aspect: number; top: [number, number][]; bottom: [number, number][]};
let contours: Contours | null = null;

const useContours = () => {
  const {advance, invalidate} = useThree();
  const [c, setC] = useState<Contours | null>(contours);
  const [h] = useState(() => (contours ? null : delayRender('logo contours')));
  useEffect(() => {
    if (contours) return;
    fetch(staticFile('logo/stones.json'))
      .then((r) => r.json())
      .then((j: Contours) => {
        contours = j;
        setC(j);
      });
  }, []);
  useLayoutEffect(() => {
    if (!c) return;
    invalidate();
    advance(performance.now()); // redraw the on-demand canvas before releasing the frame
    if (h !== null) continueRender(h);
  }, [c, h, advance, invalidate]);
  return c;
};

const geoFor = (pts: [number, number][]) => {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const depth = 0.1;
  const bevel = 0.055;
  const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.018, bevelSegments: 12, curveSegments: 4});
  g.computeBoundingBox();
  const c = new THREE.Vector3();
  g.boundingBox!.getCenter(c);
  g.translate(-c.x, -c.y, -depth / 2); // pivot each stone on its own centre
  g.computeVertexNormals();
  return {g, cx: c.x, cy: c.y};
};

const mat = new THREE.MeshPhysicalMaterial({color: '#0d0d0c', roughness: 0.26, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25});

export type StonePose = {x: number; y: number; z: number; rx: number; ry: number; rz: number};

/** width = logo width in board px. Each stone has its own pose offset from the assembled position. */
export const LogoStones: React.FC<{x: number; y: number; z: number; width: number; rx?: number; ry?: number; top: StonePose; bottom: StonePose}> = ({
  x,
  y,
  z,
  width,
  rx = 0,
  ry = 0,
  top,
  bottom,
}) => {
  const c = useContours();
  const geos = useMemo(() => (c ? {top: geoFor(c.top), bottom: geoFor(c.bottom)} : null), [c]);
  if (!geos) return null;
  const d = Math.PI / 180;
  const part = (g: {g: THREE.ExtrudeGeometry; cx: number; cy: number}, p: StonePose, key: string) => (
    <group key={key} position={[g.cx + p.x / width, g.cy - p.y / width, p.z / width]} rotation={[p.rx * d, p.ry * d, p.rz * d]}>
      <mesh geometry={g.g} material={mat} castShadow />
    </group>
  );
  return (
    <group position={[x, -y, z]} rotation={[rx * d, ry * d, 0]} scale={[width, width, width]}>
      {part(geos.top, top, 'top')}
      {part(geos.bottom, bottom, 'bottom')}
    </group>
  );
};
