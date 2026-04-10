export async function parseCustomSchedule(description) {
  // AI parsing disabled — return a basic fallback
  return {
    summary: description.trim() || "Custom schedule",
    intervalDays: null,
    startDate: null,
    weeklyDays: null,
    monthlyDays: null,
    frequency: "custom",
  };
}