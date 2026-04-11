export function isTaskActiveOnDate(task, date) {
  const s = task.scheduleConfig || {};
  const freq = s.frequency || task.schedule || "once";
  const dow = date.getDay();
  const dom = date.getDate();
  const dateStr = date.toISOString().slice(0, 10);

  if (task.taskType === "unscheduled") return false;
  // Check task type constraints
  if (task.taskType === "one-time" && task.lastCompleted) return false;
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

  // Check specific due date
  if (task.dueConfig?.type === "date" || task.dueConfig?.type === "datetime") {
    if (task.dueConfig.date && task.dueConfig.date !== dateStr) return false;
    return true;
  }

  // Check frequency
  if (freq === "daily") return true;
  if (freq === "weekdays") return dow >= 1 && dow <= 5;
  if (freq === "weekends") return dow === 0 || dow === 6;
  if (freq === "weekly" && s.weeklyDays?.length) return s.weeklyDays.includes(dow);
  if (freq === "weekly") return dow === 1;
  if (freq === "monthly" && s.monthlyDays?.length) return s.monthlyDays.includes(dom);
  if (freq === "monthly") return dom === 1;
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
    if (task.createdAt) return date.toISOString().slice(0, 10) === task.createdAt.slice(0, 10);
    return false;
  }
  return false;
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
