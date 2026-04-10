import { C, font } from "./colors";

export const btnBase = {
  border: "none",
  borderRadius: 12,
  fontFamily: font,
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  padding: "15px 28px",
  transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
  letterSpacing: "0.01em",
  position: "relative",
  overflow: "hidden",
};

export const btnPrimary = {
  ...btnBase,
  background: C.gradientPrimary,
  color: C.white,
  boxShadow: "0 4px 20px rgba(41,53,60,0.25), 0 1px 3px rgba(0,0,0,0.1)",
};

export const btnSecondary = {
  ...btnBase,
  background: C.white,
  color: C.navy,
  border: `1.5px solid ${C.border}`,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

export const btnGhost = {
  ...btnBase,
  background: "transparent",
  color: C.steel,
  padding: "10px 16px",
  fontSize: 14,
};

export const inputStyle = {
  width: "100%",
  padding: "15px 18px",
  border: `1.5px solid ${C.border}`,
  borderRadius: 12,
  fontFamily: font,
  fontSize: 15,
  color: C.text,
  outline: "none",
  transition: "all 0.25s",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.8)",
  backdropFilter: "blur(8px)",
};

export const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: C.steel,
  marginBottom: 8,
  fontFamily: font,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};
