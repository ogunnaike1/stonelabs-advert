import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * True rectilinear view into an equirectangular 360° render.
 * Every pixel casts a ray (yaw / pitch / vertical FOV) and samples the panorama, so straight
 * architectural lines stay straight — no stretched flat-image pans. Yaw velocity feeds a short
 * angular motion-blur so whip-pans between rooms read as a real camera turn.
 */

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex;
uniform float yaw, pitch, tanV, aspect, blur, lod, zoomBlur;
const float PI = 3.14159265359;
vec3 sampleDir(float y, float tv){
  vec3 f = vec3(sin(y)*cos(pitch), sin(pitch), cos(y)*cos(pitch));
  vec3 r = normalize(vec3(cos(y), 0.0, -sin(y)));
  vec3 u = cross(f, r);
  vec2 s = (uv * 2.0 - 1.0) * vec2(tv * aspect, tv);
  vec3 d = normalize(f + s.x * r + s.y * u);
  float lon = atan(d.x, d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  vec2 t = vec2(fract(lon / (2.0 * PI) + 0.5), 0.5 + lat / PI);
  return textureLod(tex, t, lod).rgb;
}
void main(){
  const int N = 14;
  if (blur < 0.0004 && zoomBlur < 0.001) { o = vec4(sampleDir(yaw, tanV), 1.0); return; }
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < N; i++) {
    float k = float(i) / float(N - 1) - 0.5;
    float w = 1.0 - abs(k) * 1.2;
    // angular (whip) blur along yaw + radial (push-in) blur along field of view
    acc += sampleDir(yaw + k * blur, tanV * (1.0 - (k + 0.5) * zoomBlur)) * w; wsum += w;
  }
  o = vec4(acc / wsum, 1.0);
}`;

type View = {yawDeg: number; pitchDeg: number; vfovDeg: number; blurDeg?: number; zoomBlur?: number};

const cache = new Map<string, Promise<HTMLImageElement>>();
const loadImage = (src: string) => {
  if (!cache.has(src)) {
    cache.set(
      src,
      new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      }),
    );
  }
  return cache.get(src)!;
};

export const Panorama: React.FC<{
  file: string;
  view: View;
  width: number; // CSS size
  height: number;
  pixelScale?: number; // backing-store multiplier (render sharp under camera zoom)
  style?: React.CSSProperties;
}> = ({file, view, width, height, pixelScale = 1, style}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gl = useRef<{ctx: WebGL2RenderingContext; prog: WebGLProgram; texW: number} | null>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`pano ${file}`));
  const released = useRef(false);
  const pw = Math.round(width * pixelScale);
  const ph = Math.round(height * pixelScale);

  useEffect(() => {
    let alive = true;
    loadImage(staticFile(`panos/${file}`)).then((img) => {
      if (!alive || !canvas.current) return;
      const ctx = canvas.current.getContext('webgl2', {preserveDrawingBuffer: true, antialias: false})!;
      const sh = (type: number, src: string) => {
        const s = ctx.createShader(type)!;
        ctx.shaderSource(s, src);
        ctx.compileShader(s);
        if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) throw new Error(ctx.getShaderInfoLog(s) ?? 'shader');
        return s;
      };
      const prog = ctx.createProgram()!;
      ctx.attachShader(prog, sh(ctx.VERTEX_SHADER, VS));
      ctx.attachShader(prog, sh(ctx.FRAGMENT_SHADER, FS));
      ctx.linkProgram(prog);
      ctx.useProgram(prog);
      const buf = ctx.createBuffer();
      ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
      ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), ctx.STATIC_DRAW);
      const loc = ctx.getAttribLocation(prog, 'p');
      ctx.enableVertexAttribArray(loc);
      ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
      const tex = ctx.createTexture();
      ctx.bindTexture(ctx.TEXTURE_2D, tex);
      ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, true);
      ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, img);
      ctx.generateMipmap(ctx.TEXTURE_2D);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR_MIPMAP_LINEAR);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.REPEAT);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
      gl.current = {ctx, prog, texW: img.naturalWidth};
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [file]);

  useLayoutEffect(() => {
    const g = gl.current;
    if (!ready || !g) return;
    const {ctx, prog, texW} = g;
    ctx.viewport(0, 0, pw, ph);
    const u = (n: string) => ctx.getUniformLocation(prog, n);
    const d2r = Math.PI / 180;
    const tanV = Math.tan((view.vfovDeg * d2r) / 2);
    // texels per output pixel at screen centre → mip level (no seam: explicit LOD)
    const texelsPerPx = ((texW / (2 * Math.PI)) * 2 * tanV) / ph;
    ctx.uniform1f(u('yaw'), view.yawDeg * d2r);
    ctx.uniform1f(u('pitch'), view.pitchDeg * d2r);
    ctx.uniform1f(u('tanV'), tanV);
    ctx.uniform1f(u('aspect'), pw / ph);
    ctx.uniform1f(u('blur'), (view.blurDeg ?? 0) * d2r);
    ctx.uniform1f(u('zoomBlur'), view.zoomBlur ?? 0);
    ctx.uniform1f(u('lod'), Math.max(0, Math.log2(texelsPerPx) - 0.25));
    ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);
    ctx.finish();
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  });

  return <canvas ref={canvas} width={pw} height={ph} style={{width, height, display: 'block', ...style}} />;
};
