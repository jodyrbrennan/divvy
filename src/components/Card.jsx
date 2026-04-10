import { C } from "../constants/colors";

export default function Card({ children, style, delay = 0 }) {
  return (
    <div style={{
      background: C.cardBg,
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRadius: 18,
      border: `1px solid ${C.borderLight}`,
      boxShadow: "0 4px 24px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
      padding: 32,
      animation: `fadeUp 0.5s ease ${delay}s both`,
      ...style,
    }}>
      {children}
    </div>
  );
}
