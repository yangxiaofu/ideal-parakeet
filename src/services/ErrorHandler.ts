/**
 * Centralized error handling service - implements SRP and DRY principles
 * Replaces scattered console.error statements throughout the codebase
 */

export interface ErrorContext {
  operation: string;
  userId?: string;
  symbol?: string;
  calculationType?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableUserNotifications: boolean; 
  enableErrorReporting: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

class ErrorHandlerService {
  private config: ErrorHandlerConfig = {
    enableConsoleLogging: true,
    enableUserNotifications: false, // TODO: Implement user notifications
    enableErrorReporting: false, // TODO: Implement error reporting service
    logLevel: 'error',
  };

  constructor(config?: Partial<ErrorHandlerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Handle calculation repository errors with context
   */
  handleRepositoryError(error: unknown, context: ErrorContext): Error {
    const errorMessage = this.extractErrorMessage(error);
    const enrichedError = new Error(`${context.operation} failed: ${errorMessage}`);
    
    this.logError(enrichedError, context);
    
    // TODO: Add user notifications when UI is ready
    // TODO: Add error reporting when service is configured
    
    return enrichedError;
  }

  /**
   * Handle React Query/cache errors
   */
  handleCacheError(error: unknown, context: ErrorContext): void {
    const errorMessage = this.extractErrorMessage(error);
    
    if (this.config.enableConsoleLogging) {
      console.warn(`⚠️  Cache operation failed: ${context.operation}`, {
        error: errorMessage,
        context,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Cache errors are typically non-critical, so we don't throw
    // The application should continue to function
  }

  /**
   * Handle calculation execution errors
   */
  handleCalculationError(error: unknown, context: ErrorContext): Error {
    const errorMessage = this.extractErrorMessage(error);
    const enrichedError = new Error(`Calculation failed (${context.calculationType}): ${errorMessage}`);
    
    this.logError(enrichedError, context);
    
    return enrichedError;
  }

  /**
   * Handle authentication/user context errors
   */
  handleAuthError(error: unknown, context: ErrorContext): Error {
    const errorMessage = this.extractErrorMessage(error);
    const enrichedError = new Error(`Authentication error: ${errorMessage}`);
    
    this.logError(enrichedError, context);
    
    return enrichedError;
  }

  /**
   * Log successful operations for debugging
   */
  logSuccess(message: string, context?: Partial<ErrorContext>): void {
    if (this.config.enableConsoleLogging && this.config.logLevel !== 'error') {
      console.log(`✅ ${message}`, context ? { context, timestamp: new Date().toISOString() } : '');
    }
  }

  /**
   * Log warning messages
   */
  logWarning(message: string, context?: Partial<ErrorContext>): void {
    if (this.config.enableConsoleLogging) {
      console.warn(`⚠️  ${message}`, context ? { context, timestamp: new Date().toISOString() } : '');
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }

  private logError(error: Error, context: ErrorContext): void {
    if (this.config.enableConsoleLogging) {
      console.error(`❌ ${error.message}`, {
        context,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerService({
  enableConsoleLogging: true,
  logLevel: import.meta.env.DEV ? 'debug' : 'error',
});

// Export class for testing
export { ErrorHandlerService };