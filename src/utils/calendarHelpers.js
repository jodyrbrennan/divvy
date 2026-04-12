import { isTaskScheduledForDate } from "./taskHelpers";

/**
 * Is this task active/scheduled on a given date?
 * Now delegates to the shared isTaskScheduledForDate core function.
 * This wrapper exists so calendarHelpers remains a separate import
 * and the calendar can evolve its own logic if needed in the future.
 */
export function isTaskActiveOnDate(task, date) {
  return isTaskScheduledForDate(task, date);
}

export function getAssigneeForDate(task, date, users) {
  if (task.rotation?.length) {
    const dow = date.getDay();
    const match = task.rotation.find((r) => r.days?.includes(dow));
    if (match) return users.find((u) => u.id === match.userId);
  }
  if (task.assignedTo?.length === 1) return users.find((u) => u.id === task.assignedTo[0]);
  return null;
}
