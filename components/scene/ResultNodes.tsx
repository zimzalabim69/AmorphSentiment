"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { SENTIMENT_COLORS } from "@/lib/sentiment";
import { useAppStore } from "@/lib/store";
import type { Emotion } from "@/lib/types";

function EmotionNode({
  emotion,
  index,
  total,
  color,
}: {
  emotion: Emotion;
  index: number;
  total: number;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const grow = useRef(0);

  const { radius, baseAngle, height, speed } = useMemo(() => {
    const radius = 2.4 + (index % 2) * 0.7;
    const baseAngle = (index / total) * Math.PI * 2;
    const height = (index % 2 === 0 ? 1 : -1) * (0.4 + Math.random() * 1.2);
    const speed = 0.15 + Math.random() * 0.2;
    return { radius, baseAngle, height, speed };
  }, [index, total]);

  const size = 0.12 + emotion.value * 0.34;

  useFrame((state, delta) => {
    grow.current = Math.min(1, grow.current + delta * 1.6);
    const a = baseAngle + state.clock.elapsedTime * speed;
    if (groupRef.current) {
      groupRef.current.position.set(
        Math.cos(a) * radius,
        height + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.25,
        Math.sin(a) * radius,
      );
    }
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.12;
      meshRef.current.scale.setScalar(grow.current * size * pulse);
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.6} floatIntensity={0.6}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.92} />
        </mesh>
        {/* soft halo */}
        <mesh scale={1.8}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function ResultNodes() {
  const result = useAppStore((s) => s.result);
  const phase = useAppStore((s) => s.phase);
  if (!result || phase !== "result") return null;

  const palette = SENTIMENT_COLORS[result.dominant];
  const colors = [palette.core, palette.glow, palette.accent];

  return (
    <group>
      {result.emotions.map((emotion, i) => (
        <EmotionNode
          key={emotion.label}
          emotion={emotion}
          index={i}
          total={result.emotions.length}
          color={colors[i % colors.length]}
        />
      ))}
    </group>
  );
}
