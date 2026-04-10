import { C } from "../constants/colors";
import { btnBase } from "../constants/styles";

export default function Chip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...btnBase, padding: "10px 20px", fontSize: 14, borderRadius: 50,
      fontWeight: selected ? 600 : 500,
      background: selected ? C.gradientPrimary : "rgba(255,255,255,0.6)",
      color: selected ? C.white : C.navy,
      border: `1.5px solid ${selected ? "transparent" : C.border}`,
      boxShadow: selected ? "0 4px 16px rgba(41,53,60,0.2)" : "0 1px 4px rgba(0,0,0,0.04)",
      backdropFilter: selected ? "none" : "blur(8px)",
    }}>
      {label}
    </button>
  );
}
