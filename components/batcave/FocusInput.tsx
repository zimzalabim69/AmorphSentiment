"use client";

import { useState, useRef } from "react";
import { useBatcaveStore } from "@/lib/batcave-store";

export default function FocusInput() {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const enterHyperFocus = useBatcaveStore((s) => s.enterHyperFocus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      enterHyperFocus(trimmed);
      setValue("");
      inputRef.current?.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type topic & Enter to FOCUS"
        className="w-44 px-2 py-1 text-[10px] font-mono bg-[var(--color-bat-dark)] border border-[var(--color-bat-border)] rounded text-[var(--color-bat-text)] placeholder:text-[var(--color-bat-dim)] focus:border-[var(--color-bat-orange)] focus:outline-none transition-colors"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="text-[9px] font-mono font-bold px-2 py-1 rounded border border-[var(--color-bat-orange)] text-[var(--color-bat-orange)] hover:bg-[var(--color-bat-orange)] hover:text-black transition-all disabled:opacity-30 disabled:pointer-events-none"
      >
        FOCUS
      </button>
    </form>
  );
}
