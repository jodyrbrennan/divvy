/**
 * Shared notification creation helper.
 * Used by: Dashboard.jsx (handleComplete, handleBulkComplete, unscheduled form)
 *          and App.jsx (handleAddMember).
 *
 * This replaces the copy-pasted notification object construction found in 5+ places.
 */

import { uid } from "./storage";

/**
 * Create a notification object with all required fields.
 *
 * @param {string} type - Notification type: "completion", "task", "recognition", "relationship", etc.
 * @param {string} targetUserId - The user who should receive this notification
 * @param {string} fromUserId - The sender (a user ID or "system")
 * @param {string} rawMessage - The original message text
 * @param {Object} [meta={}] - Extra fields like taskId, completedBy, recognitionId, newMemberId, etc.
 * @returns {Object} A complete notification object ready to be added to appData.notifications
 */
export function createNotification(type, targetUserId, fromUserId, rawMessage, meta = {}) {
  return {
    id: uid(),
    type,
    targetUserId,
    fromUserId,
    rawMessage,
    message: rawMessage,
    read: false,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}
