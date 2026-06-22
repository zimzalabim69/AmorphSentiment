export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#010104",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "monospace",
        zIndex: 9999,
      }}
    >
      <h1
        style={{
          color: "#ff6b2c",
          fontSize: 14,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontWeight: 700,
          textShadow: "0 0 12px rgba(255,107,44,0.4)",
        }}
      >
        Sentinel
      </h1>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#39ffb0",
            animation: "pulse 1s infinite",
          }}
        />
        <span style={{ color: "#888", fontSize: 11 }}>Loading intelligence core…</span>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
