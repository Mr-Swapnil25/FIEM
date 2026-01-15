/**
 * React Query Provider Configuration
 * 
 * Sets up QueryClient with proper cache configuration
 * for the EventEase application.
 * 
 * @module providers/QueryProvider
 */

import React from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { transformError } from '../services/errorHandler';

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

/**
 * Global error handler for queries
 */
function handleQueryError(error: unknown): void {
  const serviceError = transformError(error);
  console.error('[QueryError]', serviceError.userMessage, serviceError);
  
  // You could add toast notifications here
  // toast.error(serviceError.userMessage);
}

/**
 * Global error handler for mutations
 */
function handleMutationError(error: unknown): void {
  const serviceError = transformError(error);
  console.error('[MutationError]', serviceError.userMessage, serviceError);
  
  // You could add toast notifications here
  // toast.error(serviceError.userMessage);
}

/**
 * Create and configure QueryClient
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleQueryError,
    }),
    mutationCache: new MutationCache({
      onError: handleMutationError,
    }),
    defaultOptions: {
      queries: {
        // Stale time - how long data is considered fresh
        staleTime: 30 * 1000, // 30 seconds
        
        // Cache time - how long to keep inactive data
        gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
        
        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          const serviceError = transformError(error);
          if (['permission', 'validation', 'not_found', 'auth'].includes(serviceError.category)) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch on window focus (good for real-time feel)
        refetchOnWindowFocus: true,
        
        // Refetch on reconnect
        refetchOnReconnect: true,
        
        // Don't refetch on mount if data is fresh
        refetchOnMount: true,
        
        // Network mode - always try to fetch, even offline (for cache)
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Retry mutations only once
        retry: 1,
        retryDelay: 1000,
        
        // Network mode
        networkMode: 'offlineFirst',
      },
    },
  });
}

// Create singleton instance
let queryClientInstance: QueryClient | null = null;

/**
 * Get or create QueryClient singleton
 */
export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider component that wraps the app
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
