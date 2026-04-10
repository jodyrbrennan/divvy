import { C, font } from "../constants/colors";

export default function PageShell({ children, narrow, topNav }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: C.gradientLight,
      fontFamily: font,
      color: C.text,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: topNav ? "72px 20px 80px" : "40px 20px 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "fixed", top: -120, right: -80,
        width: 400, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.ice} 0%, transparent 70%)`,
        opacity: 0.6, pointerEvents: "none",
        animation: "glowPulse 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "fixed", bottom: -100, left: -60,
        width: 350, height: 350, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.sky} 0%, transparent 70%)`,
        opacity: 0.3, pointerEvents: "none",
        animation: "glowPulse 10s ease-in-out infinite 2s",
      }} />
      <div style={{ width: "100%", maxWidth: narrow ? 460 : 620, position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
