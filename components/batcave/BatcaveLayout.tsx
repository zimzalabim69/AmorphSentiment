"use client";

import dynamic from "next/dynamic";
import { useLiveStream } from "@/lib/use-stream";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import BatcaveTopBar from "./BatcaveTopBar";
import LiveFeed from "./LiveFeed";
import EmotionRadar from "./EmotionRadar";
import KeyPhrases from "./KeyPhrases";
import IntensityMeter from "./IntensityMeter";
import EntityTracker from "./EntityTracker";
import BottomHUD from "./BottomHUD";
import TopicFilters from "./TopicFilters";
import HyperFocusView from "./HyperFocusView";

const OrganismCanvas = dynamic(() => import("@/components/scene/OrganismCanvas"), {
  ssr: false,
});

export default function BatcaveLayout() {
  useLiveStream();
  useKeyboardShortcuts();

  return (
    <div className="batcave-scanlines h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-bat-black)]">
      {/* Top bar */}
      <BatcaveTopBar />

      {/* Main content area: left panel | center blob | right panel */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel — Live Feed */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 p-2 gap-2 overflow-hidden">
          <LiveFeed />
        </aside>

        {/* Center — 3D organism (full bleed) */}
        <main className="flex-1 relative min-w-0">
          <div className="absolute inset-0">
            <OrganismCanvas />
          </div>
          {/* Mobile filters overlay */}
          <div className="absolute top-2 left-2 right-2 md:hidden">
            <div className="bat-panel p-2">
              <TopicFilters />
            </div>
          </div>
        </main>

        {/* Right panel — Intensity + Emotion Radar + Phrases + Entity Tracker */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 p-2 gap-2 overflow-y-auto">
          <IntensityMeter />
          <EmotionRadar />
          <KeyPhrases />
          <EntityTracker />
        </aside>
      </div>

      {/* Bottom HUD */}
      <BottomHUD />

      {/* HyperFocus overlay (renders on top when active) */}
      <HyperFocusView />
    </div>
  );
}
