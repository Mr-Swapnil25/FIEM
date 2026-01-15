/**
 * Firebase Error Handler
 * 
 * Comprehensive error handling for all Firebase operations.
 * Provides:
 * - Firebase error transformation to user-friendly messages
 * - Retry logic with exponential backoff
 * - Error categorization for different handling strategies
 * - Structured logging
 * - Offline detection
 * 
 * @module services/errorHandler
 */

// ============================================================================
// TYPE DEFINITIONS (Local to avoid circular imports)
// ============================================================================

/**
 * Firebase error codes
 */
export type FirebaseErrorCode = 
  // Auth errors
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/weak-password'
  | 'auth/user-disabled'
  | 'auth/too-many-requests'
  | 'auth/invalid-credential'
  | 'auth/popup-closed-by-user'
  | 'auth/popup-blocked'
  | 'auth/account-exists-with-different-credential'
  | 'auth/operation-not-allowed'
  | 'auth/network-request-failed'
  | 'auth/requires-recent-login'
  // Firestore errors
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated'
  // Storage errors
  | 'storage/object-not-found'
  | 'storage/unauthorized'
  | 'storage/canceled'
  | 'storage/unknown'
  | 'storage/quota-exceeded'
  | 'storage/retry-limit-exceeded'
  // Generic
  | 'unknown'
  | string;

/**
 * Error category for handling
 */
export type ErrorCategory = 
  | 'network'
  | 'permission'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'storage'
  | 'auth'
  | 'unknown';

/**
 * Structured Firebase error
 */
export interface FirebaseServiceError {
  code: FirebaseErrorCode;
  message: string;
  category: ErrorCategory;
  userMessage: string;
  retryable: boolean;
  originalError?: unknown;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Operation context for logging
 */
export interface OperationContext {
  operation: string;
  collection?: string;
  documentId?: string;
  userId?: string;
  timestamp: string;
  attempt?: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

// ============================================================================
// ERROR CODE MAPPINGS
// ============================================================================

/**
 * Map Firebase error codes to error categories
 */
const ERROR_CODE_TO_CATEGORY: Record<string, ErrorCategory> = {
  // Auth errors
  'auth/email-already-in-use': 'conflict',
  'auth/invalid-email': 'validation',
  'auth/user-not-found': 'not_found',
  'auth/wrong-password': 'auth',
  'auth/weak-password': 'validation',
  'auth/user-disabled': 'permission',
  'auth/too-many-requests': 'rate_limit',
  'auth/invalid-credential': 'auth',
  'auth/popup-closed-by-user': 'auth',
  'auth/popup-blocked': 'auth',
  'auth/account-exists-with-different-credential': 'conflict',
  'auth/operation-not-allowed': 'permission',
  'auth/network-request-failed': 'network',
  'auth/requires-recent-login': 'auth',
  
  // Firestore errors
  'permission-denied': 'permission',
  'not-found': 'not_found',
  'already-exists': 'conflict',
  'resource-exhausted': 'rate_limit',
  'failed-precondition': 'validation',
  'aborted': 'conflict',
  'out-of-range': 'validation',
  'unimplemented': 'unknown',
  'internal': 'unknown',
  'unavailable': 'network',
  'data-loss': 'unknown',
  'unauthenticated': 'auth',
  
  // Storage errors
  'storage/object-not-found': 'not_found',
  'storage/unauthorized': 'permission',
  'storage/canceled': 'unknown',
  'storage/unknown': 'unknown',
  'storage/quota-exceeded': 'rate_limit',
  'storage/retry-limit-exceeded': 'network'
};

/**
 * User-friendly error messages for Firebase error codes
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/email-already-in-use': 'This email is already registered. Please sign in or use a different email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with this email. Please check your email or create an account.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/invalid-credential': 'Invalid email or password. Please check your credentials.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
  'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups for this site.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  
  // Firestore errors
  'permission-denied': 'You don\'t have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Service is temporarily busy. Please try again in a few minutes.',
  'failed-precondition': 'The operation cannot be performed. Please refresh and try again.',
  'aborted': 'The operation was interrupted. Please try again.',
  'out-of-range': 'The provided value is out of the allowed range.',
  'unimplemented': 'This feature is not yet available.',
  'internal': 'An internal error occurred. Please try again.',
  'unavailable': 'The service is temporarily unavailable. Please try again shortly.',
  'data-loss': 'Some data may have been lost. Please try again.',
  'unauthenticated': 'Please sign in to continue.',
  
  // Storage errors
  'storage/object-not-found': 'The file was not found.',
  'storage/unauthorized': 'You don\'t have permission to access this file.',
  'storage/canceled': 'The upload was cancelled.',
  'storage/unknown': 'An error occurred with file storage.',
  'storage/quota-exceeded': 'Storage quota exceeded. Please contact support.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple attempts. Please try again.',
  
  // Generic
  'unknown': 'An unexpected error occurred. Please try again.'
};

/**
 * Retryable error codes
 */
const RETRYABLE_ERRORS: Set<string> = new Set([
  'unavailable',
  'resource-exhausted',
  'internal',
  'aborted',
  'auth/network-request-failed',
  'storage/retry-limit-exceeded',
  'auth/too-many-requests'
]);

// ============================================================================
// ERROR TYPE GUARDS
// ============================================================================

/**
 * Check if error is a Firebase Auth error
 */
interface FirebaseAuthError {
  code: string;
  message: string;
  name?: string;
}

export function isFirebaseAuthError(error: unknown): error is FirebaseAuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as FirebaseAuthError).code === 'string' &&
    typeof (error as FirebaseAuthError).message === 'string'
  );
}

/**
 * Check if error is a Firestore error
 */
interface FirestoreError {
  code: string;
  message: string;
  name: string;
}

export function isFirestoreError(error: unknown): error is FirestoreError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('network')) {
    return true;
  }
  if (isFirebaseAuthError(error)) {
    return error.code === 'auth/network-request-failed';
  }
  if (isFirestoreError(error)) {
    return error.code === 'unavailable';
  }
  return false;
}

/**
 * Check if we're currently offline
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

// ============================================================================
// ERROR TRANSFORMATION
// ============================================================================

/**
 * Extract error code from various error types
 */
function extractErrorCode(error: unknown): string {
  if (isFirebaseAuthError(error) || isFirestoreError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    // Check for error code in message
    const match = error.message.match(/\[(\w+\/[\w-]+)\]/);
    if (match) return match[1];
  }
  return 'unknown';
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

/**
 * Get error category from error code
 */
function getErrorCategory(code: string): ErrorCategory {
  return ERROR_CODE_TO_CATEGORY[code] || 'unknown';
}

/**
 * Get user-friendly message for error code
 */
function getUserFriendlyMessage(code: string, originalMessage: string): string {
  return USER_FRIENDLY_MESSAGES[code] || originalMessage || USER_FRIENDLY_MESSAGES['unknown'];
}

/**
 * Check if error is retryable
 */
function isRetryable(code: string, category: ErrorCategory): boolean {
  if (RETRYABLE_ERRORS.has(code)) return true;
  if (category === 'network') return true;
  if (category === 'rate_limit') return true;
  return false;
}

/**
 * Transform any error into a structured FirebaseServiceError
 */
export function transformError(error: unknown): FirebaseServiceError {
  const code = extractErrorCode(error);
  const message = extractErrorMessage(error);
  const category = getErrorCategory(code);
  const userMessage = getUserFriendlyMessage(code, message);
  const retryable = isRetryable(code, category);

  return {
    code: code as FirebaseErrorCode,
    message,
    category,
    userMessage,
    retryable,
    originalError: error
  };
}

// ============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================================================

/**
 * Calculate delay for next retry with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: base * multiplier^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: Partial<OperationContext>
): Promise<T> {
  let lastError: FirebaseServiceError | null = null;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      // Check if offline before attempting
      if (isOffline()) {
        throw new Error('No internet connection');
      }
      
      const result = await operation();
      
      // Log success after retries
      if (attempt > 0) {
        logInfo('Operation succeeded after retry', {
          ...context,
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        } as OperationContext);
      }
      
      return result;
    } catch (error) {
      lastError = transformError(error);
      
      // Log the error
      logError(lastError, {
        ...context,
        attempt: attempt + 1,
        timestamp: new Date().toISOString()
      } as OperationContext);
      
      // Check if we should retry
      if (!lastError.retryable || attempt === config.maxAttempts - 1) {
        break;
      }
      
      // Calculate and wait for retry delay
      const delay = calculateRetryDelay(attempt, config);
      logInfo(`Retrying in ${delay}ms...`, {
        ...context,
        attempt: attempt + 1,
        timestamp: new Date().toISOString()
      } as OperationContext);
      
      await sleep(delay);
    }
  }
  
  // All retries failed
  throw lastError;
}

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context?: Partial<OperationContext>
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    const serviceError = transformError(error);
    logError(serviceError, {
      ...context,
      timestamp: new Date().toISOString()
    } as OperationContext);
    throw serviceError;
  }
}

/**
 * Execute operation with both retry and timeout
 */
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: Partial<OperationContext>
): Promise<T> {
  return withRetry(
    () => withTimeout(operation, timeoutMs, context),
    retryConfig,
    context
  );
}

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: OperationContext;
  error?: FirebaseServiceError;
}

// Log buffer for potential server-side reporting
const LOG_BUFFER_SIZE = 100;
const logBuffer: LogEntry[] = [];

/**
 * Add entry to log buffer
 */
function addToLogBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

/**
 * Format log message with context
 */
function formatLogMessage(message: string, context?: OperationContext): string {
  if (!context) return message;
  
  const parts = [message];
  if (context.operation) parts.push(`op=${context.operation}`);
  if (context.collection) parts.push(`col=${context.collection}`);
  if (context.documentId) parts.push(`doc=${context.documentId}`);
  if (context.attempt) parts.push(`attempt=${context.attempt}`);
  
  return parts.join(' | ');
}

/**
 * Log debug message
 */
export function logDebug(message: string, context?: OperationContext): void {
  if (import.meta.env.DEV) {
    console.debug(`[Firebase Debug] ${formatLogMessage(message, context)}`);
  }
  addToLogBuffer({
    level: 'debug',
    message,
    timestamp: new Date().toISOString(),
    context
  });
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: OperationContext): void {
  console.info(`[Firebase] ${formatLogMessage(message, context)}`);
  addToLogBuffer({
    level: 'info',
    message,
    timestamp: new Date().toISOString(),
    context
  });
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: OperationContext): void {
  console.warn(`[Firebase Warning] ${formatLogMessage(message, context)}`);
  addToLogBuffer({
    level: 'warn',
    message,
    timestamp: new Date().toISOString(),
    context
  });
}

/**
 * Log error with full context
 */
export function logError(error: FirebaseServiceError, context?: OperationContext): void {
  const message = `${error.userMessage} (${error.code})`;
  console.error(`[Firebase Error] ${formatLogMessage(message, context)}`, error.originalError);
  addToLogBuffer({
    level: 'error',
    message,
    timestamp: new Date().toISOString(),
    context,
    error
  });
}

/**
 * Get recent error logs
 */
export function getRecentErrors(count: number = 10): LogEntry[] {
  return logBuffer
    .filter(entry => entry.level === 'error')
    .slice(-count);
}

/**
 * Get all recent logs
 */
export function getRecentLogs(count: number = 50): LogEntry[] {
  return logBuffer.slice(-count);
}

/**
 * Clear log buffer
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Handle error and return user-friendly message
 */
export function handleError(error: unknown, defaultMessage?: string): string {
  const serviceError = transformError(error);
  logError(serviceError);
  return serviceError.userMessage || defaultMessage || 'An error occurred';
}

/**
 * Create an error result for service functions
 */
export function createErrorResult<T>(error: unknown): { success: false; error: string; data?: T } {
  const serviceError = transformError(error);
  return {
    success: false,
    error: serviceError.userMessage
  };
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Partial<OperationContext>
): (...args: T) => Promise<{ success: boolean; data?: R; error?: string }> {
  return async (...args: T) => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (error) {
      const serviceError = transformError(error);
      logError(serviceError, {
        ...context,
        timestamp: new Date().toISOString()
      } as OperationContext);
      return { success: false, error: serviceError.userMessage };
    }
  };
}

// ============================================================================
// OFFLINE HANDLING
// ============================================================================

type OfflineCallback = (isOffline: boolean) => void;
const offlineCallbacks: Set<OfflineCallback> = new Set();

/**
 * Subscribe to online/offline status changes
 */
export function onConnectivityChange(callback: OfflineCallback): () => void {
  offlineCallbacks.add(callback);
  
  // Call immediately with current status
  callback(isOffline());
  
  // Return unsubscribe function
  return () => {
    offlineCallbacks.delete(callback);
  };
}

/**
 * Initialize connectivity listeners
 */
export function initConnectivityListeners(): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('online', () => {
    logInfo('Connection restored');
    offlineCallbacks.forEach(cb => cb(false));
  });
  
  window.addEventListener('offline', () => {
    logWarn('Connection lost');
    offlineCallbacks.forEach(cb => cb(true));
  });
}

// Initialize listeners when module loads
if (typeof window !== 'undefined') {
  initConnectivityListeners();
}
