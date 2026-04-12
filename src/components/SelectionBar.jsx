import { C } from "../constants/colors";
import { btnBase } from "../constants/styles";
import { isTaskDueToday } from "../utils/taskHelpers";
import { CheckCircleIcon } from "./Icons";

/**
 * SelectionBar — shows "Select all / Clear all" toggle and a "Complete" button
 * when one or more tasks are selected in a task list.
 *
 * Props:
 *   tasks              – the task array being displayed (used to find due-today tasks)
 *   selectedTaskIds    – array of currently-selected task IDs
 *   setSelectedTaskIds – setter to update selected IDs
 *   allTasks           – full appData.tasks array (to resolve selected IDs to task objects)
 *   onRequestComplete  – callback(tasksArray) to open the completion dialog
 */
export default function SelectionBar({ tasks, selectedTaskIds, setSelectedTaskIds, allTasks, onRequestComplete }) {
  const dueTasks = tasks.filter((t) => isTaskDueToday(t));
  const selectedDueCount = selectedTaskIds.filter((id) => dueTasks.some((t) => t.id === id)).length;
  const allDueSelected = dueTasks.length > 0 && selectedDueCount === dueTasks.length;
  const someSelected = selectedTaskIds.length > 0;

  if (dueTasks.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 0", marginBottom: 8,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => {
          if (allDueSelected) {
            setSelectedTaskIds([]);
          } else {
            setSelectedTaskIds(dueTasks.map((t) => t.id));
          }
        }} style={{
          ...btnBase, padding: "6px 14px", fontSize: 12, borderRadius: 8,
          background: allDueSelected ? C.ice : "transparent",
          color: allDueSelected ? C.navy : C.steel,
          border: `1.5px solid ${allDueSelected ? C.sky : C.border}`,
        }}>
          {allDueSelected ? "Clear all" : "Select all"}
        </button>
        {someSelected && (
          <span style={{ fontSize: 12, color: C.steel, fontWeight: 500 }}>
            {selectedTaskIds.length} selected
          </span>
        )}
      </div>

      {someSelected && (
        <button onClick={() => {
          const selected = allTasks.filter((t) => selectedTaskIds.includes(t.id) && isTaskDueToday(t));
          if (selected.length > 0) onRequestComplete(selected);
        }} style={{
          ...btnBase, padding: "8px 18px", fontSize: 13, borderRadius: 10,
          background: C.gradientPrimary, color: C.white,
          boxShadow: "0 2px 10px rgba(41,53,60,0.2)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <CheckCircleIcon done={true} size={16} /> Complete
        </button>
      )}
    </div>
  );
}
