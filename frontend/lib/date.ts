import { differenceInDays, differenceInHours, differenceInMinutes, isPast, parseISO } from "date-fns";

/**
 * Formats the time remaining until a future date in a human-readable format.
 * Returns "Ended" if the date is in the past or if status is not active.
 *
 * @param endAtString - ISO 8601 date string (UTC)
 * @param isActive - Optional flag to indicate if the auction is active
 * @returns Formatted string like "Ends in 3 days and 54 minutes" or "Ended"
 *
 * @example
 * formatTimeRemaining("2026-01-15T10:00:00Z") // "Ends in 3 days and 54 minutes"
 * formatTimeRemaining("2026-01-10T10:00:00Z", false) // "Ended"
 */
export function formatTimeRemaining(endAtString: string, isActive: boolean = true): string {
  const endDate = parseISO(endAtString);
  const isEnded = isPast(endDate);

  if (isEnded || !isActive) {
    return "Ended";
  }

  const now = new Date();
  const days = differenceInDays(endDate, now);
  const hours = differenceInHours(endDate, now) % 24;
  const minutes = differenceInMinutes(endDate, now) % 60;

  // Format based on time remaining
  if (days > 0) {
    return `Ends in ${days} ${days === 1 ? 'day' : 'days'} and ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  if (hours > 0) {
    return `Ends in ${hours} ${hours === 1 ? 'hour' : 'hours'} and ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  return `Ends in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/**
 * Formats the time remaining in a compact format for card displays.
 *
 * @param endAtString - ISO 8601 date string (UTC)
 * @param isActive - Optional flag to indicate if the auction is active
 * @returns Formatted string like "3d 5h" or "2h 30m" or "Ended"
 *
 * @example
 * formatTimeRemainingCompact("2026-01-15T10:00:00Z") // "3d 5h"
 * formatTimeRemainingCompact("2026-01-10T12:30:00Z") // "2h 30m"
 */
export function formatTimeRemainingCompact(endAtString: string, isActive: boolean = true): string {
  const endDate = parseISO(endAtString);
  const isEnded = isPast(endDate);

  if (isEnded || !isActive) {
    return "Ended";
  }

  const now = new Date();
  const days = differenceInDays(endDate, now);
  const hours = differenceInHours(endDate, now) % 24;
  const minutes = differenceInMinutes(endDate, now) % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
