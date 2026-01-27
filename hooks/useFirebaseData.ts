/**
 * React Query Hooks for Firebase Data - Backward Compatibility Layer
 * 
 * This file re-exports from the new modular structure.
 * The original 804-line file has been decomposed into domain-specific modules.
 * 
 * @deprecated Import from './queries' or specific modules instead
 * @module hooks/useFirebaseData
 */

// Re-export everything from the new modular index
export * from './queries';

// Error handling utility
import { transformError } from '../services/errorHandler';

/**
 * Hook to get error message from mutation error
 */
export function useErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  const serviceError = transformError(error);
  return serviceError.userMessage;
}

console.log('[useFirebaseData] Re-exporting from modular structure');
