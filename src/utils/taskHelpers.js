export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getScheduleLabel(task) {
  const s = task.scheduleConfig || {};
  const freq = s.frequency || task.schedule || "once";
  if (freq === "once") return "One-time";
  if (freq === "daily") return "Daily";
  if (freq === "weekdays") return "Weekdays";
  if (freq === "weekends") return "Weekends";
  if (freq === "weekly" && s.weeklyDays?.length) return s.weeklyDays.map((d) => DAY_NAMES[d]).join(", ");
  if (freq === "weekly") return "Weekly";
  if (freq === "monthly" && s.monthlyDays?.length) return "Monthly on " + s.monthlyDays.join(", ");
  if (freq === "monthly") return "Monthly";
  if (freq === "yearly") return "Yearly";
  if (freq === "custom" && s.customSummary) return s.customSummary;
  if (freq === "custom") return "Custom";
  return freq;
}

export function getTaskTypeLabel(task) {
  const t = task.taskType || "permanent";
  if (t === "permanent") return null;
  if (t === "one-time") return "One-time";
  if (t === "temporary") return "Temporary";
  if (t === "seasonal") return "Seasonal";
  return null;
}

export function getDueDateLabel(task) {
  const d = task.dueConfig || {};
  if (d.type === "datetime" && d.date) return `Due ${d.date}${d.time ? " " + d.time : ""}`;
  if (d.type === "date" && d.date) return `Due ${d.date}`;
  if (d.type === "activeRange" && d.rangeStart) return `Active ${d.rangeStart} – ${d.rangeEnd}`;
  return null;
}

function completedToday(task, now) {
  if (!task.lastCompleted) return false;
  return new Date(task.lastCompleted).toDateString() === now.toDateString();
}

/**
 * Core scheduling logic: Is this task scheduled to occur on the given date?
 * This is a PURE scheduling check — it does NOT consider completion status.
 * Used by both isTaskDueToday (adds completion checks) and isTaskActiveOnDate (calendar).
 *
 * @param {Object} task - A task object from appData.tasks
 * @param {Date} date - The date to check
 * @returns {boolean} Whether the task is scheduled for this date
 */
export function isTaskScheduledForDate(task, date) {
  const s = task.scheduleConfig || {};
  const freq = s.frequency || task.schedule || "once";
  const dow = date.getDay();
  const dom = date.getDate();
  const dateStr = date.toISOString().slice(0, 10);

  // Unscheduled tasks are never "scheduled" for any date
  if (task.taskType === "unscheduled") return false;

  // Check task type constraints (temporary tasks have date boundaries)
  if (task.taskType === "temporary" && task.tempConfig) {
    const tc = task.tempConfig;
    if (tc.mode === "dateRange" && tc.rangeStart && tc.rangeEnd) {
      if (dateStr < tc.rangeStart || dateStr > tc.rangeEnd) return false;
    }
    if (tc.mode === "specificDates" && tc.dates?.length) {
      if (!tc.dates.includes(dateStr)) return false;
    }
    if (tc.mode === "duration" && tc.startDate) {
      const start = new Date(tc.startDate + "T00:00:00");
      const days = tc.unit === "days" ? tc.count : tc.unit === "weeks" ? tc.count * 7 : tc.unit === "months" ? tc.count * 30 : tc.count * 365;
      const end = new Date(start.getTime() + days * 86400000);
      if (date < start || date > end) return false;
    }
  }

  // Check active range due config
  if (task.dueConfig?.type === "activeRange" && task.dueConfig.rangeStart) {
    if (dateStr < task.dueConfig.rangeStart || dateStr > task.dueConfig.rangeEnd) return false;
  }

  // Check specific due date (the task is only scheduled on that exact date)
  if (task.dueConfig?.type === "date" || task.dueConfig?.type === "datetime") {
    if (task.dueConfig.date && task.dueConfig.date !== dateStr) return false;
    return true;
  }

  // Check frequency
  if (freq === "daily") return true;
  if (freq === "weekdays") return dow >= 1 && dow <= 5;
  if (freq === "weekends") return dow === 0 || dow === 6;
  if (freq === "weekly" && s.weeklyDays?.length) return s.weeklyDays.includes(dow);
  if (freq === "weekly") return dow === 1; // default: Monday
  if (freq === "monthly" && s.monthlyDays?.length) return s.monthlyDays.includes(dom);
  if (freq === "monthly") return dom === 1; // default: 1st of month
  if (freq === "yearly") {
    const m = s.yearlyMonth ?? 0;
    const d = s.yearlyDay ?? 1;
    return date.getMonth() === m && dom === d;
  }
  if (freq === "custom" && s.customInterval?.days && s.customInterval?.startDate) {
    const start = new Date(s.customInterval.startDate + "T00:00:00");
    const diffDays = Math.floor((date - start) / 86400000);
    if (diffDays < 0) return false;
    return diffDays % s.customInterval.days === 0;
  }
  if (freq === "once") {
    // One-time tasks: scheduled on their creation date
    if (task.createdAt) return dateStr === task.createdAt.slice(0, 10);
    return false;
  }

  return false;
}

/**
 * Is this task due today? Combines scheduling logic with completion checks.
 * A task is "due today" if it is scheduled for today AND has not been completed today.
 */
export function isTaskDueToday(task) {
  const now = new Date();

  // One-time tasks that have ever been completed are done forever
  if (task.taskType === "one-time" && task.lastCompleted) return false;

  // Check if the task is scheduled for today
  if (!isTaskScheduledForDate(task, now)) return false;

  // Check if it was already completed today
  if (completedToday(task, now)) return false;

  return true;
}

export { completedToday };

export function getTaskStatus(task) {
  if (!isTaskDueToday(task)) return "done";
  if (task.assignedTo && task.assignedTo.length > 0) return "assigned";
  return "unassigned";
}
