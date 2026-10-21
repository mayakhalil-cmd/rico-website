import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks'
import { labAudio } from '../lab/audio'
import type { FieldColors } from '../prefs'

export type GLMode = 'prisms' | 'warp' | 'sdf'

const QUAD_VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
const PREC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`
const NOISE = `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; } return v; }
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t)); }
`

// ───────────────────────── WARP ─────────────────────────
const WARP_FS = PREC + NOISE + `
uniform vec2 uRes; uniform float uT; uniform vec2 uM; uniform float uVel; uniform float uDown;
uniform vec4 uC[4];
uniform float uBurst; uniform float uHue; uniform float uMono;
uniform float uSub; uniform float uKick; uniform float uPres; uniform float uOn;
uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform float uBright;

vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

// the cursor pulls and twists the field; each click melts the lines around it
vec2 bend(vec2 p, float asp){
  vec2 m = vec2(uM.x * asp, uM.y);
  vec2 d = p - m; float r2 = dot(d, d);
  p -= d * (0.15 + 0.35 * uVel + 0.25 * uDown) * exp(-r2 * 6.0);
  p = m + rot(p - m, (0.6 + 1.8 * uVel) * exp(-r2 * 9.0));
  for (int i = 0; i < 4; i++){
    vec4 c = uC[i];
    if (c.w > 0.5){
      vec2 cp = vec2(c.x * asp, c.y), cd = p - cp;
      float k = exp(-c.z * 1.4) * exp(-dot(cd, cd) * 2.2);
      vec2 wob = vec2(noise(p * 6.0 + uT * 2.5 + float(i) * 7.0), noise(p * 6.0 - uT * 2.5 + 3.0)) - 0.5;
      p = cp + rot(cd, k * 2.6 * sin(c.z * 5.0 + 1.0)) + wob * k * 0.4;
    }
  }
  return p;
}
// contour lines; every line gets its own thickness
float height(vec2 p, vec2 q){ return fbm(p * 1.3 + q * (1.6 + uBurst * 1.2) + vec2(0.0, uT * 0.06)); }
float field(vec2 p, out float n, out vec2 q){
  float t = uT * 0.06;
  q = vec2(fbm(p * 1.7 + t), fbm(p * 1.7 - t + 5.2));
  n = height(p, q);
  return 0.0;
}
// the lines with chromatic aberration on their edges: a red copy and a blue copy, slightly offset
vec3 lineRGB(float n){
  float s = n * (16.0 + 6.0 * uSub) - uT * 0.15;
  float w = min(0.44, mix(0.05, 0.2, pow(hash(vec2(floor(s), 3.1)), 1.3)) + 0.04 * uPres + 0.02 * uKick + 0.08 * (1.0 - uMono)); // thick shapes, so more of each one gets the chromatic edge
  float ca = 0.018 + 0.01 * uKick; // how far the red and blue copies drift apart
  float dr = abs(fract(s + ca) - 0.5), dg = abs(fract(s) - 0.5), db = abs(fract(s - ca) - 0.5);
  return vec3(1.0 - smoothstep(w - 0.02, w, dr), 1.0 - smoothstep(w - 0.02, w, dg), 1.0 - smoothstep(w - 0.02, w, db));
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = bend(vec2(uv.x * asp, uv.y), asp);
  // organic distortion: the whole field slowly oozes, like a liquid SDF
  p += (vec2(fbm(p * 2.3 + vec2(uT * 0.05, 0.0)), fbm(p * 2.3 + vec2(3.1, -uT * 0.05))) - 0.5) * 0.16;
  float n;
  vec2 q;
  field(p, n, q);
  vec3 lines = lineRGB(n);
  float L = lines.g;
  // clicks: the sheen swirls around the click point and a glint ring sweeps outward across the shapes
  float swirl = 0.0, glint = 0.0;
  vec2 sp0 = vec2(uv.x * asp, uv.y);
  for (int i = 0; i < 4; i++){
    vec4 c = uC[i];
    if (c.w > 0.5){
      vec2 cd = sp0 - vec2(c.x * asp, c.y);
      float r = length(cd), a = atan(cd.y, cd.x), fade = exp(-c.z * 1.1);
      swirl += sin(a * 3.0 - r * 18.0 + c.z * 8.0) * exp(-r * 2.5) * fade;
      glint += exp(-pow((r - c.z * 0.7) * 10.0, 2.0)) * fade * (0.6 + 0.4 * sin(a * 6.0 + c.z * 10.0));
    }
  }
  // ── iridescent = chromatic glass: a glossy black body, stacked rainbow bands that hug
  //    the edges, broad silver-lavender sheen, a hot white rim, and a grainy, scratched finish ──
  vec3 oil = vec3(0.0);
  if (uMono < 0.99){
    float e = 0.006;
    vec3 N = normalize(vec3((height(p + vec2(e, 0.0), q) - n) / e * 0.55, (height(p + vec2(0.0, e), q) - n) / e * 0.55, 1.0));
    float facing = N.z;
    // how far inside the shape we are: 0 at the edge, 1 in the middle
    float s = n * (16.0 + 6.0 * uSub) - uT * 0.15;
    float w = min(0.44, mix(0.05, 0.2, pow(hash(vec2(floor(s), 3.1)), 1.3)) + 0.04 * uPres + 0.02 * uKick + 0.08 * (1.0 - uMono)); // thick shapes, so more of each one gets the chromatic edge
    float inside = clamp((w - abs(fract(s) - 0.5)) / max(w, 1e-3), 0.0, 1.0);
    float edge = 1.0 - inside;
    // spectral bands running parallel to the edge (lavender, cyan, magenta, gold)
    float x = inside * 1.5 + n * 0.9 + (1.0 - facing) * 0.9 + uHue + swirl * 0.6;
    vec3 spec7 = 0.5 + 0.5 * cos(6.28318 * (x + vec3(0.0, 0.27, 0.58)));
    spec7.g *= 0.82; // lean toward violet, pink and cyan rather than green
    spec7 = mix(spec7, vec3(0.72, 0.66, 1.0), 0.1); // a touch of lavender, like the reference
    vec3 bands = pow(spec7, vec3(1.6)) * (0.12 + 1.5 * pow(edge, 1.3)) * 1.5;
    // broad, soft silver sheen where the surface faces the light
    float env = pow(0.5 + 0.5 * cos(6.28318 * (N.x * 0.9 + N.y * 0.6 + n * 0.8 + swirl * 0.5 + glint * 0.3)), 4.0);
    vec3 sheen = mix(vec3(0.62, 0.58, 1.0), vec3(1.0), env) * env * smoothstep(0.15, 0.7, inside) * 0.75;
    // a hot white line right on the edge, and a sharp highlight
    vec3 rimLine = vec3(1.0) * exp(-inside * 26.0) * 0.9;
    vec3 Lt = normalize(vec3(-0.45, 0.55, 0.7));
    float hl = pow(max(dot(N, normalize(Lt + vec3(0.0, 0.0, 1.0))), 0.0), 90.0);
    vec3 body = vec3(0.015, 0.012, 0.03); // glossy near-black glass
    oil = body + bands + sheen + rimLine + vec3(1.0) * hl * 1.3;
    // texture: fine grain and faint scratches, like a printed poster
    float grain = hash(gl_FragCoord.xy * 0.73 + floor(uT * 12.0));
    vec2 sp2 = vec2(dot(gl_FragCoord.xy, vec2(0.8, 0.6)), dot(gl_FragCoord.xy, vec2(-0.6, 0.8)));
    float scratch = step(0.985, noise(vec2(sp2.x * 0.02, sp2.y * 1.4))) * 0.5;
    oil *= 0.86 + 0.28 * grain;
    oil += scratch * 0.25 * (0.3 + edge);
  }
  vec3 shape = mix(oil, uColA, uMono);
  // a thin rim on the edges of each shape
  float rim = clamp(L * (1.0 - L) * 4.0, 0.0, 1.0);
  // faint hairline contours behind the shapes: the background field
  float s2 = n * 52.0 - uT * 0.3;
  float hair = 1.0 - smoothstep(0.0, 0.045, abs(fract(s2) - 0.5));
  vec3 bg = uColC * (hair * 0.1 + 0.035 * smoothstep(0.35, 0.9, n)) * uBright;
  bg += vec3(0.035, 0.03, 0.075) * (1.0 - uMono) * (0.6 + 0.4 * smoothstep(0.2, 0.8, n));
  vec3 o = bg * (1.0 - lines) + shape * lines * (1.05 + 0.2 * uBurst) + uColB * rim * mix(0.0, 0.9, uMono);
  o += mix(vec3(0.85, 0.8, 1.0), vec3(1.0), uMono) * glint * L * 1.1; // the glimmer
  o *= mix(0.6, 1.0, smoothstep(0.1, 0.6, uv.x));
  gl_FragColor = vec4(o, 1.0);
}`

const MAX_BLOBS = 12
const SDF_FS = PREC + NOISE + `
uniform vec2 uRes; uniform float uT; uniform vec3 uB[${MAX_BLOBS}]; uniform float uN;
uniform float uSub; uniform float uKick; uniform float uLfo; uniform float uBurst;
uniform vec2 uM; uniform float uPull; uniform float uVel; uniform vec4 uC[4]; uniform float uCD[4];
uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform float uBright;
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float scene(vec2 p){
  float d = 1e5;
  float k = 0.09 + 0.07 * uLfo;
  for (int i = 0; i < ${MAX_BLOBS}; i++){
    if (float(i) >= uN) break;
    vec3 b = uB[i];
    d = smin(d, length(p - b.xy) - b.z, k);
  }
  // organic skin: the surface breathes with slow noise
  d += (fbm(p * 3.0 + vec2(uT * 0.07, -uT * 0.05)) - 0.5) * (0.05 + 0.03 * uSub);
  return d;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float px = 1.0 / uRes.y;
  float d = scene(p);
  vec3 col = vec3(0.0);
  // ── the background distance lines ──
  float sp = 0.03;
  vec2 m = vec2(uM.x * asp, uM.y);
  float rm = length(p - m);
  // your cursor disrupts the field: lines wobble and thicken around it
  float dis = (uPull * 0.8 + uVel * 0.9) * exp(-rm * rm * 5.0);
  float q = d / sp + uT * 0.25 + (noise(p * 7.0 + uT * 0.8) - 0.5) * dis * 3.0;
  // clicks send a shockwave that travels along the field's own contours,
  // jumping outward one line at a time, with a fading trail behind it
  float wave = 0.0;
  for (int i = 0; i < 4; i++){
    vec4 c = uC[i];
    if (c.w > 0.5){
      vec2 cv = p - vec2(c.x * asp, c.y);
      float qc = uCD[i] / sp + uT * 0.25;          // the line you clicked on
      float steps = floor(c.z * 13.0);             // how many lines the wave has jumped
      float rel = abs(q - qc);
      float front = exp(-pow((rel - steps) / 0.55, 2.0));
      float trail = step(rel, steps) * exp(-(steps - rel) * 0.4);
      float loc = exp(-dot(cv, cv) / (0.015 + c.z * 0.55)); // spreads along the lines, not in a circle
      float amp = (front + trail * 0.45) * loc * exp(-c.z * 0.9);
      q += sin(rel * 3.14159 + c.z * 9.0) * front * loc * 0.25; // a little undulation on the front
      wave += amp;
    }
  }
  // every line gets its own thickness (1–4 px), thicker where the field is disturbed
  float wpx = mix(0.6, 3.6, pow(hash(vec2(floor(q + 0.5), 7.7)), 2.0)) + dis * 2.5 + wave * 3.0;
  float hw = 0.5 * wpx * px / sp, aa = px / sp;
  float ring = 1.0 - smoothstep(hw, hw + aa, abs(fract(q) - 0.5));
  float fade = max(exp(-max(d, 0.0) * 7.0), min(1.0, wave * 1.4 + dis * 0.6));
  col += uColC * ring * fade * 0.5 * uBright * (1.0 + wave * 1.5) * step(0.0, d);
  // ── inside the blobs: scanline fill + halftone dots ──
  float depth = clamp(-d / 0.12, 0.0, 1.0);
  float scan = step(0.5, fract(gl_FragCoord.y / (2.0 + 3.0 * (1.0 - depth))));
  col += uColA * step(d, 0.0) * (0.08 + 0.32 * scan * depth);
  vec2 hp = fract(gl_FragCoord.xy / 6.0) - 0.5;
  col += uColA * step(length(hp), 0.18 + 0.2 * depth) * step(d, -0.02) * 0.35;
  // ── the outline: crisp edge with a glow in the outline colour ──
  col = mix(col, mix(uColB, vec3(1.0), 0.45), 1.0 - smoothstep(0.0, 1.8 * px, abs(d)));
  col += uColB * exp(-abs(d) / (10.0 * px)) * (0.9 + 1.2 * uBurst + 0.6 * uKick);
  // grain so it never looks too clean
  col += (hash(gl_FragCoord.xy + fract(uT) * 100.0) - 0.5) * 0.05;
  col *= mix(0.65, 1.0, smoothstep(0.05, 0.5, uv.x));
  gl_FragColor = vec4(col, 1.0);
}`

const PRISM_VS = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uMVP; uniform mat4 uModel; uniform vec2 uOff; uniform float uJit; uniform float uSeed;
varying vec3 vN; varying float vZ;
void main(){
  vN = normalize((uModel * vec4(aNor, 0.0)).xyz);
  vec4 p = uMVP * vec4(aPos, 1.0);
  vec2 j = vec2(fract(sin(dot(aPos, vec3(12.9, 78.2, 37.7)) + uSeed) * 43758.5), fract(sin(dot(aPos, vec3(39.3, 11.1, 83.7)) + uSeed) * 24634.6)) - 0.5;
  p.xy += (uOff + j * uJit) * p.w;
  vZ = p.z; gl_Position = p;
}`
const PRISM_FS = PREC + `
varying vec3 vN; varying float vZ;
uniform float uAlpha; uniform float uHue; uniform float uEdge; uniform vec3 uTint;
void main(){
  float f = pow(1.0 - abs(vN.z), 1.6);
  vec3 deep = vec3(0.02, 0.10, 0.55), cyan = vec3(0.10, 0.85, 1.0), green = vec3(0.25, 1.0, 0.35), pink = vec3(0.95, 0.15, 0.65);
  vec3 c = mix(deep, cyan, f);
  c = mix(c, green, smoothstep(0.4, 1.0, vN.y) * 0.6);
  c = mix(c, pink, uHue * smoothstep(0.2, 1.0, -vN.x));
  float a = uAlpha * (0.35 + 0.9 * f) * clamp(1.4 - vZ * 0.08, 0.25, 1.0);
  gl_FragColor = vec4(c * (1.0 + uEdge) * uTint, a);
}`
const FADE_FS = PREC + 'uniform float uA; void main(){ gl_FragColor = vec4(0.0, 0.0, 0.0, uA); }'
const POST_FS = PREC + `
uniform sampler2D uTex; uniform vec2 uRes; uniform float uFlash; uniform float uT; uniform float uMirror;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float g = hash(vec2(floor(uv.y * 30.0), floor(uT * 20.0)));
  vec2 q = uv; q.x += (g - 0.5) * 0.1 * uFlash * step(0.6, g);
  vec2 dir = vec2(0.002 + 0.012 * uFlash, 0.0);
  vec3 c = vec3(texture2D(uTex, q + dir).r, texture2D(uTex, q).g, texture2D(uTex, q - dir).b);
  c += texture2D(uTex, vec2(1.0 - q.x, q.y)).rgb * uMirror;
  c *= 1.35 + uFlash * 0.6;
  // CRT: scanlines, a faint aperture-grille shimmer, grain and rolling flicker
  c *= 0.8 + 0.2 * sin(gl_FragCoord.y * 3.14159);
  c *= 0.94 + 0.06 * sin(gl_FragCoord.x * 2.094 + uT * 2.0);
  c += (hash(gl_FragCoord.xy + fract(uT * 7.0) * 311.0) - 0.5) * 0.09;
  c *= 0.97 + 0.03 * sin(uT * 50.0 + uv.y * 8.0);
  vec2 v = uv - 0.5; c *= 1.0 - dot(v, v) * 0.7;
  c *= mix(0.75, 1.0, smoothstep(0.05, 0.55, uv.x));
  gl_FragColor = vec4(c, 1.0);
}`

const hex3 = (h: string): [number, number, number] => {
  const v = parseInt(h.replace('#', ''), 16) || 0
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

const MAX_PIXELS = 1_000_000 

export default function HeroGL({ mode, mono = true, colors, onFail }: { mode: GLMode; mono?: boolean; colors?: FieldColors; onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const overlay = useRef<HTMLCanvasElement | null>(null)
  const monoRef = useRef(mono)
  const colorRef = useRef(colors)
  colorRef.current = colors
  monoRef.current = mono
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const maybe = canvas.getContext('webgl', { alpha: false, antialias: true, depth: false, stencil: false, preserveDrawingBuffer: false })
    if (!maybe || maybe.isContextLost()) { onFail(); return }
    const gl: WebGLRenderingContext = maybe

    const programs: WebGLProgram[] = [], shaders: WebGLShader[] = [], buffers: WebGLBuffer[] = []
    let target: { tex: WebGLTexture; fb: WebGLFramebuffer } | null = null

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) throw new Error('shader')
      gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'compile')
      shaders.push(s)
      return s
    }
    const program = (vs: string, fs: string) => {
      const p = gl.createProgram()
      if (!p) throw new Error('program')
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link')
      programs.push(p)
      return p
    }
    const buffer = (data: number[]) => {
      const b = gl.createBuffer()!
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
      buffers.push(b)
      return b
    }
    const tri = buffer([-1, -1, 3, -1, -1, 3])
    const drawQuad = (p: WebGLProgram) => {
      const loc = gl.getAttribLocation(p, 'p')
      gl.bindBuffer(gl.ARRAY_BUFFER, tri)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.disableVertexAttribArray(loc)
    }
    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)

    let w = 1, h = 1, scale = 1
    const ptr = { x: 0.7, y: 0.5, sx: 0.7, sy: 0.5, px: 0.7, py: 0.5, last: -10, down: 0, active: false }
    const clicks: { x: number; y: number; t: number; d: number }[] = []
    const lvl = { sub: 0, kick: 0, mid: 0, pres: 0, on: 0, vel: 0, down: 0, burst: 0, mono: monoRef.current ? 1 : 0, hue: 0, hueTarget: 0 }
    const cArr = new Float32Array(16)
    const cdArr = new Float32Array(4) 

    let warp: WebGLProgram | null = null, sdf: WebGLProgram | null = null
    let prism: WebGLProgram | null = null, fade: WebGLProgram | null = null, post: WebGLProgram | null = null
    let meshes: { b: WebGLBuffer; e: WebGLBuffer; n: number; en: number }[] = []

    try {
      if (mode === 'warp') warp = program(QUAD_VS, WARP_FS)
      else if (mode === 'sdf') sdf = program(QUAD_VS, SDF_FS)
      else {
        prism = program(PRISM_VS, PRISM_FS); fade = program(QUAD_VS, FADE_FS); post = program(QUAD_VS, POST_FS)
        meshes = [cube(1, 1, 1), triPrism(), tetra(), cube(0.35, 0.35, 2.2)].map((m) => ({
          b: buffer(m.tri), e: buffer(m.edges), n: m.tri.length / 6, en: m.edges.length / 6,
        }))
      }
    } catch {
      onFail(); return
    }

    // prisms
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const spawn = (z: number) => {
      const ax = [rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]
      const l = Math.hypot(ax[0], ax[1], ax[2]) || 1
      const half = 0.48 * (4 - z), asp = Math.max(1, w / h)
      return {
        x: rnd(-1, 1) * half * asp, y: rnd(-1, 1) * half, z,
        ax: ax.map((v) => v / l), ang: rnd(0, 6.28), spd: rnd(0.15, 0.6) * (Math.random() < 0.5 ? -1 : 1),
        s: rnd(0.35, 1.15), mesh: Math.floor(Math.random() * 4), hue: Math.random(),
      }
    }
    let shapes: ReturnType<typeof spawn>[] = []

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const cssPx = Math.max(1, r.width * r.height)
      scale = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / cssPx))
      w = Math.max(1, Math.round(r.width * scale)); h = Math.max(1, Math.round(r.height * scale))
      canvas.width = w; canvas.height = h
      if (mode === 'prisms' && !shapes.length) shapes = Array.from({ length: 38 }, () => spawn(rnd(-16, 1)))
      if (mode === 'prisms') {
        if (target) { gl.deleteTexture(target.tex); gl.deleteFramebuffer(target.fb) }
        const tex = gl.createTexture()!, fb = gl.createFramebuffer()!
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        target = { tex, fb }
      }
    }

    const setColors = (p: WebGLProgram, def: FieldColors) => {
      const c = colorRef.current ?? def
      gl.uniform3fv(U(p, 'uColA'), hex3(c.a)); gl.uniform3fv(U(p, 'uColB'), hex3(c.b)); gl.uniform3fv(U(p, 'uColC'), hex3(c.c))
      gl.uniform1f(U(p, 'uBright'), c.bright)
    }

    const drawWarp = (t: number) => {
      const p = warp!
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      gl.useProgram(p)
      gl.uniform2f(U(p, 'uRes'), w, h); gl.uniform1f(U(p, 'uT'), t)
      gl.uniform2f(U(p, 'uM'), ptr.sx, ptr.sy); gl.uniform1f(U(p, 'uVel'), lvl.vel); gl.uniform1f(U(p, 'uDown'), lvl.down)
      gl.uniform4fv(U(p, 'uC'), cArr)
      gl.uniform1f(U(p, 'uBurst'), lvl.burst); gl.uniform1f(U(p, 'uHue'), lvl.hue); gl.uniform1f(U(p, 'uMono'), lvl.mono)
      gl.uniform1f(U(p, 'uSub'), lvl.sub); gl.uniform1f(U(p, 'uKick'), lvl.kick)
      gl.uniform1f(U(p, 'uPres'), lvl.pres); gl.uniform1f(U(p, 'uOn'), lvl.on)
      setColors(p, { a: '#ffffff', b: '#ffffff', c: '#ffffff', bright: 0.6 })
      drawQuad(p)
    }

    const blobSeeds = Array.from({ length: 7 }, (_, i) => ({ fx: 0.05 + Math.random() * 0.08, fy: 0.04 + Math.random() * 0.07, px: Math.random() * 6.28, py: Math.random() * 6.28, r: 0.05 + Math.random() * 0.06, band: i % 6 }))
    const drops: { x: number; y: number; t: number }[] = []
    const bArr = new Float32Array(MAX_BLOBS * 3)
    const blobs: { x: number; y: number; r: number; id: string; kind: 'blob' | 'drop' | 'cursor' }[] = []
    
    const bpos = blobSeeds.map((_, i) => ({ x: NaN, y: NaN, vx: 0, vy: 0, k: 0.05 - i * 0.004 }))
    let pull = 0 
    const drawSdf = (t: number) => {
      const p = sdf!
      const asp = w / h, s = labAudio.sample()
      const still = t - ptr.last
      const want = !ptr.active ? 0 : still < 3 ? 1 : Math.max(0, 1 - (still - 3) / 2.5)
      pull += (want - pull) * (want > pull ? 0.08 : 0.02)
      blobs.length = 0
      const mx = ptr.sx * asp, my = ptr.sy
      blobSeeds.forEach((b, i) => {
        const wx = asp * (0.5 + 0.44 * Math.sin(t * b.fx + b.px) * Math.cos(t * b.fx * 0.37 + i))
        const wy = 0.5 + 0.38 * Math.sin(t * b.fy + b.py) * Math.cos(t * b.fy * 0.53 + i * 2.1)
        const bp = bpos[i]
        if (Number.isNaN(bp.x)) { bp.x = wx; bp.y = wy }
        
        const lead = i === 0 ? { x: mx, y: my } : bpos[i - 1]
        const fx = mx + (lead.x - mx) * 0.6, fy = my + (lead.y - my) * 0.6
        
        const und = 0.025 + 0.015 * Math.sin(t * 0.6 + i)
        const cx = fx + Math.cos(t * 0.8 + i * 1.7) * und, cy = fy + Math.sin(t * 0.9 + i * 1.3) * und
        const tx = wx + (cx - wx) * pull, ty = wy + (cy - wy) * pull
        bp.vx += (tx - bp.x) * bp.k; bp.vy += (ty - bp.y) * bp.k
        bp.vx *= 0.86; bp.vy *= 0.86
        bp.x += bp.vx; bp.y += bp.vy
        blobs.push({ x: bp.x, y: bp.y, r: b.r * (1 + 0.45 * (s[b.band] ?? 0)), id: `BLOB_${String(i + 1).padStart(2, '0')}`, kind: 'blob' })
      })
      
      if (pull < 0.6) for (let i = 0; i < blobSeeds.length; i++) for (let j = i + 1; j < blobSeeds.length; j++) {
        const A = bpos[i], B = bpos[j], dx = B.x - A.x, dy = B.y - A.y, dd = Math.hypot(dx, dy) || 1e-4
        const min = (blobs[i].r + blobs[j].r) * 1.1
        if (dd < min) { const f = (min - dd) * 0.02 * (1 - pull) / dd; A.vx -= dx * f; A.vy -= dy * f; B.vx += dx * f; B.vy += dy * f }
      }
      while (drops.length && t - drops[0].t > 7) drops.shift()
      if (ptr.active) blobs.push({ x: ptr.sx * asp, y: ptr.sy, r: 0.045 + 0.015 * pull, id: 'CURSOR', kind: 'cursor' })
      const n = Math.min(MAX_BLOBS, blobs.length)
      bArr.fill(0)
      for (let i = 0; i < n; i++) bArr.set([blobs[i].x, blobs[i].y, blobs[i].r], i * 3)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      gl.useProgram(p)
      gl.uniform2f(U(p, 'uRes'), w, h); gl.uniform1f(U(p, 'uT'), t)
      gl.uniform3fv(U(p, 'uB'), bArr); gl.uniform1f(U(p, 'uN'), n)
      gl.uniform1f(U(p, 'uSub'), lvl.sub); gl.uniform1f(U(p, 'uKick'), lvl.kick)
      gl.uniform1f(U(p, 'uLfo'), s[7] ?? 0.5); gl.uniform1f(U(p, 'uBurst'), lvl.burst)
      gl.uniform2f(U(p, 'uM'), ptr.sx, ptr.sy); gl.uniform1f(U(p, 'uPull'), pull); gl.uniform1f(U(p, 'uVel'), lvl.vel)
      gl.uniform4fv(U(p, 'uC'), cArr); gl.uniform1fv(U(p, 'uCD'), cdArr)
      setColors(p, { a: '#ffffff', b: '#3bff03', c: '#ffffff', bright: 1 })
      drawQuad(p)
      drawTracking(t)
    }

    const GLYPHS = '█▓▒░#@%&$/<>{}[]01'
    const GUESSES = ['CLASS: UNKNOWN', 'SIGNAL // OSC', 'MATCH 0.87', 'ENTITY ??', 'NOT ORGANIC', 'SOURCE: AUDIO', 'ID UNRESOLVED', 'PATTERN 7F3A']
    const seen = new Map<string, { t0: number; seed: number }>()
    const hashStr = (str: string) => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619); return (x >>> 0) / 4294967296 }
    const scramble = (txt: string, amount: number, t: number) =>
      txt.split('').map((ch, i) => (ch !== ' ' && ((i * 7.3 + Math.floor(t * 18)) % 10) / 10 < amount ? GLYPHS[(i * 13 + Math.floor(t * 24)) % GLYPHS.length] : ch)).join('')
    const censor = (txt: string, seed: number) => txt.split('').map((ch, i) => (ch !== ' ' && ((i + Math.floor(seed * 10)) % 3 !== 0) ? '█' : ch)).join('')
    const drawTracking = (t: number) => {
      const c = overlay.current, ctx = c?.getContext('2d')
      if (!c || !ctx) return
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1)
      if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr) }
      const W = c.width, H = c.height, asp = w / h
      ctx.clearRect(0, 0, W, H)
      const toX = (x: number) => (x / asp) * W, toY = (y: number) => (1 - y) * H
      const group = blobs.map((_, i) => i)
      const find = (i: number): number => (group[i] === i ? i : (group[i] = find(group[i])))
      for (let i = 0; i < blobs.length; i++) for (let j = i + 1; j < blobs.length; j++) {
        const a = blobs[i], b = blobs[j]
        if (Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * 1.15) group[find(i)] = find(j)
      }
      const boxes = new Map<number, { x0: number; y0: number; x1: number; y1: number; ids: string[]; cursor: boolean }>()
      blobs.forEach((b, i) => {
        if (b.r < 0.01) return
        const g = find(i), bx = boxes.get(g) ?? { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, ids: [], cursor: false }
        const pad = b.r * 1.25
        bx.x0 = Math.min(bx.x0, toX(b.x - pad)); bx.x1 = Math.max(bx.x1, toX(b.x + pad))
        bx.y0 = Math.min(bx.y0, toY(b.y + pad)); bx.y1 = Math.max(bx.y1, toY(b.y - pad))
        bx.ids.push(b.id); bx.cursor ||= b.kind === 'cursor'
        boxes.set(g, bx)
      })
      const LIGHT = '#9dff7a', BLUE = '#002cf8', BLUE_TXT = '#5c7cff'
      const centers: [number, number][] = []
      const live = new Set<string>()
      ctx.font = `${11 * dpr}px 'Courier Prime', monospace`
      let k = 0
      for (const bx of boxes.values()) {
        const key = bx.ids.slice().sort().join('+')
        live.add(key)
        if (!seen.has(key)) seen.set(key, { t0: t, seed: hashStr(key) })
        const st = seen.get(key)!, age = t - st.t0, merged = bx.ids.length > 1       
        const cyc = (age + st.seed * 7) % 7
        const hiding = !bx.cursor && age > 3 && cyc > 5.6
        const col = bx.cursor ? BLUE_TXT : merged ? '#ffffff' : LIGHT
        const lock = Math.min(1, age / 0.28)
        const grow = (1 - lock) * 0.6 + (hiding ? 0.08 * Math.sin(t * 40) : 0)
        const jx = hiding ? (Math.sin(t * 53 + st.seed * 9) * 6) * dpr : 0
        const cw = bx.x1 - bx.x0, chh = bx.y1 - bx.y0
        const x0 = bx.x0 - cw * grow / 2 + jx, x1 = bx.x1 + cw * grow / 2 + jx
        const y0 = bx.y0 - chh * grow / 2, y1 = bx.y1 + chh * grow / 2
        if (!(hiding && Math.sin(t * 30) > 0.3)) { // flicker the lock while hiding
          const arm = Math.min(16 * dpr, (x1 - x0) / 3)
          ctx.strokeStyle = col; ctx.lineWidth = 1.5 * dpr
          ctx.beginPath()
          for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]]) {
            ctx.moveTo(x + sx * arm, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * arm)
          }
          ctx.stroke()
        }
        const cx = (bx.x0 + bx.x1) / 2, cy = (bx.y0 + bx.y1) / 2
        centers.push([cx, cy])
        if (hiding) {
          const prog = Math.min(1, (cyc - 5.6) / 0.35)
          const bh = Math.max(14 * dpr, chh * 0.32), by = cy - bh / 2 + Math.sin(st.seed * 20) * chh * 0.15
          const bw = cw * 0.9 * prog
          ctx.fillStyle = '#000'; ctx.fillRect(bx.x0 + cw * 0.05, by, bw, bh)
          ctx.strokeStyle = BLUE; ctx.lineWidth = 2 * dpr; ctx.strokeRect(bx.x0 + cw * 0.05, by, bw, bh)
          ctx.fillStyle = BLUE_TXT
          if (prog > 0.7) ctx.fillText('[REDACTED]', bx.x0 + cw * 0.05 + 6 * dpr, by + bh / 2 + 4 * dpr)
        } else {
          ctx.fillStyle = col
          ctx.fillRect(cx - 2 * dpr, cy - 2 * dpr, 4 * dpr, 4 * dpr) // centroid
        }
        const id = bx.cursor ? 'CURSOR' : merged ? `MERGE ×${bx.ids.length}` : bx.ids[0]
        let top: string
        if (age < 0.35) top = scramble(`ACQUIRING ${id}`, 1 - age / 0.35 + 0.2, t)
        else if (age < 1.1) {
          const pct = Math.min(99, Math.floor(((age - 0.35) / 0.75) * 100))
          const bars = Math.floor(pct / 20)
          top = `ANALYZING ${'▮'.repeat(bars)}${'▯'.repeat(5 - bars)} ${pct}%`
        } else top = `${id} · ${bx.cursor ? 'YOU' : GUESSES[Math.floor(st.seed * GUESSES.length + age / 7) % GUESSES.length]}`
        if (hiding) top = censor(top, st.seed + Math.floor(t * 6) * 0.1)
        ctx.fillStyle = hiding ? BLUE_TXT : col
        ctx.fillText(top, x0, y0 - 6 * dpr)
        const area = (cw * chh) / (W * H)
        let bottom = `x ${(cx / W).toFixed(2)} y ${(cy / H).toFixed(2)} a ${area.toFixed(3)}`
        if (age < 1.1) bottom = scramble(bottom, 0.5, t)
        if (hiding) bottom = censor(bottom, st.seed)
        ctx.globalAlpha = 0.75
        ctx.fillText(bottom, x0, y1 + 14 * dpr)
        ctx.globalAlpha = 1
        k++
      }
      for (const key of seen.keys()) if (!live.has(key)) seen.delete(key)
      ctx.strokeStyle = 'rgba(157, 255, 122, 0.25)'; ctx.lineWidth = 1 * dpr
      ctx.setLineDash([3 * dpr, 5 * dpr]); ctx.lineDashOffset = -t * 20
      ctx.beginPath()
      centers.forEach(([x, y], i) => {
        let best = -1, bd = 1e9
        centers.forEach(([x2, y2], j) => { const dd = Math.hypot(x - x2, y - y2); if (j !== i && dd < bd) { bd = dd; best = j } })
        if (best >= 0) { ctx.moveTo(x, y); ctx.lineTo(centers[best][0], centers[best][1]) }
      })
      ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.fillText(`tracking: ${k}  ·  frame ${Math.floor(t * 60)}`, W - 230 * dpr, 92 * dpr)
    }

    const drawPrisms = (t: number, dt: number) => {
      if (!target || !prism || !fade || !post) return
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb)
      gl.viewport(0, 0, w, h)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(fade)
      gl.uniform1f(U(fade, 'uA'), 0.18)
      drawQuad(fade)

      gl.blendFunc(gl.SRC_ALPHA, gl.ONE) // additive glass
      gl.useProgram(prism)
      const aPos = gl.getAttribLocation(prism, 'aPos'), aNor = gl.getAttribLocation(prism, 'aNor')
      const proj = perspective(0.9, w / h, 0.1, 40)
      const view = mul(rotX((ptr.sy - 0.5) * 0.5), rotY((ptr.sx - 0.5) * 0.8))
      const pv = mul(proj, view)
      const speed = 1 + lvl.mid * 2 + lvl.burst * 4
      const glitch = lvl.burst
      const seed = Math.floor(t * 18) 
      gl.uniform1f(U(prism, 'uSeed'), seed)
      for (const sh of shapes) {
        sh.z += dt * (0.7 + lvl.sub * 1.5 + lvl.burst * 6)
        sh.ang += dt * sh.spd * speed
        if (sh.z > 1.5) Object.assign(sh, spawn(-16))
        const sc = sh.s * (1 + lvl.kick * 0.35 + lvl.burst * 0.3)
        const model = mul(translate(sh.x, sh.y, sh.z - 4), mul(axisAngle(sh.ax, sh.ang), scaleM(sc)))
        const m = meshes[sh.mesh]
        gl.uniformMatrix4fv(U(prism, 'uMVP'), false, mul(pv, model))
        gl.uniformMatrix4fv(U(prism, 'uModel'), false, model)
        gl.uniform1f(U(prism, 'uHue'), lvl.on > 0.4 || lvl.burst > 0.3 ? 1 : sh.hue > 0.82 ? 0.7 : 0)
        gl.enableVertexAttribArray(aPos); gl.enableVertexAttribArray(aNor)
        gl.bindBuffer(gl.ARRAY_BUFFER, m.b)
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 24, 12)
        gl.uniform2f(U(prism, 'uOff'), 0, 0); gl.uniform1f(U(prism, 'uJit'), 0); gl.uniform3f(U(prism, 'uTint'), 1, 1, 1)
        gl.uniform1f(U(prism, 'uAlpha'), 0.1 + lvl.pres * 0.06); gl.uniform1f(U(prism, 'uEdge'), 0)
        gl.drawArrays(gl.TRIANGLES, 0, m.n)
        gl.bindBuffer(gl.ARRAY_BUFFER, m.e)
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 24, 12)
        gl.uniform1f(U(prism, 'uAlpha'), 0.5 + lvl.kick * 0.4); gl.uniform1f(U(prism, 'uEdge'), 0.6)
        gl.uniform1f(U(prism, 'uJit'), glitch * 0.05 * (Math.sin(seed * 12.9 + sh.hue * 40) > 0.2 ? 1 : 0.25))
        gl.drawArrays(gl.LINES, 0, m.en)
        if (glitch > 0.05) {
          const off = glitch * 0.025 * (1 + Math.sin(seed * 7.1 + sh.hue * 30))
          gl.uniform2f(U(prism, 'uOff'), off, off * 0.3); gl.uniform3f(U(prism, 'uTint'), 1.6, 0.25, 1.0)
          gl.drawArrays(gl.LINES, 0, m.en)
          gl.uniform2f(U(prism, 'uOff'), -off, -off * 0.2); gl.uniform3f(U(prism, 'uTint'), 0.2, 1.4, 1.6)
          gl.drawArrays(gl.LINES, 0, m.en)
        }
        gl.disableVertexAttribArray(aPos); gl.disableVertexAttribArray(aNor)
      }
      gl.disable(gl.BLEND)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      gl.useProgram(post)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, target.tex)
      gl.uniform1i(U(post, 'uTex'), 0)
      gl.uniform2f(U(post, 'uRes'), w, h); gl.uniform1f(U(post, 'uT'), t)
      gl.uniform1f(U(post, 'uMirror'), 0.22)
      gl.uniform1f(U(post, 'uFlash'), Math.max(lvl.burst, lvl.on * 0.4))
      drawQuad(post)
    }

    const frame = (t: number, dt: number) => {
      const s = labAudio.sample()
      lvl.sub += (s[0] - lvl.sub) * 0.3
      lvl.kick += (s[1] - lvl.kick) * 0.4
      lvl.mid += (s[3] - lvl.mid) * 0.3
      lvl.pres += (s[4] - lvl.pres) * 0.3
      lvl.on = Math.max(s[6], lvl.on * 0.9)
      if (s[6] > 0.6 && lvl.burst < 0.3) lvl.burst = 0.4 // every kick gives a small burst / glitch
      const idle = !ptr.active || t - ptr.last > 3
      const tx = idle ? 0.66 + 0.2 * Math.sin(t * 0.43) : ptr.x
      const ty = idle ? 0.5 + 0.28 * Math.sin(t * 0.31 + 1.3) : ptr.y
      ptr.px = ptr.sx; ptr.py = ptr.sy
      const k = idle ? 0.04 : 0.45
      ptr.sx += (tx - ptr.sx) * k; ptr.sy += (ty - ptr.sy) * k
      const v = Math.hypot(ptr.sx - ptr.px, ptr.sy - ptr.py) / Math.max(dt, 0.008) * 0.12
      lvl.vel += (Math.min(1.5, v) - lvl.vel) * 0.25
      lvl.down += ((ptr.down ? 1 : 0) - lvl.down) * 0.15
      while (clicks.length > 4) clicks.shift()
      cArr.fill(0)
      clicks.forEach((c, i) => { const age = t - c.t; if (age < 3) { cArr.set([c.x, c.y, age, 1], i * 4); cdArr[i] = c.d } })
      lvl.mono += ((monoRef.current ? 1 : 0) - lvl.mono) * 0.1
      lvl.hue += (lvl.hueTarget - lvl.hue) * 0.06
      if (mode === 'warp') drawWarp(t)
      else if (mode === 'sdf') drawSdf(t)
      else drawPrisms(t, dt)
      lvl.burst *= 0.93
    }

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, inside: e.clientY >= r.top && e.clientY <= r.bottom }
    }
    const t0 = performance.now()
    const now = () => (performance.now() - t0) / 1000
    const onMove = (e: PointerEvent) => {
      const p = local(e)
      ptr.active = p.inside
      if (!p.inside) return
      ptr.x = p.x; ptr.y = p.y; ptr.last = now()
    }
    const onDown = (e: PointerEvent) => {
      const p = local(e)
      if (!p.inside || (e.target as Element | null)?.closest('a, button, input, select')) return
      ptr.down = 1; ptr.active = true; ptr.x = p.x; ptr.y = p.y; ptr.last = now()
      let d = 1e5
      const asp = w / h
      for (const b of blobs) {
        const di = Math.hypot(p.x * asp - b.x, p.y - b.y) - b.r, k = 0.12
        const hh = Math.min(1, Math.max(0, 0.5 + 0.5 * (di - d) / k))
        d = di * (1 - hh) + d * hh - k * hh * (1 - hh)
      }
      clicks.push({ x: p.x, y: p.y, t: now(), d: d > 1e4 ? 0 : d })
      lvl.burst = 1
      lvl.hueTarget += 0.15 + Math.random() * 0.3 
    }
    const onUp = () => { ptr.down = 0 }
    const onLeave = () => { ptr.active = false; ptr.down = 0 }
    const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); onFail() }

    let raf = 0, visible = true, last = performance.now()
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden) { last = ts; return }
      const dt = Math.min(0.05, (ts - last) / 1000)
      last = ts
      frame((ts - t0) / 1000, dt)
    }

    function free() {
      if (target) { gl.deleteTexture(target.tex); gl.deleteFramebuffer(target.fb) }
      programs.forEach((p) => gl.deleteProgram(p)); shaders.forEach((s) => gl.deleteShader(s))
      buffers.forEach((b) => gl.deleteBuffer(b))
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    canvas.addEventListener('webglcontextlost', onLost)

    if (reduced) {
      for (let i = 0; i < 60; i++) frame(2 + i / 30, 1 / 30) 
      return () => { ro.disconnect(); canvas.removeEventListener('webglcontextlost', onLost); free() }
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('webglcontextlost', onLost)
      free()
    }
  }, [mode, reduced, onFail])

  return (
    <>
      <canvas ref={ref} className="ascii-field" aria-hidden="true" />
      {mode === 'sdf' && <canvas ref={overlay} className="ascii-field track-overlay" aria-hidden="true" />}
    </>
  )
}

type V3 = [number, number, number]
function faceList(faces: V3[][]) {
  const tri: number[] = [], edges: number[] = []
  for (const f of faces) {
    const [a, b, c] = f
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const l = Math.hypot(n[0], n[1], n[2]) || 1
    const nn = n.map((x) => x / l)
    for (let i = 1; i < f.length - 1; i++) for (const p of [f[0], f[i], f[i + 1]]) tri.push(...p, ...nn)
    for (let i = 0; i < f.length; i++) edges.push(...f[i], ...nn, ...f[(i + 1) % f.length], ...nn)
  }
  return { tri, edges }
}
function cube(sx: number, sy: number, sz: number) {
  const x = sx / 2, y = sy / 2, z = sz / 2
  const P: V3[] = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]
  return faceList([[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]].map((f) => f.map((i) => P[i])))
}
function triPrism() {
  const h = 0.6, P: V3[] = [[-0.6, -0.4, -h], [0.6, -0.4, -h], [0, 0.6, -h], [-0.6, -0.4, h], [0.6, -0.4, h], [0, 0.6, h]]
  return faceList([[0, 2, 1], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]].map((f) => f.map((i) => P[i])))
}
function tetra() {
  const P: V3[] = [[0.7, 0.7, 0.7], [-0.7, -0.7, 0.7], [-0.7, 0.7, -0.7], [0.7, -0.7, -0.7]]
  return faceList([[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]].map((f) => f.map((i) => P[i])))
}
type M4 = Float32Array
const ident = (): M4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
    o[c * 4 + r] = s
  }
  return o
}
function perspective(fov: number, asp: number, n: number, f: number): M4 {
  const t = 1 / Math.tan(fov / 2), m = new Float32Array(16)
  m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f)
  return m
}
function translate(x: number, y: number, z: number): M4 { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m }
function scaleM(s: number): M4 { const m = ident(); m[0] = s; m[5] = s; m[10] = s; return m }
function rotX(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m }
function rotY(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m }
function axisAngle([x, y, z]: number[], a: number): M4 {
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c
  return new Float32Array([
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ])
}
