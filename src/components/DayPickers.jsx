import { C } from "../constants/colors";
import { btnBase } from "../constants/styles";
import { DAY_NAMES } from "../utils/taskHelpers";

export function DayOfWeekPicker({ selected, onChange }) {
  const toggle = (d) => onChange(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d].sort());
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {DAY_NAMES.map((name, i) => (
        <button key={i} onClick={() => toggle(i)} style={{
          ...btnBase, padding: "10px 0", flex: 1, fontSize: 12, borderRadius: 10,
          background: selected.includes(i) ? C.gradientPrimary : "rgba(255,255,255,0.5)",
          color: selected.includes(i) ? C.white : C.navy,
          border: `1.5px solid ${selected.includes(i) ? "transparent" : C.border}`, minWidth: 0,
        }}>{name}</button>
      ))}
    </div>
  );
}

export function DayOfMonthPicker({ selected, onChange }) {
  const toggle = (d) => onChange(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d].sort((a, b) => a - b));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
        <button key={d} onClick={() => toggle(d)} style={{
          ...btnBase, padding: "8px 0", fontSize: 13, borderRadius: 8,
          background: selected.includes(d) ? C.gradientPrimary : "rgba(255,255,255,0.5)",
          color: selected.includes(d) ? C.white : C.navy,
          border: `1.5px solid ${selected.includes(d) ? "transparent" : C.border}`, minWidth: 0,
        }}>{d}</button>
      ))}
    </div>
  );
}
