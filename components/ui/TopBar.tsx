"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";

export default function TopBar() {
  const classicMode = useAppStore((s) => s.classicMode);
  const toggleClassicMode = useAppStore((s) => s.toggleClassicMode);
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const toggleSound = useAppStore((s) => s.toggleSound);

  return (
    <header className="pointer-events-auto flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <motion.span
          className="block h-7 w-7 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #b6ff6e, #39ffb0 40%, #6ea8ff 75%, #9d7bff)",
          }}
          animate={{ scale: [1, 1.12, 1], rotate: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="leading-tight">
          <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
            AmorphSentiment
          </h1>
          <p className="hidden text-[11px] text-white/40 sm:block">
            a living sentiment organism
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Toggle active={soundEnabled} onClick={toggleSound} label={soundEnabled ? "Sound on" : "Sound off"}>
          {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
        </Toggle>
        <Toggle active={classicMode} onClick={toggleClassicMode} label="Classic mode">
          <span className="text-xs font-medium">{classicMode ? "Organic" : "Classic"}</span>
        </Toggle>
      </div>
    </header>
  );
}

function Toggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-white/70 backdrop-blur-md transition hover:text-white"
      style={{
        borderColor: active ? "rgba(122,245,255,0.5)" : "rgba(255,255,255,0.12)",
        background: active ? "rgba(122,245,255,0.12)" : "rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </button>
  );
}

function SoundOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
