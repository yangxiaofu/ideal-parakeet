/**
 * Firestore data sanitization helpers
 * Prevents common Firestore data validation errors
 */

/**
 * Sanitizes an object for Firestore by removing undefined values
 * Firestore doesn't accept undefined values - they must be null or omitted
 */
export function sanitizeForFirestore(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Skip undefined values entirely (don't set to null)
      continue;
    }
    
    if (value === null) {
      // Keep null values as-is
      sanitized[key] = null;
    } else if (typeof value === 'string') {
      // Only include non-empty strings
      if (value.trim() !== '') {
        sanitized[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Keep arrays, but sanitize their contents
      sanitized[key] = value.filter(item => item !== undefined);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      const nestedSanitized = sanitizeForFirestore(value as Record<string, unknown>);
      if (Object.keys(nestedSanitized).length > 0) {
        sanitized[key] = nestedSanitized;
      }
    } else {
      // Include all other values (numbers, booleans, etc.)
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validates that an object is safe for Firestore storage
 * Throws an error if invalid data is found
 */
export function validateForFirestore(obj: Record<string, unknown>, path = ''): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (value === undefined) {
      throw new Error(`Firestore validation failed: undefined value at ${fullPath}`);
    }
    
    if (typeof value === 'function') {
      throw new Error(`Firestore validation failed: function at ${fullPath}`);
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively validate nested objects
      validateForFirestore(value as Record<string, unknown>, fullPath);
    }
  }
}

/**
 * Creates a safe Firestore document from user input
 */
export function createFirestoreDocument(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = sanitizeForFirestore(data);
  validateForFirestore(sanitized);
  return sanitized;
}