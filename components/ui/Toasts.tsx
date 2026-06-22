"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const toastListeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function notify() {
  for (const l of toastListeners) {
    try { l([...toasts]); } catch { /* noop */ }
  }
}

export function toast(message: string, type: ToastType = "info", duration = 4000) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  toasts.push({ id, message, type, duration });
  notify();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, duration);
}

export function toastSuccess(message: string) { toast(message, "success", 3000); }
export function toastError(message: string) { toast(message, "error", 6000); }
export function toastWarning(message: string) { toast(message, "warning", 5000); }

const TYPE_STYLES: Record<ToastType, { border: string; bg: string; icon: string }> = {
  info: { border: "var(--color-bat-cyan)", bg: "rgba(0,229,255,0.08)", icon: "ℹ" },
  success: { border: "var(--color-bat-green)", bg: "rgba(57,255,176,0.08)", icon: "✓" },
  warning: { border: "var(--color-bat-amber)", bg: "rgba(255,171,26,0.08)", icon: "⚠" },
  error: { border: "var(--color-bat-red)", bg: "rgba(255,61,61,0.08)", icon: "✕" },
};

export default function ToastContainer() {
  const [visible, setVisible] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast[]) => setVisible(t);
    toastListeners.add(listener);
    return () => { toastListeners.delete(listener); };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {visible.map((t) => {
          const style = TYPE_STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="pointer-events-auto flex items-center gap-2 rounded border px-3 py-2 text-xs font-mono shadow-lg backdrop-blur-md"
              style={{
                borderColor: `${style.border}55`,
                backgroundColor: style.bg,
                color: style.border,
              }}
            >
              <span className="text-sm">{style.icon}</span>
              <span>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
