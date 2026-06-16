"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import Background from "./ui/Background";
import TopBar from "./ui/TopBar";
import InputOrb from "./ui/InputOrb";
import PresetTopics from "./ui/PresetTopics";
import ResultsPanel from "./ui/ResultsPanel";
import ClassicMode from "./ui/ClassicMode";
import { useAppStore } from "@/lib/store";
import { useBatcaveStore } from "@/lib/batcave-store";

const OrganismCanvas = dynamic(() => import("./scene/OrganismCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 blur-2xl" />
    </div>
  ),
});

const BatcaveLayout = dynamic(() => import("./batcave/BatcaveLayout"), {
  ssr: false,
});

export default function Experience() {
  const classicMode = useAppStore((s) => s.classicMode);
  const batcaveMode = useBatcaveStore((s) => s.batcaveMode);

  // Full batcave immersive mode takes over the entire screen
  if (batcaveMode) {
    return <BatcaveLayout />;
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden text-white">
      <Background />

      {/* 3D organism lives behind the UI in organic mode */}
      <AnimatePresence>
        {!classicMode && (
          <motion.div
            key="canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <OrganismCanvas />
          </motion.div>
        )}
      </AnimatePresence>

      {/* UI overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col p-4 sm:p-6">
        <div className="pointer-events-auto">
          <TopBar />
        </div>

        {classicMode ? (
          <div className="pointer-events-auto mt-6 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              <PresetTopics />
              <InputOrb />
              <ClassicMode />
            </div>
          </div>
        ) : (
          <>
            {/* results float on the right (or stack on mobile) */}
            <div className="pointer-events-none absolute right-4 top-20 z-10 flex w-full max-w-md justify-end sm:right-6 sm:top-24">
              <ResultsPanel />
            </div>

            {/* input dock */}
            <div className="pointer-events-none mt-auto flex w-full flex-col items-center gap-4">
              <div className="pointer-events-auto w-full max-w-2xl">
                <PresetTopics />
              </div>
              <div className="pointer-events-auto w-full max-w-2xl">
                <InputOrb />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
