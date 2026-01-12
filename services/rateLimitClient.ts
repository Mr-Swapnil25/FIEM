/**
 * Rate Limit Client Service
 * 
 * Client-side integration with Firebase Cloud Functions rate limiting
 * Provides utilities for checking rate limits before expensive operations
 */

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { app } from './firebase';

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitCheckResult {
  allowed: boolean;
  remaining?: number;
  retryAfter?: number;
}

interface RateLimitError {
  code: string;
  message: string;
  details?: {
    retryAfter?: number;
  };
}

// ============================================================================
// RATE LIMIT CLIENT
// ============================================================================

const functions = getFunctions(app);

/**
 * Check rate limit before performing an operation
 * Call this before expensive operations to prevent wasted requests
 */
export async function checkRateLimit(endpoint: string): Promise<RateLimitCheckResult> {
  try {
    const checkApiRateLimit = httpsCallable<{ endpoint: string }, RateLimitCheckResult>(
      functions,
      'checkApiRateLimit'
    );
    
    const result: HttpsCallableResult<RateLimitCheckResult> = await checkApiRateLimit({ endpoint });
    return result.data;
  } catch (error) {
    const err = error as RateLimitError;
    
    // Handle rate limit exceeded error
    if (err.code === 'functions/resource-exhausted') {
      return {
        allowed: false,
        retryAfter: err.details?.retryAfter || 60
      };
    }
    
    // For other errors, allow the request (fail open for better UX)
    console.warn('[RateLimit] Check failed, allowing request:', err.message);
    return { allowed: true };
  }
}

/**
 * Rate-limited wrapper for any async function
 * Automatically checks rate limit before execution
 */
export async function withRateLimit<T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const check = await checkRateLimit(endpoint);
  
  if (!check.allowed) {
    const error = new Error(`Rate limit exceeded. Please try again in ${check.retryAfter} seconds.`);
    (error as any).code = 'rate-limited';
    (error as any).retryAfter = check.retryAfter;
    throw error;
  }
  
  return fn();
}

/**
 * Call rate-limited auth endpoint
 */
export async function rateLimitedAuthRequest(
  action: 'login' | 'register' | 'password-reset'
): Promise<RateLimitCheckResult> {
  const auth = getAuth();
  const baseUrl = import.meta.env.PROD
    ? '/api/rate-limit/auth'
    : 'http://localhost:5001/future-project-148/us-central1/rateLimitedAuth';
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action })
    });
    
    if (response.status === 429) {
      const data = await response.json();
      return {
        allowed: false,
        retryAfter: data.retryAfter || 60
      };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return {
      allowed: true,
      remaining: data.remaining
    };
  } catch (error) {
    console.warn('[RateLimit] Auth check failed:', error);
    // Fail open for better UX
    return { allowed: true };
  }
}

/**
 * Call rate-limited booking endpoint
 */
export async function rateLimitedBookingRequest(
  action: 'create' | 'cancel'
): Promise<RateLimitCheckResult> {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  const baseUrl = import.meta.env.PROD
    ? '/api/rate-limit/booking'
    : 'http://localhost:5001/future-project-148/us-central1/rateLimitedBooking';
  
  try {
    const token = await user.getIdToken();
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    });
    
    if (response.status === 429) {
      const data = await response.json();
      return {
        allowed: false,
        retryAfter: data.retryAfter || 60
      };
    }
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return {
      allowed: true,
      remaining: data.remaining
    };
  } catch (error) {
    console.warn('[RateLimit] Booking check failed:', error);
    // Fail open for better UX
    return { allowed: true };
  }
}

// ============================================================================
// RATE LIMIT DISPLAY UTILITIES
// ============================================================================

/**
 * Format retry time for display
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const err = error as { code?: string; message?: string };
  
  return (
    err.code === 'rate-limited' ||
    err.code === 'resource-exhausted' ||
    err.code === 'functions/resource-exhausted' ||
    err.message?.toLowerCase().includes('rate limit') ||
    err.message?.toLowerCase().includes('too many requests')
  );
}

/**
 * Get retry time from rate limit error
 */
export function getRetryAfter(error: unknown): number {
  if (!error || typeof error !== 'object') return 60;
  
  const err = error as { retryAfter?: number; details?: { retryAfter?: number } };
  
  return err.retryAfter || err.details?.retryAfter || 60;
}

export default {
  checkRateLimit,
  withRateLimit,
  rateLimitedAuthRequest,
  rateLimitedBookingRequest,
  formatRetryTime,
  isRateLimitError,
  getRetryAfter
};
