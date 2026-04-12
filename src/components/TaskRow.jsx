import { useState } from "react";
import { C, font, getFreqColor } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";
import { isTaskDueToday, getScheduleLabel } from "../utils/taskHelpers";
import { getUserName } from "../utils/userHelpers";
import { CheckCircleIcon, RepeatIcon, StarIcon } from "./Icons";

/**
 * TaskRow — renders one task in a list with selection checkbox,
 * task name, assignees, schedule badge, points, and expand-to-edit actions.
 *
 * Props:
 *   task            – the task object
 *   compact         – (optional) smaller sizing for inline lists
 *   users           – full users array (to look up assignee names)
 *   selectedTaskIds – array of currently-selected task IDs
 *   onToggleSelect  – callback(taskId) to toggle selection
 *   onUncomplete    – callback(taskId) to undo a completion
 *   onDelete        – callback(taskId) to delete a task
 *   onEdit          – callback(task) to open the edit wizard
 */
export default function TaskRow({ task, compact, users, selectedTaskIds, onToggleSelect, onUncomplete, onDelete, onEdit }) {
  const done = !isTaskDueToday(task);
  const assignees = (task.assignedTo || []).map((id) => getUserName(users, id)).join(", ") || "Unassigned";
  const [showActions, setShowActions] = useState(false);
  const isSelected = selectedTaskIds.includes(task.id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14, padding: compact ? "10px 0" : "14px 0" }}>
        {/* Checkbox for selection */}
        {!done ? (
          <button onClick={() => onToggleSelect(task.id)}
            style={{
              all: "unset", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              width: compact ? 28 : 32, height: compact ? 28 : 32,
              borderRadius: 8,
              background: isSelected ? C.gradientPrimary : "rgba(255,255,255,0.6)",
              border: `2px solid ${isSelected ? C.navy : "rgba(68,87,109,0.3)"}`,
              transition: "all 0.2s",
            }}>
            {isSelected && (
              <svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <button onClick={() => onUncomplete(task.id)}
            style={{
              all: "unset", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              width: compact ? 28 : 32, height: compact ? 28 : 32,
              borderRadius: 8,
              background: "rgba(68,87,109,0.08)",
              border: `2px solid ${C.navy}`,
              transition: "all 0.2s",
            }}>
            <CheckCircleIcon done={true} size={compact ? 16 : 18} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0, opacity: done ? 0.5 : 1 }} onClick={() => setShowActions(!showActions)}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: getFreqColor(task), flexShrink: 0, opacity: done ? 0.4 : 1 }} />
            <p style={{ fontWeight: 600, fontSize: compact ? 14 : 15, textDecoration: done ? "line-through" : "none", color: done ? C.steel : C.dark }}>{task.name}</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: C.steel }}>{assignees}</span>
            {task.schedule && task.schedule !== "once" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.steel }}><RepeatIcon /> {getScheduleLabel(task)}</span>
            )}
            {task.points > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.navy, fontWeight: 600 }}><StarIcon /> {task.points}</span>
            )}
          </div>
        </div>
        {/* Undo button for done tasks */}
        {done && !compact && (
          <button onClick={() => onUncomplete(task.id)}
            style={{
              ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8, flexShrink: 0,
              background: "rgba(68,87,109,0.06)", color: C.steel,
            }}>
            Undo
          </button>
        )}
      </div>
      {showActions && (
        <div style={{ display: "flex", gap: 8, padding: "0 0 8px 46px", animation: "fadeUp 0.2s ease both" }}>
          <button onClick={() => onEdit(task)} style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: C.navy, background: C.ice, borderRadius: 8 }}>Edit</button>
          <button onClick={() => onDelete(task.id)} style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: C.danger, background: "rgba(192,57,43,0.06)", borderRadius: 8 }}>Delete</button>
        </div>
      )}
    </div>
  );
}
