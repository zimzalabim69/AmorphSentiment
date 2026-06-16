"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import Blob from "./Blob";
import Particles from "./Particles";
import ResultNodes from "./ResultNodes";
import { useBatcaveStore } from "@/lib/batcave-store";

export default function OrganismCanvas() {
  const batcaveMode = useBatcaveStore((s) => s.batcaveMode);
  const hyperFocusActive = useBatcaveStore((s) => s.hyperFocus.active);

  // Deeper bloom + heavier vignette in batcave mode; even more in HyperFocus
  const bloomIntensity = hyperFocusActive ? 2.4 : batcaveMode ? 1.8 : 1.15;
  const bloomThreshold = hyperFocusActive ? 0.05 : batcaveMode ? 0.1 : 0.15;
  const vignetteStrength = hyperFocusActive ? 1.4 : batcaveMode ? 1.1 : 0.85;

  return (
    <Canvas
      camera={{ position: [0, 0, 5.2], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#010104"]} />
      <fog attach="fog" args={["#010104", 8, 18]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.4} color={batcaveMode ? "#ff6b2c" : "#7af5ff"} />
      <pointLight position={[-5, -3, 2]} intensity={0.9} color={batcaveMode ? "#ff3d3d" : "#c026d3"} />

      <Blob />
      <ResultNodes />
      <Particles />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.4}
        rotateSpeed={0.6}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
      />

      <EffectComposer>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={bloomThreshold}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.05} />
        <Vignette eskil={false} offset={0.2} darkness={vignetteStrength} />
      </EffectComposer>
    </Canvas>
  );
}
