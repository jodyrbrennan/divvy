import { useState } from "react";
import { C, font, fontDisplay, getFreqColor } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";
import { DAY_NAMES, DAY_NAMES_FULL, MONTH_NAMES } from "../utils/taskHelpers";
import { isTaskActiveOnDate, getAssigneeForDate } from "../utils/calendarHelpers";
import { isEventOnDate, getEventsForDate } from "../utils/eventHelpers";
import Card from "../components/Card";
import { getUserName } from "../utils/userHelpers";
import { CheckCircleIcon } from "../components/Icons";
import { saveData } from "../utils/storage";

// Phase 7.1: Use context instead of props for app data
import { useAppData } from "../contexts/AppDataContext";

/**
 * EVENT_TYPE_CONFIG — emoji and color for each event type.
 * Used in calendar dots and event list items.
 */
const EVENT_TYPE_CONFIG = {
  birthday:    { emoji: "🎂", color: "#E67E22" },
  appointment: { emoji: "🏥", color: "#8E44AD" },
  gathering:   { emoji: "🎉", color: "#E74C3C" },
  school:      { emoji: "📚", color: "#2980B9" },
  holiday:     { emoji: "🌟", color: "#F1C40F" },
  travel:      { emoji: "✈️", color: "#1ABC9C" },
  other:       { emoji: "📌", color: "#7F8C8D" },
};

/**
 * CalendarView — monthly calendar with task AND event indicators.
 * Phase 3A: Updated to show events alongside tasks.
 */
export default function CalendarView({ onRequestComplete, onEditEvent }) {
  const { appData, setAppData } = useAppData();

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().slice(0, 10));
  const [calSelectedTaskIds, setCalSelectedTaskIds] = useState([]);
  const [expandedEventId, setExpandedEventId] = useState(null);

  const changeMonth = (dir) => {
    let m = viewMonth + dir, y = viewYear;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
    setCalSelectedTaskIds([]);
  };

  const goToToday = () => {
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    setSelectedDate(now.toISOString().slice(0, 10));
    setCalSelectedTaskIds([]);
  };

  const selectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setCalSelectedTaskIds([]);
    setExpandedEventId(null);
  };

  const toggleCalTask = (taskId) => {
    setCalSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleDeleteEvent = (eventId) => {
    setAppData((prev) => {
      const newData = { ...prev, events: (prev.events || []).filter((e) => e.id !== eventId) };
      saveData(newData);
      return newData;
    });
    setExpandedEventId(null);
  };

  // ── Build task indicators per date ──
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0, 10);
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tasksByDate = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const dateStr = date.toISOString().slice(0, 10);
    if (date < todayDate) continue;
    const dayTasks = appData.tasks.filter((t) => {
      if (!isTaskActiveOnDate(t, date)) return false;
      const completedOnDate = (appData.completions || []).some(
        (c) => c.taskId === t.id && new Date(c.timestamp).toDateString() === date.toDateString()
      );
      return !completedOnDate;
    });
    if (dayTasks.length > 0) tasksByDate[dateStr] = dayTasks;
  }

  // ── Build event indicators per date ──
  const events = appData.events || [];
  const eventsByDate = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const dateStr = date.toISOString().slice(0, 10);
    const dayEvents = events.filter((e) => isEventOnDate(e, dateStr));
    if (dayEvents.length > 0) eventsByDate[dateStr] = dayEvents;
  }

  // ── Selected date data ──
  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const selectedDow = DAY_NAMES_FULL[selectedDateObj.getDay()];
  const selectedDay = selectedDateObj.getDate();
  const selectedMonthName = MONTH_NAMES[selectedDateObj.getMonth()];

  const selectedTasks = (() => {
    const d = new Date(selectedDate + "T12:00:00");
    return appData.tasks.filter((t) => isTaskActiveOnDate(t, d));
  })();

  const selectedEvents = getEventsForDate(events, selectedDate);

  const hasAnything = selectedTasks.length > 0 || selectedEvents.length > 0;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card style={{ marginBottom: 20 }} delay={0.15}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600 }}>Calendar</h3>
        <button onClick={goToToday} style={{
          ...btnBase, padding: "6px 14px", fontSize: 12, borderRadius: 8,
          background: C.ice, color: C.navy,
        }}>Today</button>
      </div>

      {/* ── Month Navigation ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => changeMonth(-1)} style={{ ...btnGhost, padding: "6px 12px" }}>&larr;</button>
        <span style={{ fontWeight: 600, fontSize: 16, color: C.dark }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={() => changeMonth(1)} style={{ ...btnGhost, padding: "6px 12px" }}>&rarr;</button>
      </div>

      {/* ── Day Headers ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.steel, padding: "4px 0", letterSpacing: "0.08em" }}>{d}</div>
        ))}
      </div>

      {/* ── Calendar Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 20 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayTaskList = tasksByDate[dateStr] || [];
          const dayEventList = eventsByDate[dateStr] || [];
          const hasIndicators = dayTaskList.length > 0 || dayEventList.length > 0;

          return (
            <button key={i} onClick={() => selectDate(dateStr)} style={{
              all: "unset", cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", padding: "6px 2px 4px",
              borderRadius: 10, minHeight: 44, transition: "all 0.15s",
              background: isSelected ? C.gradientPrimary : isToday ? C.ice : "transparent",
              border: isToday && !isSelected ? `1.5px solid ${C.sky}` : "1.5px solid transparent",
            }}>
              <span style={{ fontSize: 14, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? C.white : C.dark, lineHeight: 1 }}>{day}</span>
              {hasIndicators && (
                <div style={{ display: "flex", gap: 2, marginTop: 3, alignItems: "center" }}>
                  {/* Event diamonds (shown first) */}
                  {dayEventList.slice(0, 2).map((evt, j) => {
                    const cfg = EVENT_TYPE_CONFIG[evt.eventType] || EVENT_TYPE_CONFIG.other;
                    return (
                      <div key={`ev${j}`} style={{
                        width: 5, height: 5, borderRadius: 1,
                        background: isSelected ? "rgba(255,255,255,0.9)" : cfg.color,
                        transform: "rotate(45deg)",
                      }} />
                    );
                  })}
                  {/* Task dots (shown after) */}
                  {dayTaskList.slice(0, 3 - Math.min(dayEventList.length, 2)).map((t, j) => (
                    <div key={`tk${j}`} style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.8)" : getFreqColor(t) }} />
                  ))}
                  {(dayTaskList.length + dayEventList.length) > 3 && (
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.4)" : C.steel }} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Selected Day Detail ── */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{selectedDow}</p>
            <p style={{ fontSize: 13, color: C.steel }}>{selectedMonthName} {selectedDay}, {selectedDateObj.getFullYear()}</p>
          </div>
          {selectedDate === todayStr && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.navy, background: C.ice, padding: "4px 10px", borderRadius: 50 }}>Today</span>
          )}
        </div>

        {!hasAnything ? (
          <p style={{ color: C.steel, fontSize: 14, padding: "8px 0" }}>Nothing scheduled for this day.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* ═══ EVENTS SECTION ═══ */}
            {selectedEvents.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Events</p>
                {selectedEvents.map((evt) => {
                  const cfg = EVENT_TYPE_CONFIG[evt.eventType] || EVENT_TYPE_CONFIG.other;
                  const linkedNames = (evt.linkedMembers || [])
                    .map((id) => getUserName(appData.users, id))
                    .filter(Boolean)
                    .join(", ");
                  const isExpanded = expandedEventId === evt.id;

                  return (
                    <div key={evt.id}>
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                        style={{
                          all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box",
                          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                          background: `${cfg.color}12`,
                          border: `1px solid ${cfg.color}30`,
                          transition: "all 0.2s",
                        }}
                      >
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{cfg.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{evt.name}</p>
                          <div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                            {evt.time && <span style={{ fontSize: 11, color: C.steel }}>{evt.time}</span>}
                            {linkedNames && <span style={{ fontSize: 11, color: C.steel }}>{linkedNames}</span>}
                            {evt.recurrence === "yearly" && <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>Yearly</span>}
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round"
                          style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>

                      {/* Expanded: description + edit/delete */}
                      {isExpanded && (
                        <div style={{
                          padding: "12px 14px", marginTop: -1,
                          borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                          background: `${cfg.color}08`, border: `1px solid ${cfg.color}20`,
                          borderTop: "none", animation: "fadeUp 0.15s ease both",
                        }}>
                          {evt.description && (
                            <p style={{ fontSize: 13, color: C.dark, lineHeight: 1.5, marginBottom: 12 }}>{evt.description}</p>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            {onEditEvent && (
                              <button onClick={() => onEditEvent(evt)} style={{
                                ...btnBase, padding: "8px 16px", fontSize: 12, borderRadius: 8,
                                background: C.ice, color: C.navy,
                              }}>Edit</button>
                            )}
                            <button onClick={() => {
                              if (window.confirm(`Delete "${evt.name}"?`)) handleDeleteEvent(evt.id);
                            }} style={{
                              ...btnBase, padding: "8px 16px", fontSize: 12, borderRadius: 8,
                              background: "rgba(192,57,43,0.08)", color: C.danger,
                            }}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* ═══ TASKS SECTION ═══ */}
            {selectedTasks.length > 0 && (
              <>
                {selectedEvents.length > 0 && (
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 8 }}>Tasks</p>
                )}

                {onRequestComplete && (() => {
                  const incompleteTasks = selectedTasks.filter((t) => !(t.lastCompleted && new Date(t.lastCompleted).toDateString() === selectedDateObj.toDateString()));
                  const allSelected = incompleteTasks.length > 0 && incompleteTasks.every((t) => calSelectedTaskIds.includes(t.id));
                  const someSelected = calSelectedTaskIds.length > 0;
                  if (incompleteTasks.length === 0) return null;
                  return (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 4, borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button onClick={() => {
                          if (allSelected) setCalSelectedTaskIds([]);
                          else setCalSelectedTaskIds(incompleteTasks.map((t) => t.id));
                        }} style={{
                          ...btnBase, padding: "5px 12px", fontSize: 11, borderRadius: 8,
                          background: allSelected ? C.ice : "transparent", color: allSelected ? C.navy : C.steel,
                          border: `1.5px solid ${allSelected ? C.sky : C.border}`,
                        }}>{allSelected ? "Clear all" : "Select all"}</button>
                        {someSelected && <span style={{ fontSize: 11, color: C.steel }}>{calSelectedTaskIds.length} selected</span>}
                      </div>
                      {someSelected && (
                        <button onClick={() => {
                          const tasks = selectedTasks.filter((t) => calSelectedTaskIds.includes(t.id));
                          if (tasks.length > 0) { onRequestComplete(tasks); setCalSelectedTaskIds([]); }
                        }} style={{
                          ...btnBase, padding: "6px 14px", fontSize: 12, borderRadius: 8,
                          background: C.gradientPrimary, color: C.white, boxShadow: "0 2px 8px rgba(41,53,60,0.2)",
                          display: "flex", alignItems: "center", gap: 5,
                        }}><CheckCircleIcon done={true} size={14} /> Complete</button>
                      )}
                    </div>
                  );
                })()}

                {selectedTasks.map((task) => {
                  const assignee = getAssigneeForDate(task, selectedDateObj, appData.users);
                  const allAssignees = task.assignedTo?.length ? task.assignedTo.map((id) => getUserName(appData.users, id)).join(", ") : "Unassigned";
                  const displayAssignee = assignee ? assignee.name : allAssignees;
                  const completed = task.lastCompleted && new Date(task.lastCompleted).toDateString() === selectedDateObj.toDateString();
                  const isSelected = calSelectedTaskIds.includes(task.id);
                  return (
                    <div key={task.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                      background: completed ? "rgba(118,138,150,0.06)" : isSelected ? "rgba(223,235,246,0.45)" : "rgba(223,235,246,0.25)",
                      border: `1px solid ${completed ? C.border : isSelected ? C.sky : C.borderLight}`,
                      opacity: completed ? 0.6 : 1, transition: "all 0.2s",
                    }}>
                      {!completed && onRequestComplete ? (
                        <button onClick={() => toggleCalTask(task.id)} style={{
                          all: "unset", cursor: "pointer", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 24, height: 24, borderRadius: 6,
                          background: isSelected ? C.gradientPrimary : "rgba(255,255,255,0.6)",
                          border: `2px solid ${isSelected ? C.navy : "rgba(68,87,109,0.3)"}`,
                          transition: "all 0.2s",
                        }}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12l5 5L19 7" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: completed ? C.steel : C.navy }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: C.dark, textDecoration: completed ? "line-through" : "none" }}>{task.name}</p>
                        <div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: C.steel }}>{displayAssignee}</span>
                          {task.dueConfig?.time && <span style={{ fontSize: 11, color: C.steel }}>{task.dueConfig.time}</span>}
                          {task.timeDue && !task.dueConfig?.time && <span style={{ fontSize: 11, color: C.steel }}>{task.timeDue}</span>}
                          {task.points > 0 && <span style={{ fontSize: 11, color: C.navy, fontWeight: 600 }}>{task.points} pts</span>}
                        </div>
                      </div>
                      {completed && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill={C.steel} />
                          <path d="M8 12.5l2.5 2.5 5-5" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
