import { C } from "../constants/colors";
import { btnGhost } from "../constants/styles";
import { DAY_NAMES, MONTH_NAMES } from "../utils/taskHelpers";

export default function MiniCalendar({ selectedDates = [], onToggleDate, month, year, onChangeMonth }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toStr = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => onChangeMonth(-1)} style={{ ...btnGhost, padding: "6px 10px" }}>&larr;</button>
        <span style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => onChangeMonth(1)} style={{ ...btnGhost, padding: "6px 10px" }}>&rarr;</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, textAlign: "center" }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: C.steel, padding: 4, letterSpacing: "0.05em" }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = toStr(day);
          const sel = selectedDates.includes(dateStr);
          return (
            <button key={i} onClick={() => onToggleDate(dateStr)} style={{
              all: "unset", cursor: "pointer", width: "100%", aspectRatio: "1", display: "flex",
              alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 13, fontWeight: sel ? 700 : 500,
              background: sel ? C.gradientPrimary : "transparent", color: sel ? C.white : C.dark,
              transition: "all 0.15s",
            }}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
