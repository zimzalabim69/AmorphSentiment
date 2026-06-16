"use client";

import { motion } from "framer-motion";

interface LockOnReticleProps {
  keyword: string;
}

export default function LockOnReticle({ keyword }: LockOnReticleProps) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
      {/* Outer ring — rotates */}
      <motion.div
        className="absolute w-[340px] h-[340px] rounded-full border border-[var(--color-bat-orange)]"
        style={{ opacity: 0.4 }}
        initial={{ scale: 2, opacity: 0, rotate: 0 }}
        animate={{ scale: 1, opacity: 0.4, rotate: 360 }}
        transition={{ duration: 1.2, ease: "easeOut", rotate: { duration: 20, repeat: Infinity, ease: "linear" } }}
      >
        {/* Tick marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute w-px h-3 bg-[var(--color-bat-orange)]"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateY(-170px)`,
              transformOrigin: "0 0",
            }}
          />
        ))}
      </motion.div>

      {/* Inner ring — counter-rotates */}
      <motion.div
        className="absolute w-[240px] h-[240px] rounded-full border border-[var(--color-bat-red)]"
        style={{ opacity: 0.5, borderStyle: "dashed" }}
        initial={{ scale: 0.3, opacity: 0, rotate: 0 }}
        animate={{ scale: 1, opacity: 0.5, rotate: -360 }}
        transition={{ duration: 0.8, ease: "easeOut", rotate: { duration: 15, repeat: Infinity, ease: "linear" } }}
      />

      {/* Center crosshair */}
      <motion.div
        className="absolute"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" className="text-[var(--color-bat-orange)]">
          {/* Cross lines */}
          <line x1="30" y1="0" x2="30" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <line x1="30" y1="38" x2="30" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <line x1="0" y1="30" x2="22" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <line x1="38" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          {/* Center dot */}
          <circle cx="30" cy="30" r="3" fill="currentColor" opacity="0.9" />
        </svg>
      </motion.div>

      {/* Corner brackets */}
      {[
        { top: "25%", left: "25%", borderTop: "2px", borderLeft: "2px" },
        { top: "25%", right: "25%", borderTop: "2px", borderRight: "2px" },
        { bottom: "25%", left: "25%", borderBottom: "2px", borderLeft: "2px" },
        { bottom: "25%", right: "25%", borderBottom: "2px", borderRight: "2px" },
      ].map((style, i) => (
        <motion.div
          key={i}
          className="absolute w-8 h-8"
          style={{
            ...style,
            borderColor: "var(--color-bat-orange)",
          } as React.CSSProperties}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
        />
      ))}

      {/* Keyword label below crosshair */}
      <motion.div
        className="absolute top-[58%] font-mono text-[11px] text-[var(--color-bat-cyan)] tracking-widest uppercase"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        TARGET LOCKED: {keyword}
      </motion.div>
    </div>
  );
}
