"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import Blob from "./Blob";
import Particles from "./Particles";
import ResultNodes from "./ResultNodes";

export default function OrganismCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.2], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", 8, 18]} />

      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#7af5ff" />
      <pointLight position={[-5, -3, 2]} intensity={0.8} color="#c026d3" />

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
          intensity={1.15}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.04} />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
