import { useState } from "react";
import { C } from "../constants/colors";
import { btnBase, inputStyle, labelStyle } from "../constants/styles";
import { TASK_CATALOG, CATEGORIES, searchTasks } from "../utils/taskCatalog";

export default function TaskPicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(null);
  const results = query.trim() ? searchTasks(query) : [];
  const showResults = query.trim().length >= 2 && results.length > 0;
  const showNoResults = query.trim().length >= 2 && results.length === 0;

  const TaskOption = ({ task, onClick }) => (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
      gap: 12, padding: "12px 16px", borderRadius: 12, width: "100%",
      background: "rgba(255,255,255,0.4)", border: `1px solid ${C.border}`,
      transition: "all 0.2s", boxSizing: "border-box",
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{task.name}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: C.steel }}>{task.category}</span>
          <span style={{ fontSize: 11, color: C.steel }}>{{ once: "One-time", daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", weekdays: "Weekdays", weekends: "Weekends" }[task.schedule] || task.schedule}</span>
          <span style={{ fontSize: 11, color: C.navy, fontWeight: 600 }}>{task.points} pts</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );

  return (
    <div>
      <label style={labelStyle}>Choose a task or search</label>
      <div style={{ position: "relative", marginBottom: 4 }}>
        <div style={{ position: "relative" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            style={{ ...inputStyle, paddingLeft: 42 }}
            placeholder="Search tasks... try 'garbage', 'hoover', 'tidy'"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setBrowsing(null); }}
            autoFocus
          />
        </div>
      </div>

      {showResults && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          marginTop: 12, marginBottom: 8,
          animation: "fadeUp 0.2s ease both",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            Matches
          </p>
          {results.map((t) => (
            <TaskOption key={t.name} task={t} onClick={() => onSelect(t)} />
          ))}
        </div>
      )}

      {showNoResults && (
        <p style={{ color: C.steel, fontSize: 13, marginTop: 12, marginBottom: 8 }}>
          No matches found. You can still create a custom task below.
        </p>
      )}

      {!query.trim() && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.steel, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            Browse by category
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setBrowsing(browsing === cat ? null : cat)} style={{
                ...btnBase, padding: "8px 16px", fontSize: 13, borderRadius: 50,
                fontWeight: browsing === cat ? 600 : 500,
                background: browsing === cat ? C.gradientPrimary : "rgba(255,255,255,0.6)",
                color: browsing === cat ? C.white : C.navy,
                border: `1.5px solid ${browsing === cat ? "transparent" : C.border}`,
                boxShadow: browsing === cat ? "0 2px 10px rgba(41,53,60,0.15)" : "none",
              }}>
                {cat}
              </button>
            ))}
          </div>

          {browsing && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 6,
              animation: "fadeUp 0.2s ease both",
            }}>
              {TASK_CATALOG.filter((t) => t.category === browsing).map((t) => (
                <TaskOption key={t.name} task={t} onClick={() => onSelect(t)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
