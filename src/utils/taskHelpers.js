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

export function isTaskDueToday(task) {
  const s = task.scheduleConfig || {};
  const freq = s.frequency || task.schedule || "once";
  const now = new Date();
  const today = now.getDay();
  const dateNum = now.getDate();

  // Check task type constraints
  if (task.taskType === "one-time" && task.lastCompleted) return false;
  if (task.taskType === "temporary" && task.tempConfig) {
    const tc = task.tempConfig;
    if (tc.mode === "dateRange") {
      const start = new Date(tc.rangeStart + "T00:00:00");
      const end = new Date(tc.rangeEnd + "T23:59:59");
      if (now < start || now > end) return false;
    }
    if (tc.mode === "specificDates" && tc.dates?.length) {
      const todayStr = now.toISOString().slice(0, 10);
      if (!tc.dates.includes(todayStr)) return false;
    }
    if (tc.mode === "duration" && tc.startDate) {
      const start = new Date(tc.startDate + "T00:00:00");
      const days = tc.unit === "days" ? tc.count : tc.unit === "weeks" ? tc.count * 7 : tc.unit === "months" ? tc.count * 30 : tc.count * 365;
      const end = new Date(start.getTime() + days * 86400000);
      if (now < start || now > end) return false;
    }
  }

  // Check active range due config
  if (task.dueConfig?.type === "activeRange") {
    const start = new Date(task.dueConfig.rangeStart + "T00:00:00");
    const end = new Date(task.dueConfig.rangeEnd + "T23:59:59");
    if (now < start || now > end) return false;
  }

  // Check frequency
  if (freq === "once" || freq === "daily") {
    const last = task.lastCompleted ? new Date(task.lastCompleted) : null;
    if (!last) return true;
    return now.toDateString() !== last.toDateString();
  }
  if (freq === "weekdays") return today >= 1 && today <= 5 && !completedToday(task, now);
  if (freq === "weekends") return (today === 0 || today === 6) && !completedToday(task, now);
  if (freq === "weekly" && s.weeklyDays?.length) return s.weeklyDays.includes(today) && !completedToday(task, now);
  if (freq === "monthly" && s.monthlyDays?.length) return s.monthlyDays.includes(dateNum) && !completedToday(task, now);
  if (freq === "custom" && s.customInterval?.days && s.customInterval?.startDate) {
    const start = new Date(s.customInterval.startDate + "T00:00:00");
    const diffDays = Math.floor((now - start) / 86400000);
    if (diffDays < 0) return false;
    return diffDays % s.customInterval.days === 0 && !completedToday(task, now);
  }

  // Fallback for legacy string schedule
  const last = task.lastCompleted ? new Date(task.lastCompleted) : null;
  if (!last) return true;
  const diffMs = now - last;
  const diffDays = diffMs / 86400000;
  if (freq === "weekly") return diffDays >= 7;
  if (freq === "monthly") return diffDays >= 30;
  if (freq === "yearly") return diffDays >= 365;
  return true;
}

export { completedToday };

export function getTaskStatus(task) {
  if (!isTaskDueToday(task)) return "done";
  if (task.assignedTo && task.assignedTo.length > 0) return "assigned";
  return "unassigned";
}
