import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';

const VERTEX = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/**
 * Drops on a pane of glass: each cell grows a drop, lets it slide with a thin
 * trail and wipes it away. Transparent where there is no drop, so the page shows
 * through; the highlight and the dark rim are what make it read as water.
 */
const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uAmount;
uniform float uDark;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// One layer of drops on a grid of the given density; returns premultiplied rgba.
vec4 layer(vec2 uv, float cells, float seed) {
  vec2 g = uv * cells;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float n = hash(id + seed);
  if (n > uAmount) return vec4(0.0);

  float life = fract(uTime * (0.045 + 0.03 * hash(id + seed + 7.0)) + hash(id + seed + 3.0));
  float grow = smoothstep(0.0, 0.22, life);
  float fade = 1.0 - smoothstep(0.86, 1.0, life);
  vec2 start = vec2((hash(id + seed + 1.0) - 0.5) * 0.5, 0.18 + (hash(id + seed + 2.0) - 0.5) * 0.2);
  float slide = pow(smoothstep(0.25, 1.0, life), 2.2) * 0.62;
  vec2 c = vec2(start.x + sin(life * 18.0 + n * 6.0) * 0.015 * smoothstep(0.25, 1.0, life), start.y - slide);

  float r = (0.075 + 0.05 * hash(id + seed + 5.0)) * grow;
  vec2 d = f - c;
  float dist = length(d * vec2(1.0, 0.92));

  float body = smoothstep(r, r * 0.72, dist);
  float rim = smoothstep(r * 0.72, r * 0.9, dist) * (1.0 - smoothstep(r * 0.9, r, dist));
  vec2 hl = d - vec2(-r * 0.3, r * 0.3);
  float spec = smoothstep(r * 0.32, 0.0, length(hl));

  float inTrail = step(c.y, f.y) * step(f.y, start.y) * smoothstep(r * 0.4, 0.0, abs(f.x - c.x)) * smoothstep(0.25, 0.55, life);

  // A drop is a small lens: the bottom edge gathers light (caustic), the top edge is dark, a bright speck sits up-left.
  vec2 nrm = d / max(r, 0.0001);
  float caustic = smoothstep(0.35, 1.0, length(nrm)) * smoothstep(0.0, 0.8, -nrm.y) * body;
  float topShade = smoothstep(0.2, 1.0, nrm.y) * body;

  vec3 tint = mix(vec3(0.20, 0.27, 0.42), vec3(0.74, 0.82, 0.96), uDark);
  float a = (body * 0.2 + topShade * 0.18 + rim * 0.5 + inTrail * 0.1) * fade;
  vec3 col = tint * a + vec3(1.0) * (spec * 0.7 * body + caustic * 0.4) * fade;
  return vec4(col, clamp(a + (spec * 0.6 + caustic * 0.3) * body * fade, 0.0, 1.0));
}

// Fine mist: many tiny drops that come and go slowly, so the glass is never perfectly clean.
vec4 mist(vec2 uv) {
  vec2 g = uv * 80.0;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float n = hash(id + 91.0);
  if (n > 0.38 * uAmount + 0.1) return vec4(0.0);
  vec2 c = (vec2(hash(id + 3.0), hash(id + 5.0)) - 0.5) * 0.5;
  float r = 0.06 + 0.1 * hash(id + 8.0);
  float pulse = 0.5 + 0.5 * sin(uTime * 0.25 + n * 40.0);
  float body = smoothstep(r, r * 0.6, length(f - c)) * pulse;
  vec3 tint = mix(vec3(0.20, 0.27, 0.42), vec3(0.8, 0.88, 1.0), uDark);
  float a = body * 0.35;
  return vec4(tint * a + vec3(1.0) * body * 0.12, a);
}

void main() {
  vec2 uv = vUv;
  uv.x *= uRes.x / uRes.y;
  vec4 acc = layer(uv, 9.0, 0.0);
  vec4 b = layer(uv + 0.37, 17.0, 11.0);
  acc = acc + b * (1.0 - acc.a);
  vec4 m = mist(uv);
  acc = acc + m * (1.0 - acc.a);
  gl_FragColor = acc;
}
`;

/**
 * Rain on the glass over the top of the page (the header and the sky, never
 * over the cards). Loaded lazily, only for the full level on a desktop when it
 * rains; if WebGL is unavailable it draws nothing.
 */
export default function GlassShader({ amount, dark }: { amount: number; dark: boolean }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<{ uAmount: { value: number }; uDark: { value: number } } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, webgl: 1, dpr: 0.75, antialias: false });
    } catch {
      return;
    }
    const { gl } = renderer;
    if (!gl) return;
    gl.canvas.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: [1, 1] },
      uAmount: { value: amount },
      uDark: { value: dark ? 1 : 0 },
    };
    uniformsRef.current = uniforms;
    const program = new Program(gl, { vertex: VERTEX, fragment: FRAGMENT, uniforms, transparent: true, depthTest: false });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      uniforms.uRes.value = [host.clientWidth, host.clientHeight];
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      uniforms.uTime.value = (now - start) / 1000;
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      uniformsRef.current = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      gl.canvas.remove();
    };
    // Created once; amount and theme are pushed through the uniforms below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;
    u.uAmount.value = amount;
    u.uDark.value = dark ? 1 : 0;
  }, [amount, dark]);

  return <div ref={hostRef} className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[260px]" aria-hidden />;
}
