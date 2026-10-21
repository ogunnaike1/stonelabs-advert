import React, {useMemo} from 'react';
import * as THREE from 'three';

/**
 * A Blender interior shown as a 360° orb: the equirect render wrapped on a sphere, starting as a
 * clay/Freestyle-line viewport pass and "rendering" into the final Cycles image (top→bottom bucket sweep
 * with progressive-sample noise behind the sweep line). A glass shell + orbit ring sell it as an object.
 */
const VS = `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
uniform sampler2D colorTex; uniform sampler2D clayTex; uniform float progress; uniform float seed; uniform float opacity;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  vec3 col = texture2D(colorTex, uv).rgb;
  vec3 clay = texture2D(clayTex, uv).rgb;
  float edge = 1.0 - vUv.y;             // sweep runs top → bottom
  float done = smoothstep(progress - 0.015, progress, edge) ;
  float rendered = 1.0 - done;
  // progressive samples: noisy just behind the sweep, converging to clean
  float age = clamp((progress - edge) / 0.35, 0.0, 1.0);
  float n = (hash(floor(gl_FragCoord.xy / 1.25)) - 0.5) * (1.0 - age) * 0.5; // per-pixel sample noise (resolution independent)
  vec3 r = col + n;
  vec3 c = mix(clay, r, rendered);
  float line = smoothstep(0.012, 0.0, abs(edge - progress)) * step(progress, 0.999) * step(0.001, progress);
  c = mix(c, vec3(0.95, 0.62, 0.32), line * 0.85);
  float ndl = clamp(dot(vN, normalize(vec3(-0.4, 0.6, 0.7))), 0.0, 1.0);
  float fres = pow(1.0 - clamp(dot(vN, vV), 0.0, 1.0), 2.5);
  c *= 0.82 + 0.22 * ndl;
  c = mix(c, vec3(1.0), fres * 0.35);
  gl_FragColor = vec4(c, opacity);
  #include <colorspace_fragment>
}`;

import {useImageTexture} from './Phone';
const useTex = (file: string) => useImageTexture(file);

export const Orb: React.FC<{
  room: string;
  x: number;
  y: number;
  z: number;
  r: number;
  spin: number; // degrees
  tilt?: number;
  progress: number; // 0 = clay viewport, 1 = final render
  ring?: number; // ring opacity
  opacity?: number;
}> = ({room, x, y, z, r, spin, tilt = 8, progress, ring = 1, opacity = 1}) => {
  const color = useTex(`clay/${room}_color.jpg`);
  const clay = useTex(`clay/${room}.jpg`);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VS,
        fragmentShader: FS,
        uniforms: {colorTex: {value: null}, clayTex: {value: null}, progress: {value: 0}, seed: {value: 0}, opacity: {value: 1}},
        transparent: true,
      }),
    [],
  );
  mat.uniforms.colorTex.value = color;
  mat.uniforms.clayTex.value = clay;
  mat.uniforms.progress.value = progress;
  mat.uniforms.seed.value = Math.floor(progress * 240);
  mat.uniforms.opacity.value = opacity;
  const d2r = Math.PI / 180;
  if (!color || !clay) return null;
  return (
    <group position={[x, -y, z]} rotation={[tilt * d2r, 0, -6 * d2r]}>
      <mesh rotation={[0, spin * d2r, 0]} material={mat}>
        <sphereGeometry args={[r, 128, 96]} />
      </mesh>
      {/* glass shell */}
      <mesh>
        <sphereGeometry args={[r * 1.012, 96, 64]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} metalness={0} clearcoat={1} transparent opacity={0.1 * opacity} envMapIntensity={2.5} depthWrite={false} />
      </mesh>
      {/* 360° orbit ring */}
      <mesh rotation={[Math.PI / 2 - 0.25, 0, 0]}>
        <torusGeometry args={[r * 1.18, r * 0.006, 12, 200]} />
        <meshPhysicalMaterial color="#5A4535" metalness={0.6} roughness={0.3} transparent opacity={ring * opacity} />
      </mesh>
    </group>
  );
};
