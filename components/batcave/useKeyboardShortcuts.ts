"use client";

import { useEffect } from "react";
import { useBatcaveStore } from "@/lib/batcave-store";
import { TOPIC_FILTERS } from "@/lib/live-types";
import { useAppStore } from "@/lib/store";
import { playWhoosh } from "@/lib/sound";

/**
 * Keyboard shortcuts for Batcave mode:
 * - Space: force-pulse the organism
 * - Left/Right arrows: cycle topic filters
 * - 1-3: switch time windows
 * - M: toggle sound
 * - Escape: exit batcave
 */
export function useKeyboardShortcuts() {
  const batcaveMode = useBatcaveStore((s) => s.batcaveMode);

  useEffect(() => {
    if (!batcaveMode) return;

    function handler(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space": {
          e.preventDefault();
          // Force pulse — temporarily spike global intensity
          const store = useBatcaveStore.getState();
          const current = store.globalIntensity;
          // Spike to 1.0, then decay naturally
          useBatcaveStore.setState({ globalIntensity: Math.min(current + 0.4, 1.0) });
          if (useAppStore.getState().soundEnabled) playWhoosh(0.8);
          break;
        }
        case "ArrowLeft":
        case "ArrowRight": {
          e.preventDefault();
          const store = useBatcaveStore.getState();
          const idx = TOPIC_FILTERS.indexOf(store.topicFilter);
          const dir = e.code === "ArrowRight" ? 1 : -1;
          const next = (idx + dir + TOPIC_FILTERS.length) % TOPIC_FILTERS.length;
          useBatcaveStore.getState().setTopicFilter(TOPIC_FILTERS[next]);
          break;
        }
        case "Digit1":
          useBatcaveStore.getState().setActiveWindow("30s");
          break;
        case "Digit2":
          useBatcaveStore.getState().setActiveWindow("2min");
          break;
        case "Digit3":
          useBatcaveStore.getState().setActiveWindow("10min");
          break;
        case "KeyM":
          useAppStore.getState().toggleSound();
          break;
        case "Escape":
          useBatcaveStore.getState().toggleBatcaveMode();
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [batcaveMode]);
}
