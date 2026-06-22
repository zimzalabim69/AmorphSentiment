// GLSL for the central "organism" blob. Vertex displacement via simplex noise
// gives the gooey morphing; the fragment stage adds fresnel glow + iridescent
// internal bands. Color and shape are driven by sentiment uniforms.

const SIMPLEX = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPositive;
uniform float uNegative;
uniform float uNeutral;
uniform float uIntensity;
uniform float uHover;
uniform float uPulse;
uniform float uShockwave;
uniform float uGlobalIntensity;
uniform float uVolume;
uniform float uAnomalyFlash;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vDisplacement;
varying vec3 vWorldPos;

${SIMPLEX}

// Combined displacement field at a point on the unit sphere.
float displace(vec3 p) {
  float t = uTime * 0.35;

  // Effective intensity: combines sentiment intensity with global live intensity
  float liveBoost = uGlobalIntensity * 0.6;
  float totalIntensity = min(uIntensity + liveBoost, 1.0);

  // Big soft bloom — dominant for positive sentiment.
  float bloom = snoise(p * 1.1 + vec3(0.0, 0.0, t));

  // Slow rolling waves — dominant for neutral sentiment.
  float waves = snoise(p * 1.8 + vec3(t * 0.6, 0.0, 0.0)) * 0.6
              + sin(p.y * 3.0 + uTime) * 0.15;

  // High-frequency spikes — dominant for negative sentiment.
  float spikes = abs(snoise(p * 3.6 + vec3(t * 1.8)));
  spikes = pow(spikes, 1.5) * 1.3;

  // Volume turbulence — more chaotic when many signals are flowing
  float volTurb = 0.0;
  if (uVolume > 0.01) {
    float v1 = snoise(p * 5.0 + vec3(uTime * 2.5, 0.0, 0.0));
    float v2 = snoise(p * 7.0 + vec3(0.0, uTime * 3.0, 0.0));
    volTurb = (v1 + v2) * 0.5 * uVolume * 0.6;
  }

  // Shockwave turbulence — triggered by sudden spikes in live data
  float shock = 0.0;
  if (uShockwave > 0.01) {
    float wave = sin(length(p) * 12.0 - uTime * 8.0) * 0.5 + 0.5;
    float highFreq = snoise(p * 8.0 + vec3(uTime * 3.0)) * 0.8;
    shock = (wave * 0.6 + highFreq * 0.4) * uShockwave;
  }

  // Anomaly flash — brief surface ripples
  float anomalyRipple = 0.0;
  if (uAnomalyFlash > 0.01) {
    float ripple = sin(length(p) * 15.0 - uTime * 10.0) * 0.5 + 0.5;
    anomalyRipple = ripple * uAnomalyFlash * 0.5;
  }

  float energy = 0.25 + totalIntensity * 1.1;
  float d =
      bloom  * (0.45 + uPositive * 0.9) * energy
    + waves  * (0.30 + uNeutral  * 0.8) * energy
    + spikes * (uNegative * 1.6) * energy
    + shock  * energy
    + volTurb * energy
    + anomalyRipple * energy;

  // Global breathing pulse — deeper at higher global intensity.
  d += uPulse * (0.12 + totalIntensity * 0.25);
  return d;
}

void main() {
  vec3 pos = normalize(position);

  float d = displace(pos);

  // Approximate the displaced normal by sampling neighbours along a tangent
  // basis so lighting/fresnel follows the gooey surface.
  float eps = 0.08;
  vec3 tangent = normalize(cross(pos, vec3(0.0, 1.0, 0.0) + 1e-4));
  vec3 bitangent = normalize(cross(pos, tangent));
  vec3 pA = normalize(pos + tangent * eps);
  vec3 pB = normalize(pos + bitangent * eps);
  vec3 displacedP  = pos * (1.0 + d * 0.35);
  vec3 displacedA  = pA  * (1.0 + displace(pA) * 0.35);
  vec3 displacedB  = pB  * (1.0 + displace(pB) * 0.35);
  vec3 newNormal = normalize(cross(displacedA - displacedP, displacedB - displacedP));

  vec3 displaced = displacedP * (1.0 + uHover * 0.06);

  vDisplacement = d;
  vNormal = normalize(normalMatrix * newNormal);

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldPos = displaced;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorGlow;
uniform vec3 uColorAccent;
uniform float uIntensity;
uniform float uHover;
uniform float uShockwave;
uniform float uGlobalIntensity;
uniform float uAnomalyFlash;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vDisplacement;
varying vec3 vWorldPos;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  float totalIntensity = min(uIntensity + uGlobalIntensity * 0.6, 1.0);

  float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 2.8);

  // Internal iridescent bands that ripple over time — more chaotic at high intensity.
  float bandSpeed = 1.2 + totalIntensity * 2.0;
  float bands = 0.5 + 0.5 * sin(vDisplacement * 10.0 - uTime * bandSpeed + vWorldPos.y * 2.5);

  vec3 base = mix(uColorCore, uColorAccent, bands * 0.7);
  vec3 color = mix(base, uColorGlow, fresnel);

  // Brighten the bloomed/raised areas — stronger bioluminescence.
  float lume = smoothstep(-0.3, 0.8, vDisplacement);
  color += uColorGlow * lume * (0.4 + totalIntensity * 0.7);

  // Rim glow + hover boost — deeper at high intensity.
  color += uColorGlow * fresnel * (0.7 + uHover * 1.0 + totalIntensity * 0.3);

  // Shockwave: brief hot-white flash on the surface.
  if (uShockwave > 0.01) {
    float shockGlow = uShockwave * smoothstep(0.3, 0.9, vDisplacement) * 1.5;
    color += vec3(1.0, 0.85, 0.6) * shockGlow;
  }

  // Anomaly flash: red-amber warning tint on raised areas.
  if (uAnomalyFlash > 0.01) {
    float flashGlow = uAnomalyFlash * smoothstep(0.2, 0.8, vDisplacement) * 0.8;
    color += vec3(1.0, 0.3, 0.1) * flashGlow;
  }

  // Subtle core darkening for depth.
  color *= 0.7 + 0.5 * fresnel + 0.2 * bands;

  gl_FragColor = vec4(color, 1.0);
}
`;
