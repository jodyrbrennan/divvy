/**
 * Shared user utility functions.
 * Used by: Dashboard.jsx, CalendarView.jsx, and potentially others.
 */

/**
 * Look up a user's display name by their ID.
 * @param {Array} users - The appData.users array
 * @param {string} id - The user ID to look up
 * @returns {string} The user's name, or "Unassigned" if not found
 */
export function getUserName(users, id) {
  return users.find((u) => u.id === id)?.name || "Unassigned";
}

/**
 * Create a new appData object with one user's fields updated.
 * This is a pure function — it does NOT call setAppData or saveData.
 * The caller is responsible for state updates and persistence.
 *
 * @param {Object} appData - The current appData object
 * @param {string} userId - The ID of the user to update
 * @param {Object} changes - An object of fields to merge into the user
 * @returns {Object} A new appData object with the user updated
 *
 * @example
 * // Simple field update:
 * const newData = updateUserInData(appData, userId, { name: "New Name" });
 *
 * // Nested field update (e.g. communicationProfile):
 * const user = appData.users.find(u => u.id === userId);
 * const newData = updateUserInData(appData, userId, {
 *   communicationProfile: { ...(user.communicationProfile || {}), tone: "gentle" }
 * });
 */
export function updateUserInData(appData, userId, changes) {
  const updatedUsers = appData.users.map((u) =>
    u.id === userId ? { ...u, ...changes } : u
  );
  return { ...appData, users: updatedUsers };
}
