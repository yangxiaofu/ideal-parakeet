/**
 * Timestamp conversion utilities for Firestore data
 * Handles various timestamp formats that Firestore might return
 */

/**
 * Safely converts various timestamp formats to JavaScript Date objects
 * Handles Firestore Timestamps, Date objects, numbers, strings, etc.
 */
export function safeTimestampToDate(timestamp: unknown, fallback: Date = new Date()): Date {
  if (!timestamp) return fallback;
  
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? fallback : timestamp;
  }
  
  // If it's a Firestore Timestamp with toDate method
  if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
    try {
      const date = (timestamp as { toDate(): Date }).toDate();
      return isNaN(date.getTime()) ? fallback : date;
    } catch (error) {
      console.warn('Failed to convert Firestore timestamp:', error);
      return fallback;
    }
  }
  
  // If it's a timestamp-like object with seconds and nanoseconds (Firestore format)
  if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
    try {
      const ts = timestamp as { seconds: number; nanoseconds?: number };
      const date = new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
      return isNaN(date.getTime()) ? fallback : date;
    } catch (error) {
      console.warn('Failed to convert timestamp object:', error);
      return fallback;
    }
  }
  
  // If it's a number (Unix timestamp in milliseconds)
  if (typeof timestamp === 'number') {
    try {
      // Handle both seconds and milliseconds timestamps
      const date = new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
      return isNaN(date.getTime()) ? fallback : date;
    } catch (error) {
      console.warn('Failed to convert timestamp number:', timestamp);
      return fallback;
    }
  }
  
  // If it's a string that can be parsed as a date
  if (typeof timestamp === 'string') {
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? fallback : date;
    } catch (error) {
      console.warn('Failed to parse timestamp string:', timestamp);
      return fallback;
    }
  }
  
  // Unknown format
  console.warn('Unknown timestamp format, using fallback:', {
    timestamp,
    type: typeof timestamp,
    fallback
  });
  return fallback;
}

/**
 * Validates that a value is a valid Date object
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Converts a Date object to Firestore Timestamp for consistent storage
 */
export function dateToFirestoreTimestamp(date: Date) {
  // Import Timestamp dynamically to avoid circular dependencies
  const { Timestamp } = require('firebase/firestore');
  return Timestamp.fromDate(date);
}

/**
 * Safe date comparison that handles various timestamp formats
 */
export function compareDates(a: unknown, b: unknown): number {
  const dateA = safeTimestampToDate(a);
  const dateB = safeTimestampToDate(b);
  return dateA.getTime() - dateB.getTime();
}