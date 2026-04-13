/**
 * eventHelpers.js — Utility functions for the event system.
 *
 * Phase 3A: Handles date matching for events including:
 * - Single-date events
 * - Multi-day events (date range with endDate)
 * - Yearly recurring events (like birthdays)
 */

/**
 * Check if an event falls on a specific date string (YYYY-MM-DD).
 *
 * Handles three cases:
 * 1. Single-date event: event.date matches the target date
 * 2. Multi-day event: target date falls between event.date and event.endDate
 * 3. Yearly recurrence: the month and day match (ignoring year)
 *
 * @param {Object} event   — The event object
 * @param {string} dateStr — Target date as "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isEventOnDate(event, dateStr) {
  if (!event || !event.date || !dateStr) return false;

  const targetDate = new Date(dateStr + "T12:00:00");
  const eventDate = new Date(event.date + "T12:00:00");

  // For yearly recurring events, match month and day regardless of year
  if (event.recurrence === "yearly") {
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    const eventMonth = eventDate.getMonth();
    const eventDay = eventDate.getDate();

    // If the event has an end date, check the range within the same month/day window
    if (event.endDate) {
      const endDate = new Date(event.endDate + "T12:00:00");
      const startMonth = eventMonth;
      const startDay = eventDay;
      const endMonth = endDate.getMonth();
      const endDay = endDate.getDate();

      // Simple case: same month range
      if (startMonth === endMonth) {
        return targetMonth === startMonth && targetDay >= startDay && targetDay <= endDay;
      }
      // Cross-month range (e.g., Dec 28 - Jan 2)
      if (targetMonth === startMonth && targetDay >= startDay) return true;
      if (targetMonth === endMonth && targetDay <= endDay) return true;
      return false;
    }

    return targetMonth === eventMonth && targetDay === eventDay;
  }

  // Non-recurring: check exact date or date range
  if (event.endDate) {
    const endDate = new Date(event.endDate + "T12:00:00");
    return targetDate >= eventDate && targetDate <= endDate;
  }

  return dateStr === event.date;
}

/**
 * Get all events that fall on a specific date.
 *
 * @param {Array} events  — Array of all event objects
 * @param {string} dateStr — Target date as "YYYY-MM-DD"
 * @returns {Array} Events that are active on this date
 */
export function getEventsForDate(events, dateStr) {
  if (!events || !dateStr) return [];
  return events.filter((e) => isEventOnDate(e, dateStr));
}

/**
 * Get upcoming events within the next N days.
 * Useful for the Insight Engine and dashboard previews.
 *
 * @param {Array} events — Array of all event objects
 * @param {number} days  — Number of days to look ahead (default: 30)
 * @returns {Array} Objects with { event, dateStr } for each upcoming occurrence
 */
export function getUpcomingEvents(events, days = 30) {
  if (!events || events.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results = [];

  for (let d = 0; d <= days; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + d);
    const dateStr = checkDate.toISOString().slice(0, 10);

    for (const event of events) {
      if (isEventOnDate(event, dateStr)) {
        results.push({ event, dateStr, daysAway: d });
      }
    }
  }

  return results;
}
