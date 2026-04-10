const STORAGE_KEY = "divvy-app-data";

export const defaultData = () => ({
  household: null,
  users: [],
  tasks: [],
  events: [],
  completions: [],
  recognitions: [],
  rewards: [],
  redemptions: [],
  notifications: [],
  currentUserId: null,
});

export async function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultData();
  } catch {
    return defaultData();
  }
}

export async function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const makeInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();