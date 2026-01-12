/**
 * Firebase Cloud Functions - EventEase Production Security
 * 
 * Implements:
 * 1. Server-side rate limiting with sliding window algorithm
 * 2. IP-based and user-based limiting
 * 3. Endpoint-specific rate limits
 * 4. CSP violation reporting endpoint
 * 5. Monitoring and alerting
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  blockDurationMs: number; // How long to block after limit exceeded
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict limits
  'auth/login': {
    windowMs: 15 * 60 * 1000,     // 15 minutes
    maxRequests: 5,                // 5 attempts
    blockDurationMs: 30 * 60 * 1000 // 30 minute block
  },
  'auth/register': {
    windowMs: 60 * 60 * 1000,     // 1 hour
    maxRequests: 3,                // 3 registrations
    blockDurationMs: 24 * 60 * 60 * 1000 // 24 hour block
  },
  'auth/password-reset': {
    windowMs: 60 * 60 * 1000,     // 1 hour
    maxRequests: 3,                // 3 attempts
    blockDurationMs: 60 * 60 * 1000 // 1 hour block
  },
  
  // Booking endpoints - moderate limits
  'booking/create': {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 10,               // 10 bookings
    blockDurationMs: 5 * 60 * 1000 // 5 minute block
  },
  'booking/cancel': {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 5,                // 5 cancellations
    blockDurationMs: 5 * 60 * 1000 // 5 minute block
  },
  
  // API endpoints - general limits
  'api/general': {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 100,              // 100 requests
    blockDurationMs: 60 * 1000    // 1 minute block
  },
  
  // Admin endpoints - higher limits for admins
  'admin/events': {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 30,               // 30 requests
    blockDurationMs: 60 * 1000    // 1 minute block
  }
};

// ============================================================================
// SLIDING WINDOW RATE LIMITER
// ============================================================================

interface RateLimitEntry {
  requests: number[];     // Timestamps of requests
  blockedUntil?: number;  // Block expiry timestamp
  violations: number;     // Total violations count
}

/**
 * Check if request is rate limited using sliding window algorithm
 */
async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> {
  const now = Date.now();
  const docRef = db.collection('rateLimits').doc(`${endpoint}:${identifier}`);
  
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    let entry: RateLimitEntry = doc.exists 
      ? doc.data() as RateLimitEntry 
      : { requests: [], violations: 0 };
    
    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    // Clean old requests outside the window (sliding window)
    const windowStart = now - config.windowMs;
    entry.requests = entry.requests.filter(ts => ts > windowStart);
    
    // Check if limit exceeded
    if (entry.requests.length >= config.maxRequests) {
      entry.blockedUntil = now + config.blockDurationMs;
      entry.violations += 1;
      
      transaction.set(docRef, entry);
      
      // Log violation for monitoring
      console.warn(`[RateLimit] Violation: ${endpoint} by ${identifier}. Total violations: ${entry.violations}`);
      
      const retryAfter = Math.ceil(config.blockDurationMs / 1000);
      return { allowed: false, retryAfter };
    }
    
    // Add current request timestamp
    entry.requests.push(now);
    
    // Clear block if it has expired
    if (entry.blockedUntil && entry.blockedUntil <= now) {
      delete entry.blockedUntil;
    }
    
    transaction.set(docRef, entry);
    
    return { 
      allowed: true, 
      remaining: config.maxRequests - entry.requests.length 
    };
  });
}

/**
 * Get client identifier (IP + User ID for authenticated requests)
 */
function getClientIdentifier(request: functions.https.Request, userId?: string): string {
  // Get IP from various headers (considering proxies)
  const forwarded = request.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : request.ip || 'unknown';
  
  // Combine IP with user ID for authenticated requests
  return userId ? `${ip}:${userId}` : ip;
}

// ============================================================================
// RATE-LIMITED HTTP ENDPOINTS
// ============================================================================

/**
 * Rate-limited authentication middleware
 * Use this as a callable function or HTTP endpoint
 */
export const rateLimitedAuth = functions.https.onRequest(async (request, response) => {
  // CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const { action } = request.body;
  const endpoint = `auth/${action || 'login'}`;
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['api/general'];
  const identifier = getClientIdentifier(request);
  
  try {
    const result = await checkRateLimit(identifier, endpoint, config);
    
    if (!result.allowed) {
      response.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again later.`,
        retryAfter: result.retryAfter
      });
      response.set('Retry-After', String(result.retryAfter));
      return;
    }
    
    // Add rate limit headers
    response.set('X-RateLimit-Remaining', String(result.remaining));
    response.set('X-RateLimit-Reset', String(Date.now() + config.windowMs));
    
    // Forward to actual auth logic or return success
    response.status(200).json({ 
      success: true,
      message: 'Rate limit check passed',
      remaining: result.remaining
    });
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Rate-limited booking endpoint
 */
export const rateLimitedBooking = functions.https.onRequest(async (request, response) => {
  // CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  // Verify Firebase Auth token
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  let userId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    response.status(401).json({ error: 'Invalid token' });
    return;
  }
  
  const { action } = request.body;
  const endpoint = `booking/${action || 'create'}`;
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['api/general'];
  const identifier = getClientIdentifier(request, userId);
  
  try {
    const result = await checkRateLimit(identifier, endpoint, config);
    
    if (!result.allowed) {
      response.status(429).json({
        error: 'Too many requests',
        message: `You've made too many booking requests. Please wait ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      });
      response.set('Retry-After', String(result.retryAfter));
      return;
    }
    
    response.set('X-RateLimit-Remaining', String(result.remaining));
    response.status(200).json({ 
      success: true,
      remaining: result.remaining
    });
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CSP VIOLATION REPORTING ENDPOINT
// ============================================================================

interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'violated-directive': string;
    'blocked-uri': string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'original-policy': string;
  };
}

/**
 * CSP Violation Report Collector
 * Receives and logs CSP violations for monitoring
 */
export const cspReport = functions.https.onRequest(async (request, response) => {
  // Only accept POST
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }
  
  try {
    const report = request.body as CSPViolationReport;
    const violation = report['csp-report'];
    
    if (!violation) {
      response.status(400).send('Invalid report format');
      return;
    }
    
    // Log to Cloud Logging for monitoring
    console.warn('[CSP Violation]', {
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      timestamp: new Date().toISOString()
    });
    
    // Store in Firestore for analysis
    await db.collection('cspViolations').add({
      ...violation,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    response.status(204).send('');
  } catch (error) {
    console.error('[CSP Report] Error:', error);
    response.status(500).send('Error processing report');
  }
});

// ============================================================================
// RATE LIMIT MONITORING & CLEANUP
// ============================================================================

/**
 * Scheduled cleanup of old rate limit entries
 * Runs daily to prevent Firestore bloat
 */
export const cleanupRateLimits = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    const snapshot = await db.collection('rateLimits')
      .where('requests', '==', [])
      .limit(500)
      .get();
    
    const batch = db.batch();
    let deleted = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as RateLimitEntry;
      // Delete if no recent requests and not currently blocked
      if (data.requests.length === 0 && (!data.blockedUntil || data.blockedUntil < cutoff)) {
        batch.delete(doc.ref);
        deleted++;
      }
    });
    
    if (deleted > 0) {
      await batch.commit();
      console.log(`[RateLimit Cleanup] Deleted ${deleted} stale entries`);
    }
    
    return null;
  });

/**
 * Alert on high violation counts
 * Runs every hour to check for abuse patterns
 */
export const rateLimitAlerts = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    // Find entries with high violation counts
    const snapshot = await db.collection('rateLimits')
      .where('violations', '>=', 10)
      .limit(100)
      .get();
    
    const suspiciousEntries: Array<{ id: string; violations: number }> = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as RateLimitEntry;
      if (data.violations >= 10) {
        suspiciousEntries.push({
          id: doc.id,
          violations: data.violations
        });
      }
    });
    
    if (suspiciousEntries.length > 0) {
      // Log alert for Cloud Monitoring
      console.error('[RateLimit ALERT] High violation counts detected:', suspiciousEntries);
      
      // Store alert for dashboard
      await db.collection('alerts').add({
        type: 'rate_limit_abuse',
        entries: suspiciousEntries,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return null;
  });

// ============================================================================
// FIRESTORE SECURITY RULES HELPER
// ============================================================================

/**
 * Callable function to check rate limit before Firestore operations
 * Can be called from client before expensive operations
 */
export const checkApiRateLimit = functions.https.onCall(async (data, context) => {
  const endpoint = data.endpoint || 'api/general';
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['api/general'];
  
  // Get identifier from auth context
  const userId = context.auth?.uid;
  const ip = context.rawRequest.ip || 'unknown';
  const identifier = userId ? `${ip}:${userId}` : ip;
  
  const result = await checkRateLimit(identifier, endpoint, config);
  
  if (!result.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
      { retryAfter: result.retryAfter }
    );
  }
  
  return { allowed: true, remaining: result.remaining };
});
