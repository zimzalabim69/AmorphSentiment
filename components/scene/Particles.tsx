"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SENTIMENT_COLORS } from "@/lib/sentiment";
import { useAppStore } from "@/lib/store";
import { useBatcaveStore } from "@/lib/batcave-store";

const COUNT = 900;

export default function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const result = useAppStore((s) => s.result);
  const targetColor = useMemo(() => new THREE.Color(), []);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 3 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      speeds[i] = 0.05 + Math.random() * 0.25;
    }
    return { positions, speeds };
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    // Live intensity drives particle speed + opacity
    const globalIntensity = useBatcaveStore.getState().globalIntensity;
    const speedMult = 1.0 + globalIntensity * 2.5;

    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3;
      arr[idx + 1] += speeds[i] * delta * 0.6 * speedMult;
      if (arr[idx + 1] > 7) arr[idx + 1] = -7;
    }
    pos.needsUpdate = true;
    pointsRef.current.rotation.y += delta * (0.02 + globalIntensity * 0.08);

    if (matRef.current) {
      // In batcave mode, use aggregate dominant color
      const batcave = useBatcaveStore.getState();
      let dominant = result?.dominant ?? "neutral";
      if (batcave.batcaveMode && batcave.aggregates.length > 0) {
        const active = batcave.aggregates.find((a) => a.window === batcave.activeWindow);
        if (active && active.volume > 0) dominant = active.dominant;
      }
      targetColor.set(SENTIMENT_COLORS[dominant].glow);
      matRef.current.color.lerp(targetColor, Math.min(1, delta * 1.5));
      matRef.current.opacity = 0.7 + globalIntensity * 0.3;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={SENTIMENT_COLORS.neutral.glow}
      />
    </points>
  );
}
