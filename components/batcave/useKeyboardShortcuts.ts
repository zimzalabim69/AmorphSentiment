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
 * - F: enter HyperFocus on current filter
 * - Escape: exit HyperFocus (if active), otherwise exit batcave
 */
export function useKeyboardShortcuts() {
  const batcaveMode = useBatcaveStore((s) => s.batcaveMode);

  useEffect(() => {
    if (!batcaveMode) return;

    function handler(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const state = useBatcaveStore.getState();

      switch (e.code) {
        case "Space": {
          e.preventDefault();
          const current = state.globalIntensity;
          useBatcaveStore.setState({ globalIntensity: Math.min(current + 0.4, 1.0) });
          if (useAppStore.getState().soundEnabled) playWhoosh(0.8);
          break;
        }
        case "ArrowLeft":
        case "ArrowRight": {
          e.preventDefault();
          // If in HyperFocus, arrows do nothing (or could cycle focus targets)
          if (state.hyperFocus.active) break;
          const idx = TOPIC_FILTERS.indexOf(state.topicFilter);
          const dir = e.code === "ArrowRight" ? 1 : -1;
          const next = (idx + dir + TOPIC_FILTERS.length) % TOPIC_FILTERS.length;
          state.setTopicFilter(TOPIC_FILTERS[next]);
          break;
        }
        case "Digit1":
          state.setActiveWindow("30s");
          break;
        case "Digit2":
          state.setActiveWindow("2min");
          break;
        case "Digit3":
          state.setActiveWindow("10min");
          break;
        case "KeyM":
          useAppStore.getState().toggleSound();
          break;
        case "KeyF": {
          // Enter HyperFocus on current topic filter
          if (!state.hyperFocus.active && state.topicFilter !== "all") {
            state.enterHyperFocus(state.topicFilter);
          }
          break;
        }
        case "Escape":
          // If in HyperFocus, exit focus first; otherwise exit Batcave
          if (state.hyperFocus.active) {
            state.exitHyperFocus();
          } else {
            state.toggleBatcaveMode();
          }
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [batcaveMode]);
}
