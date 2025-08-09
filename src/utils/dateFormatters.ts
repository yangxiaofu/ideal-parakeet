/**
 * Date formatting utilities for user-friendly display
 */

/**
 * Format a date to show relative time (e.g., "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format a date for display with time (e.g., "Dec 8, 2024 at 3:45 PM")
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a date for display (e.g., "December 8, 2024")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Get a short relative time format for compact display
 */
export function formatShortRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) {
    return 'now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 30) {
    return `${diffDays}d`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}y`;
  }
}

/**
 * Determine if a calculation is "fresh" (recent)
 */
export function isCalculationFresh(date: Date, freshnessDays: number = 1): boolean {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < freshnessDays;
}

/**
 * Get color class for timestamp freshness
 */
export function getTimestampColor(date: Date): string {
  const diffMs = new Date().getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 1) return 'text-green-600';      // Very fresh - green
  if (diffHours < 24) return 'text-blue-600';     // Recent - blue  
  if (diffHours < 168) return 'text-yellow-600';  // This week - yellow
  return 'text-gray-600';                         // Older - gray
}