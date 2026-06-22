"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fragmentShader, vertexShader } from "./blobShader";
import { SENTIMENT_COLORS } from "@/lib/sentiment";
import { useAppStore } from "@/lib/store";
import { useBatcaveStore } from "@/lib/batcave-store";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function Blob() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const hoverTarget = useRef(0);
  const shockwaveDecay = useRef(0);
  const prevIntensity = useRef(0);
  const anomalyFlash = useRef(0);

  const result = useAppStore((s) => s.result);
  const phase = useAppStore((s) => s.phase);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPositive: { value: 0.33 },
      uNegative: { value: 0.33 },
      uNeutral: { value: 0.34 },
      uIntensity: { value: 0.4 },
      uHover: { value: 0 },
      uPulse: { value: 0 },
      uShockwave: { value: 0 },
      uGlobalIntensity: { value: 0 },
      uVolume: { value: 0 },
      uAnomalyFlash: { value: 0 },
      uColorCore: { value: new THREE.Color(SENTIMENT_COLORS.neutral.core) },
      uColorGlow: { value: new THREE.Color(SENTIMENT_COLORS.neutral.glow) },
      uColorAccent: { value: new THREE.Color(SENTIMENT_COLORS.neutral.accent) },
    }),
    [],
  );

  const targetCore = useMemo(() => new THREE.Color(), []);
  const targetGlow = useMemo(() => new THREE.Color(), []);
  const targetAccent = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const u = uniforms;
    u.uTime.value = state.clock.elapsedTime;

    // Read live batcave intensity (non-reactive read per frame)
    const batState = useBatcaveStore.getState();
    const globalIntensity = batState.globalIntensity;
    const batcaveMode = batState.batcaveMode;
    const hyperFocusActive = batState.hyperFocus.active;

    // Detect sudden intensity spike → trigger shockwave
    if (globalIntensity - prevIntensity.current > 0.2) {
      shockwaveDecay.current = 1.0;
    }
    prevIntensity.current = globalIntensity;
    shockwaveDecay.current = Math.max(0, shockwaveDecay.current - delta * 2.0);

    // Anomaly flash from store
    const anomalies = batState.anomalies;
    const latestAnomaly = anomalies[0];
    if (latestAnomaly && Date.now() - latestAnomaly.timestamp < 3000) {
      anomalyFlash.current = 1.0;
    }
    anomalyFlash.current = Math.max(0, anomalyFlash.current - delta * 3.0);

    u.uShockwave.value = lerp(u.uShockwave.value, shockwaveDecay.current, Math.min(1, delta * 8));
    u.uGlobalIntensity.value = lerp(u.uGlobalIntensity.value, globalIntensity, Math.min(1, delta * 3));
    u.uAnomalyFlash.value = lerp(u.uAnomalyFlash.value, anomalyFlash.current, Math.min(1, delta * 6));

    // While analyzing, agitate the organism toward a churning, high-energy state.
    const analyzing = phase === "analyzing";

    // In batcave mode, derive sentiment from live aggregates
    let scores = result?.scores ?? { positive: 0.33, negative: 0.33, neutral: 0.34 };
    let intensity = analyzing ? 1.0 : (result?.intensity ?? 0.4);
    let dominant = result?.dominant ?? "neutral";

    let volumeNorm = 0;
    if (batcaveMode) {
      const agg = useBatcaveStore.getState().aggregates;
      const activeWindow = useBatcaveStore.getState().activeWindow;
      const active = agg.find((a) => a.window === activeWindow);
      if (active && active.volume > 0) {
        scores = active.scores;
        intensity = active.intensity;
        dominant = active.dominant;
        volumeNorm = Math.min(1, active.volume / 40); // normalize: 40 signals = full turbulence
      }
    }

    const k = Math.min(1, delta * 2.2);
    u.uPositive.value = lerp(u.uPositive.value, analyzing ? 0.5 : scores.positive, k);
    u.uNegative.value = lerp(u.uNegative.value, analyzing ? 0.6 : scores.negative, k);
    u.uNeutral.value = lerp(u.uNeutral.value, analyzing ? 0.5 : scores.neutral, k);
    u.uIntensity.value = lerp(u.uIntensity.value, intensity, k);
    u.uVolume.value = lerp(u.uVolume.value, volumeNorm, Math.min(1, delta * 2));

    // Breathing pulse — faster + stronger while analyzing or high global intensity.
    // HyperFocus amplifies everything
    const focusBoost = hyperFocusActive ? 1.5 : 1.0;
    const pulseSpeed = analyzing ? 6.0 : (1.4 + globalIntensity * 2.0) * focusBoost;
    u.uPulse.value = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.5 + 0.5;

    u.uHover.value = lerp(u.uHover.value, hoverTarget.current, Math.min(1, delta * 6));

    // Color target follows dominant sentiment palette.
    const palette = SENTIMENT_COLORS[dominant];
    targetCore.set(palette.core);
    targetGlow.set(palette.glow);
    targetAccent.set(palette.accent);
    u.uColorCore.value.lerp(targetCore, k);
    u.uColorGlow.value.lerp(targetGlow, k);
    u.uColorAccent.value.lerp(targetAccent, k);

    if (meshRef.current) {
      const rotSpeed = (analyzing ? 0.5 : 0.12 + globalIntensity * 0.3) * focusBoost;
      meshRef.current.rotation.y += delta * rotSpeed;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
      // HyperFocus: slightly larger organism + deeper breathing
      const baseScale = hyperFocusActive ? 1.05 : 1;
      const breatheAmp = hyperFocusActive ? 0.04 : 0.02;
      const breathe = baseScale + Math.sin(state.clock.elapsedTime * (analyzing ? 4 : 1.1 + globalIntensity * 1.5)) * breatheAmp;
      meshRef.current.scale.setScalar(breathe);
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => (hoverTarget.current = 1)}
      onPointerOut={() => (hoverTarget.current = 0)}
    >
      <icosahedronGeometry args={[1.4, 128]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
