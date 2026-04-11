// ─── Design Tokens ─────────────────────────────────────────────
export const C = {
  dark: "#29353C",
  navy: "#44576D",
  steel: "#768A96",
  sky: "#AAC7D8",
  ice: "#DFEBF6",
  mist: "#E6E6E6",
  white: "#FFFFFF",
  bg: "#F4F7FA",
  text: "#29353C",
  textMuted: "#768A96",
  border: "rgba(118,138,150,0.18)",
  borderLight: "rgba(223,235,246,0.5)",
  cardBg: "rgba(255,255,255,0.72)",
  danger: "#C0392B",
  glow: "rgba(170,199,216,0.35)",
  gradientPrimary: "linear-gradient(135deg, #44576D 0%, #29353C 100%)",
  gradientLight: "linear-gradient(160deg, #DFEBF6 0%, #F4F7FA 50%, #FFFFFF 100%)",
  gradientAccent: "linear-gradient(135deg, #768A96 0%, #44576D 100%)",
  gradientSubtle: "linear-gradient(180deg, rgba(223,235,246,0.3) 0%, rgba(244,247,250,0) 100%)",
};

export const FREQ_COLORS = {
  daily: "#5B9BD5",
  weekdays: "#7B68EE",
  weekends: "#E67E22",
  weekly: "#2ECC71",
  monthly: "#E74C3C",
  yearly: "#9B59B6",
  once: "#F39C12",
  custom: "#1ABC9C",
};

export const getFreqColor = (task) => {
  const freq = task?.scheduleConfig?.frequency || task?.schedule || "once";
  return FREQ_COLORS[freq] || "#44576D";
};

export const getFreqLabel = (freq) => {
  const labels = { daily: "Daily", weekdays: "Weekdays", weekends: "Weekends", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", once: "One Time", custom: "Custom" };
  return labels[freq] || freq;
};

export const font = "'Outfit', sans-serif";
export const fontDisplay = "'Playfair Display', serif";
