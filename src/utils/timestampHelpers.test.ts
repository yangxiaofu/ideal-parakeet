import { describe, it, expect } from 'vitest';
import { safeTimestampToDate, isValidDate } from './timestampHelpers';

describe('Timestamp Helpers', () => {
  describe('safeTimestampToDate', () => {
    it('should handle Date objects', () => {
      const date = new Date('2024-01-01');
      const result = safeTimestampToDate(date);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(date.getTime());
    });

    it('should handle Firestore Timestamp-like objects', () => {
      const timestamp = {
        toDate: () => new Date('2024-01-01')
      };
      const result = safeTimestampToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should handle timestamp objects with seconds', () => {
      const timestamp = {
        seconds: 1704067200, // 2024-01-01 00:00:00 UTC
        nanoseconds: 0
      };
      const result = safeTimestampToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1704067200000);
    });

    it('should handle number timestamps (milliseconds)', () => {
      const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
      const result = safeTimestampToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('should handle number timestamps (seconds)', () => {
      const timestamp = 1704067200; // 2024-01-01 00:00:00 UTC (in seconds)
      const result = safeTimestampToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp * 1000);
    });

    it('should handle string timestamps', () => {
      const timestamp = '2024-01-01T00:00:00.000Z';
      const result = safeTimestampToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should return fallback for invalid values', () => {
      const fallback = new Date('2023-01-01');
      
      expect(safeTimestampToDate(null, fallback)).toBe(fallback);
      expect(safeTimestampToDate(undefined, fallback)).toBe(fallback);
      expect(safeTimestampToDate('invalid-date', fallback)).toBe(fallback);
      expect(safeTimestampToDate({}, fallback)).toBe(fallback);
    });

    it('should return current date as default fallback', () => {
      const before = Date.now();
      const result = safeTimestampToDate(null);
      const after = Date.now();
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2024-01-01'))).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate('2024-01-01')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate(123)).toBe(false);
    });
  });
});