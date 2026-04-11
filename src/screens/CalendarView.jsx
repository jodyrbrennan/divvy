import { useState } from "react";
import { C, fontDisplay, getFreqColor } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";
import { DAY_NAMES, DAY_NAMES_FULL, MONTH_NAMES } from "../utils/taskHelpers";
import { isTaskActiveOnDate, getAssigneeForDate } from "../utils/calendarHelpers";
import Card from "../components/Card";
import { CheckCircleIcon } from "../components/Icons";

export default function CalendarView({ appData, onRequestComplete }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().slice(0, 10));
  const [calSelectedTaskIds, setCalSelectedTaskIds] = useState([]);

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
  };

  const toggleCalTask = (taskId) => {
    setCalSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0, 10);
  const tasksByDate = {};
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const dateStr = date.toISOString().slice(0, 10);
    // Only show dots for today and future dates
    if (date < todayDate) continue;
    const dayTasks = appData.tasks.filter((t) => {
      if (!isTaskActiveOnDate(t, date)) return false;
      // Hide dot if task was completed on this date
      const completedOnDate = (appData.completions || []).some(
        (c) => c.taskId === t.id && new Date(c.timestamp).toDateString() === date.toDateString()
      );
      if (completedOnDate) return false;
      return true;
    });
    if (dayTasks.length > 0) tasksByDate[dateStr] = dayTasks;
  }

  const selectedTasks = (() => {
    const d = new Date(selectedDate + "T12:00:00");
    return appData.tasks.filter((t) => isTaskActiveOnDate(t, d));
  })();

  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const selectedDow = DAY_NAMES_FULL[selectedDateObj.getDay()];
  const selectedDay = selectedDateObj.getDate();
  const selectedMonthName = MONTH_NAMES[selectedDateObj.getMonth()];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getUserName = (id) => appData.users.find((u) => u.id === id)?.name || "Unassigned";

  return (
    <Card style={{ marginBottom: 20 }} delay={0.15}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600 }}>Calendar</h3>
        <button onClick={goToToday} style={{
          ...btnBase, padding: "6px 14px", fontSize: 12, borderRadius: 8,
          background: C.ice, color: C.navy,
        }}>Today</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => changeMonth(-1)} style={{ ...btnGhost, padding: "6px 12px" }}>&larr;</button>
        <span style={{ fontWeight: 600, fontSize: 16, color: C.dark }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={() => changeMonth(1)} style={{ ...btnGhost, padding: "6px 12px" }}>&rarr;</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.steel, padding: "4px 0", letterSpacing: "0.08em" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 20 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayTaskList = tasksByDate[dateStr] || [];
          const hasTasks = dayTaskList.length > 0;
          return (
            <button key={i} onClick={() => selectDate(dateStr)} style={{
              all: "unset", cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", padding: "6px 2px 4px",
              borderRadius: 10, minHeight: 44, transition: "all 0.15s",
              background: isSelected ? C.gradientPrimary : isToday ? C.ice : "transparent",
              border: isToday && !isSelected ? `1.5px solid ${C.sky}` : "1.5px solid transparent",
            }}>
              <span style={{ fontSize: 14, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? C.white : C.dark, lineHeight: 1 }}>{day}</span>
              {hasTasks && (
                <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                  {dayTaskList.slice(0, 3).map((t, j) => (
                    <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.8)" : getFreqColor(t) }} />
                  ))}
                  {dayTaskList.length > 3 && (
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.4)" : C.steel }} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

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

        {selectedTasks.length === 0 ? (
          <p style={{ color: C.steel, fontSize: 14, padding: "8px 0" }}>Nothing scheduled for this day.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              const allAssignees = task.assignedTo?.length ? task.assignedTo.map(getUserName).join(", ") : "Unassigned";
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
          </div>
        )}
      </div>
    </Card>
  );
}