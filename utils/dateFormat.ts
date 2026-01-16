/**
 * Date Formatting Utilities
 * 
 * Consolidated from duplicate implementations across 10+ files.
 * Phase 3 Remediation: Duplicate consolidation
 */

/**
 * Format a date string to "Mon DD" format
 * @param dateString - ISO date string or date-parseable string
 * @returns Formatted date string (e.g., "Jan 15")
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate().toString().padStart(2, '0');
    return `${month} ${day}`;
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to time format "H:MM AM/PM"
 * @param dateString - ISO date string or date-parseable string
 * @returns Formatted time string (e.g., "9:30 AM")
 */
export function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to full date format "Month DD, YYYY"
 * @param dateString - ISO date string or date-parseable string
 * @returns Formatted date string (e.g., "January 15, 2025")
 */
export function formatFullDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to short format for exports "Mon DD, YYYY"
 * @param dateString - ISO date string or date-parseable string
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to combined date+time format "Day, Mon DD • H:MM AM/PM"
 * Used in Dashboard and event cards
 * @param dateString - ISO date string or date-parseable string
 * @returns Formatted date+time string (e.g., "Sun, Jan 15 • 9:30 AM")
 */
export function formatDateWithTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day}, ${monthDay} • ${time}`;
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to relative format (e.g., "2 days ago", "in 3 hours")
 * @param dateString - ISO date string or date-parseable string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    
    if (Math.abs(diffMinutes) < 60) {
      return diffMinutes > 0 ? `in ${diffMinutes} minutes` : `${Math.abs(diffMinutes)} minutes ago`;
    }
    if (Math.abs(diffHours) < 24) {
      return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
    }
    return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
  } catch {
    return dateString;
  }
}
