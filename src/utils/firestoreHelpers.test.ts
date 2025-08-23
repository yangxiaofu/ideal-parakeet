import { describe, it, expect } from 'vitest';
import { sanitizeForFirestore, validateForFirestore } from './firestoreHelpers';

describe('Firestore Helpers', () => {
  describe('sanitizeForFirestore', () => {
    it('should remove undefined values', () => {
      const input = {
        name: 'Test',
        notes: undefined,
        tags: ['tag1', 'tag2'],
        count: 5,
      };
      
      const result = sanitizeForFirestore(input);
      
      expect(result).toEqual({
        name: 'Test',
        tags: ['tag1', 'tag2'],
        count: 5,
      });
      expect(result).not.toHaveProperty('notes');
    });

    it('should keep null values', () => {
      const input = {
        name: 'Test',
        description: null,
        count: 5,
      };
      
      const result = sanitizeForFirestore(input);
      
      expect(result).toEqual({
        name: 'Test',
        description: null,
        count: 5,
      });
    });

    it('should remove empty strings', () => {
      const input = {
        name: 'Test',
        notes: '',
        description: '   ',
        content: 'Valid content',
      };
      
      const result = sanitizeForFirestore(input);
      
      expect(result).toEqual({
        name: 'Test',
        content: 'Valid content',
      });
    });

    it('should filter undefined values from arrays', () => {
      const input = {
        tags: ['tag1', undefined, 'tag2', undefined],
        numbers: [1, 2, 3],
      };
      
      const result = sanitizeForFirestore(input);
      
      expect(result).toEqual({
        tags: ['tag1', 'tag2'],
        numbers: [1, 2, 3],
      });
    });

    it('should recursively sanitize nested objects', () => {
      const input = {
        user: {
          name: 'Test',
          email: undefined,
          profile: {
            bio: '',
            age: 25,
            notes: undefined,
          },
        },
        count: 5,
      };
      
      const result = sanitizeForFirestore(input);
      
      expect(result).toEqual({
        user: {
          name: 'Test',
          profile: {
            age: 25,
          },
        },
        count: 5,
      });
    });
  });

  describe('validateForFirestore', () => {
    it('should pass for valid data', () => {
      const validData = {
        name: 'Test',
        count: 5,
        active: true,
        tags: ['tag1', 'tag2'],
        metadata: null,
      };
      
      expect(() => validateForFirestore(validData)).not.toThrow();
    });

    it('should throw for undefined values', () => {
      const invalidData = {
        name: 'Test',
        notes: undefined,
      };
      
      expect(() => validateForFirestore(invalidData)).toThrow('undefined value at notes');
    });

    it('should throw for function values', () => {
      const invalidData = {
        name: 'Test',
        callback: () => {},
      };
      
      expect(() => validateForFirestore(invalidData)).toThrow('function at callback');
    });
  });
});