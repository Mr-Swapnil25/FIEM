/**
 * Hybrid Service - Firebase Firestore API Layer
 * 
 * Provides a unified API for Firebase Firestore operations.
 * Migrated from DataConnect to pure Firestore implementation.
 * 
 * ZERO localStorage TOLERANCE - All data goes to Firebase
 * 
 * @module services/hybridService
 */

import { User, Event, Booking, Category, Notification, NotificationType, DashboardStats, Role } from '../types';
import * as firestore from './firestoreService';
import {
  withRetry,
  withTimeout,
  transformError,
  logInfo,
  logWarn,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type OperationContext
} from './errorHandler';

// ============================================================================
// LOCAL TYPE DEFINITIONS
// ============================================================================

/**
 * Data source indicator
 */
type DataSource = 'firestore' | 'cache';

/**
 * Hybrid service result with source tracking
 */
interface HybridResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: DataSource;
  fallbackUsed: boolean;
  latencyMs?: number;
}

/**
 * Fallback event for monitoring
 */
interface FallbackEvent {
  timestamp: string;
  operation: string;
  reason: string;
  originalError?: string;
  recovered: boolean;
}

/**
 * Service result with success/error pattern
 */
interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Hybrid service configuration
 */
interface HybridConfig {
  /** Timeout for operations in ms */
  timeout: number;
  /** Retry configuration */
  retry: RetryConfig;
  /** Enable fallback monitoring */
  monitorFallbacks: boolean;
  /** Maximum fallback events to store */
  maxFallbackEvents: number;
}

const DEFAULT_CONFIG: HybridConfig = {
  timeout: 30000,
  retry: DEFAULT_RETRY_CONFIG,
  monitorFallbacks: true,
  maxFallbackEvents: 100
};

let config: HybridConfig = { ...DEFAULT_CONFIG };

/**
 * Configure hybrid service
 */
export function configure(options: Partial<HybridConfig>): void {
  config = { ...config, ...options };
  logInfo(`Hybrid service configured (Firestore mode)`);
}

// ============================================================================
// FALLBACK MONITORING
// ============================================================================

const fallbackEvents: FallbackEvent[] = [];

/**
 * Record a fallback event
 */
function recordFallback(operation: string, reason: string, originalError?: string, recovered: boolean = true): void {
  if (!config.monitorFallbacks) return;

  const event: FallbackEvent = {
    timestamp: new Date().toISOString(),
    operation,
    reason,
    originalError,
    recovered
  };

  fallbackEvents.push(event);
  
  // Trim to max size
  if (fallbackEvents.length > config.maxFallbackEvents) {
    fallbackEvents.shift();
  }

  logWarn(`Fallback triggered for ${operation}: ${reason}`, {
    operation,
    timestamp: event.timestamp
  });
}

/**
 * Get recent fallback events
 */
export function getFallbackEvents(count: number = 20): FallbackEvent[] {
  return fallbackEvents.slice(-count);
}

/**
 * Get fallback statistics
 */
export function getFallbackStats(): {
  total: number;
  recovered: number;
  failed: number;
  byOperation: Record<string, number>;
} {
  const byOperation: Record<string, number> = {};
  let recovered = 0;
  let failed = 0;

  for (const event of fallbackEvents) {
    byOperation[event.operation] = (byOperation[event.operation] || 0) + 1;
    if (event.recovered) recovered++;
    else failed++;
  }

  return {
    total: fallbackEvents.length,
    recovered,
    failed,
    byOperation
  };
}

/**
 * Clear fallback events
 */
export function clearFallbackEvents(): void {
  fallbackEvents.length = 0;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Execute Firestore operation with retry and timeout
 */
async function executeWithFallback<T>(
  operation: string,
  _dataConnectFn: () => Promise<T>,  // Kept for backward compatibility, not used
  firestoreFn: () => Promise<T>,
  context?: Partial<OperationContext>
): Promise<HybridResult<T>> {
  const startTime = Date.now();
  const fullContext: OperationContext = {
    operation,
    timestamp: new Date().toISOString(),
    ...context
  };

  // Always use Firestore (DataConnect removed)
  try {
    const data = await withRetry(
      () => withTimeout(firestoreFn, config.timeout, fullContext),
      config.retry,
      fullContext
    );
    return {
      success: true,
      data,
      source: 'firestore',
      fallbackUsed: false,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    const serviceError = transformError(error);
    return {
      success: false,
      error: serviceError.userMessage,
      source: 'firestore',
      fallbackUsed: false,
      latencyMs: Date.now() - startTime
    };
  }
}

/**
 * Convert HybridResult to simple ServiceResult
 */
function toServiceResult<T>(result: HybridResult<T>): ServiceResult<T> {
  return {
    success: result.success,
    data: result.data,
    error: result.error
  };
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<HybridResult<User | null>> {
  return executeWithFallback(
    'getUserById',
    async () => undefined as any, // Was: dataConnect.getUserById(userId),
    async () => {
      const user = await firestore.getUserById(userId);
      return user ? mapFirestoreUserToUser(user) : null;
    },
    { documentId: userId, collection: 'users' }
  );
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<HybridResult<User | null>> {
  return executeWithFallback(
    'getUserByEmail',
    async () => undefined as any, // Was: dataConnect.getUserByEmail(email),
    async () => {
      const user = await firestore.getUserByEmail(email);
      return user ? mapFirestoreUserToUser(user) : null;
    },
    { collection: 'users' }
  );
}

/**
 * Create a new user
 */
export async function createUser(userId: string, data: Omit<User, 'id'>): Promise<HybridResult<User>> {
  return executeWithFallback(
    'createUser',
    async () => undefined as any, // Was: dataConnect.createUser(userId, data),
    async () => {
      await firestore.createUser(userId, {
        email: data.email,
        displayName: data.name,
        role: data.role as 'student' | 'admin' | 'super_admin',
        department: data.department,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        year: data.year,
        rollNo: data.rollNo,
        collegeIdUrl: data.collegeIdUrl
      });
      return { id: userId, ...data } as User;
    },
    { documentId: userId, collection: 'users' }
  );
}

/**
 * Update user profile
 */
export async function updateUser(userId: string, data: Partial<User>): Promise<HybridResult<void>> {
  return executeWithFallback(
    'updateUser',
    async () => {}, // Was: dataConnect.updateUser(userId, data); },
    async () => {
      await firestore.updateUser(userId, {
        displayName: data.name,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        department: data.department,
        year: data.year,
        rollNo: data.rollNo,
        collegeIdUrl: data.collegeIdUrl
      });
    },
    { documentId: userId, collection: 'users' }
  );
}

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<HybridResult<Event | null>> {
  return executeWithFallback(
    'getEventById',
    async () => undefined as any, // Was: dataConnect.getEventById(eventId),
    async () => {
      const event = await firestore.getEventById(eventId);
      return event ? mapFirestoreEventToEvent(event) : null;
    },
    { documentId: eventId, collection: 'events' }
  );
}

/**
 * List published events
 */
export async function listPublishedEvents(): Promise<HybridResult<Event[]>> {
  return executeWithFallback(
    'listPublishedEvents',
    async () => undefined as any, // Was: dataConnect.getPublishedEvents(),
    async () => {
      const events = await firestore.listPublishedEvents();
      return events.map(mapFirestoreEventToEvent);
    },
    { collection: 'events' }
  );
}

/**
 * Get events by organizer
 */
export async function getEventsByOrganizer(organizerId: string): Promise<HybridResult<Event[]>> {
  return executeWithFallback(
    'getEventsByOrganizer',
    async () => undefined as any, // Was: dataConnect.getEventsByOrganizer(organizerId),
    async () => {
      const events = await firestore.listEvents({ organizerId });
      return events.map(mapFirestoreEventToEvent);
    },
    { collection: 'events', userId: organizerId }
  );
}

/**
 * Create a new event
 */
export async function createEvent(data: {
  title: string;
  description: string;
  venue: string;
  adminId: string;
  eventDate: string;
  totalSlots: number;
  price: number;
  category: Event['category'];
  imageUrl?: string;
  status?: Event['status'];
  requiresApproval?: boolean;
}): Promise<HybridResult<{ id: string }>> {
  return executeWithFallback(
    'createEvent',
    async () => undefined as any, // DataConnect removed
    async () => {
      const eventId = await firestore.createEvent({
        title: data.title,
        description: data.description,
        date: firestore.toTimestamp(data.eventDate),
        time: '',
        location: data.venue,
        venue: data.venue,
        categoryId: '',
        imageUrl: data.imageUrl,
        organizerId: data.adminId,
        capacity: data.totalSlots,
        price: data.price,
        isFree: data.price === 0,
        currency: 'INR',
        status: data.status || 'draft',
        featured: false,
        requiresApproval: data.requiresApproval || false,
        isPublic: true
      });
      return { id: eventId };
    },
    { collection: 'events' }
  );
}

/**
 * Update an event
 */
export async function updateEvent(eventId: string, data: Partial<Omit<Event, 'id' | 'createdAt'>>): Promise<HybridResult<void>> {
  return executeWithFallback(
    'updateEvent',
    async () => {}, // Was: dataConnect.updateEvent(eventId, data); },
    async () => {
      await firestore.updateEvent(eventId, {
        title: data.title,
        description: data.description,
        date: data.eventDate ? firestore.toTimestamp(data.eventDate) : undefined,
        location: data.venue,
        venue: data.venue,
        imageUrl: data.imageUrl,
        capacity: data.totalSlots,
        price: data.price,
        status: data.status,
        requiresApproval: data.requiresApproval
      });
    },
    { documentId: eventId, collection: 'events' }
  );
}

/**
 * Delete an event (soft delete)
 */
export async function deleteEvent(eventId: string): Promise<HybridResult<void>> {
  return executeWithFallback(
    'deleteEvent',
    async () => {}, // Was: dataConnect.deleteEvent(eventId); },
    async () => { await firestore.deleteEvent(eventId); },
    { documentId: eventId, collection: 'events' }
  );
}

/**
 * Update event status
 */
export async function updateEventStatus(eventId: string, status: Event['status']): Promise<HybridResult<void>> {
  return executeWithFallback(
    'updateEventStatus',
    async () => {}, // Was: dataConnect.updateEventStatus(eventId, status); },
    async () => { await firestore.updateEventStatus(eventId, status); },
    { documentId: eventId, collection: 'events' }
  );
}

// ============================================================================
// BOOKING OPERATIONS
// ============================================================================

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string): Promise<HybridResult<Booking | null>> {
  return executeWithFallback(
    'getBookingById',
    async () => undefined as any, // Was: dataConnect.getBookingById(bookingId),
    async () => {
      const booking = await firestore.getBookingById(bookingId);
      return booking ? mapFirestoreBookingToBooking(booking) : null;
    },
    { documentId: bookingId, collection: 'bookings' }
  );
}

/**
 * Get booking by ticket ID
 */
export async function getBookingByTicketId(ticketId: string): Promise<HybridResult<Booking | null>> {
  return executeWithFallback(
    'getBookingByTicketId',
    async () => undefined as any, // Was: dataConnect.getBookingByTicketId(ticketId),
    async () => {
      const booking = await firestore.getBookingByTicketId(ticketId);
      return booking ? mapFirestoreBookingToBooking(booking) : null;
    },
    { collection: 'bookings' }
  );
}

/**
 * Get user's bookings
 */
export async function getUserBookings(userId: string): Promise<HybridResult<Booking[]>> {
  return executeWithFallback(
    'getUserBookings',
    async () => undefined as any, // Was: dataConnect.getUserBookings(userId),
    async () => {
      const bookings = await firestore.getUserBookings(userId);
      return bookings.map(mapFirestoreBookingToBooking);
    },
    { userId, collection: 'bookings' }
  );
}

/**
 * Get event participants
 */
export async function getEventParticipants(eventId: string): Promise<HybridResult<Booking[]>> {
  return executeWithFallback(
    'getEventParticipants',
    async () => undefined as any, // Was: dataConnect.getEventParticipants(eventId),
    async () => {
      const bookings = await firestore.getEventParticipants(eventId);
      return bookings.map(mapFirestoreBookingToBooking);
    },
    { collection: 'bookings' }
  );
}

/**
 * Create a new booking
 */
export async function createBooking(userId: string, eventId: string): Promise<HybridResult<{ id: string; ticketId: string }>> {
  // Generate ticket ID locally
  const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const qrCode = `EVT-${eventId}-${ticketId}`;

  return executeWithFallback(
    'createBooking',
    async () => undefined as any, // DataConnect removed
    async () => {
      const id = await firestore.createBooking({
        userId,
        eventId,
        ticketId,
        qrCode,
        status: 'confirmed',
        isWaitlist: false,
        numberOfTickets: 1,
        totalAmount: 0,
        paymentStatus: 'not_required'
      });
      return { id, ticketId };
    },
    { collection: 'bookings', userId }
  );
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string, eventId: string, reason?: string): Promise<HybridResult<void>> {
  return executeWithFallback(
    'cancelBooking',
    async () => {}, // Was: dataConnect.cancelBooking(bookingId, eventId); },
    async () => { await firestore.cancelBooking(bookingId, reason); },
    { documentId: bookingId, collection: 'bookings' }
  );
}

/**
 * Check in a participant
 */
export async function checkInParticipant(
  bookingId: string,
  checkedInBy: string,
  method?: 'qr_scan' | 'manual_entry' | 'ticket_id' | 'auto'
): Promise<HybridResult<void>> {
  return executeWithFallback(
    'checkInParticipant',
    async () => {}, // Was: dataConnect.checkInParticipant(bookingId, checkedInBy); },
    async () => { await firestore.checkInParticipant(bookingId, checkedInBy, method || 'qr_scan'); },
    { documentId: bookingId, collection: 'bookings' }
  );
}

/**
 * Check existing booking for user and event
 * Returns true if booking exists, false otherwise
 */
export async function checkExistingBooking(userId: string, eventId: string): Promise<HybridResult<boolean>> {
  return executeWithFallback(
    'checkExistingBooking',
    async () => undefined as any, // Was: dataConnect.checkExistingBooking(userId, eventId),
    async () => {
      const booking = await firestore.checkExistingBooking(userId, eventId);
      return booking !== null;
    },
    { collection: 'bookings', userId }
  );
}

// ============================================================================
// CATEGORY OPERATIONS
// ============================================================================

/**
 * List all categories
 */
export async function listCategories(): Promise<HybridResult<Category[]>> {
  return executeWithFallback(
    'listCategories',
    async () => undefined as any, // DataConnect removed
    async () => {
      const categories = await firestore.listCategories();
      return categories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        color: c.color,
        isActive: c.isActive,
        createdAt: firestore.timestampToISO(c.createdAt)
      }));
    },
    { collection: 'categories' }
  );
}

// ============================================================================
// FAVORITE OPERATIONS
// ============================================================================

/**
 * Get user's favorites
 */
export async function getUserFavorites(userId: string): Promise<HybridResult<Array<{ id: string; eventId: string }>>> {
  return executeWithFallback(
    'getUserFavorites',
    async () => undefined as any, // Was: dataConnect.getUserFavorites(userId),
    async () => {
      const favorites = await firestore.getUserFavorites(userId);
      return favorites.map(f => ({
        id: f.id,
        eventId: f.eventId
      }));
    },
    { userId, collection: 'favorites' }
  );
}

/**
 * Check if event is favorited
 */
export async function checkIsFavorite(userId: string, eventId: string): Promise<HybridResult<{ isFavorite: boolean; favoriteId: string }>> {
  return executeWithFallback(
    'checkIsFavorite',
    async () => undefined as any, // Was: dataConnect.checkIsFavorite(userId, eventId),
    async () => {
      const isFavorite = await firestore.checkIsFavorite(userId, eventId);
      // Get favorite ID if exists
      if (isFavorite) {
        const favorites = await firestore.getUserFavorites(userId);
        const fav = favorites.find(f => f.eventId === eventId);
        return { isFavorite: true, favoriteId: fav?.id || '' };
      }
      return { isFavorite: false, favoriteId: '' };
    },
    { userId, collection: 'favorites' }
  );
}

/**
 * Add event to favorites
 */
export async function addFavorite(userId: string, eventId: string): Promise<HybridResult<{ id: string }>> {
  return executeWithFallback(
    'addFavorite',
    async () => undefined as any, // Was: dataConnect.addFavorite(userId, eventId),
    async () => {
      const id = await firestore.addFavorite(userId, eventId);
      return { id };
    },
    { userId, collection: 'favorites' }
  );
}

/**
 * Remove event from favorites
 */
export async function removeFavorite(favoriteId: string, userId: string, eventId: string): Promise<HybridResult<void>> {
  return executeWithFallback(
    'removeFavorite',
    async () => {}, // Was: dataConnect.removeFavorite(favoriteId); },
    async () => { await firestore.removeFavorite(userId, eventId); },
    { userId, collection: 'favorites' }
  );
}

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Get user's notifications
 */
export async function getUserNotifications(userId: string): Promise<HybridResult<Notification[]>> {
  return executeWithFallback(
    'getUserNotifications',
    async () => undefined as any, // DataConnect removed
    async () => {
      const notifications = await firestore.getUserNotifications(userId);
      return notifications.map(n => ({
        id: n.id,
        userId: userId,
        title: n.title,
        message: n.message,
        type: (n.type || 'general') as NotificationType,
        eventType: n.type,
        isRead: n.read,
        createdAt: firestore.timestampToISO(n.createdAt),
        link: n.actionUrl,
        eventId: n.eventId
      }));
    },
    { userId, collection: 'notifications' }
  );
}

/**
 * Create a notification
 */
export async function createNotification(userId: string, title: string, message: string, type: string): Promise<HybridResult<{ id: string }>> {
  return executeWithFallback(
    'createNotification',
    async () => undefined as any, // DataConnect removed
    async () => {
      const id = await firestore.createNotification({
        userId,
        title,
        message,
        type
      });
      return { id };
    },
    { userId, collection: 'notifications' }
  );
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<HybridResult<void>> {
  return executeWithFallback(
    'markNotificationRead',
    async () => {}, // Was: dataConnect.markNotificationRead(notificationId); },
    async () => { await firestore.markNotificationRead(notificationId); },
    { documentId: notificationId, collection: 'notifications' }
  );
}

// ============================================================================
// REVIEW OPERATIONS (Firestore only - Data Connect doesn't have review queries)
// ============================================================================

/**
 * Get event reviews
 */
export async function getEventReviews(eventId: string): Promise<HybridResult<Array<{
  id: string;
  userId: string;
  eventId: string;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
}>>> {
  // Reviews are Firestore-only
  try {
    const reviews = await firestore.getEventReviews(eventId);
    return {
      success: true,
      data: reviews.map(r => ({
        id: r.id,
        userId: r.userId,
        eventId: r.eventId,
        rating: r.rating,
        comment: r.comment,
        isAnonymous: r.isAnonymous,
        createdAt: firestore.timestampToISO(r.createdAt)
      })),
      source: 'firestore',
      fallbackUsed: false
    };
  } catch (error) {
    const serviceError = transformError(error);
    return {
      success: false,
      error: serviceError.userMessage,
      source: 'firestore',
      fallbackUsed: false
    };
  }
}

/**
 * Create a review
 */
export async function createReview(data: {
  eventId: string;
  userId: string;
  rating: number;
  comment?: string;
  isAnonymous?: boolean;
}): Promise<HybridResult<{ id: string }>> {
  try {
    const id = await firestore.createReview({
      eventId: data.eventId,
      userId: data.userId,
      rating: data.rating,
      comment: data.comment,
      isAnonymous: data.isAnonymous || false
    });
    return {
      success: true,
      data: { id },
      source: 'firestore',
      fallbackUsed: false
    };
  } catch (error) {
    const serviceError = transformError(error);
    return {
      success: false,
      error: serviceError.userMessage,
      source: 'firestore',
      fallbackUsed: false
    };
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<HybridResult<void>> {
  try {
    await firestore.deleteReview(reviewId);
    return {
      success: true,
      source: 'firestore',
      fallbackUsed: false
    };
  } catch (error) {
    const serviceError = transformError(error);
    return {
      success: false,
      error: serviceError.userMessage,
      source: 'firestore',
      fallbackUsed: false
    };
  }
}

/**
 * Flag a review
 */
export async function flagReview(reviewId: string, userId: string, reason?: string): Promise<HybridResult<void>> {
  try {
    await firestore.flagReview(reviewId, userId, reason);
    return {
      success: true,
      source: 'firestore',
      fallbackUsed: false
    };
  } catch (error) {
    const serviceError = transformError(error);
    return {
      success: false,
      error: serviceError.userMessage,
      source: 'firestore',
      fallbackUsed: false
    };
  }
}

// ============================================================================
// DASHBOARD OPERATIONS
// ============================================================================

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(organizerId?: string): Promise<HybridResult<DashboardStats>> {
  return executeWithFallback(
    'getDashboardStats',
    async () => undefined as any, // Was: dataConnect.getDashboardStats(organizerId),
    async () => {
      const stats = await firestore.getDashboardStats(organizerId);
      return {
        totalEvents: stats.totalEvents,
        activeEvents: stats.activeEvents,
        totalRegistrations: stats.totalBookings,
        totalRevenue: stats.totalRevenue
      };
    },
    { userId: organizerId, collection: 'stats' }
  );
}

// ============================================================================
// TYPE MAPPING HELPERS
// ============================================================================

/**
 * Map Firestore user to application User type
 */
function mapFirestoreUserToUser(fsUser: firestore.FirestoreUser): User {
  return {
    id: fsUser.id,
    email: fsUser.email,
    name: fsUser.displayName,
    role: fsUser.role === 'super_admin' ? 'admin' : fsUser.role as Role,
    avatarUrl: fsUser.avatarUrl,
    phone: fsUser.phone,
    department: fsUser.department,
    year: fsUser.year,
    rollNo: fsUser.rollNo,
    collegeIdUrl: fsUser.collegeIdUrl,
    createdAt: firestore.timestampToISO(fsUser.createdAt)
  };
}

/**
 * Map Firestore event to application Event type
 */
function mapFirestoreEventToEvent(fsEvent: firestore.FirestoreEvent): Event {
  return {
    id: fsEvent.id,
    title: fsEvent.title,
    description: fsEvent.description,
    eventDate: firestore.timestampToISO(fsEvent.date),
    venue: fsEvent.venue || fsEvent.location,
    totalSlots: fsEvent.capacity,
    availableSlots: fsEvent.capacity - fsEvent.registeredCount,
    price: fsEvent.price,
    category: (fsEvent.categoryName || 'Other') as Event['category'],
    imageUrl: fsEvent.imageUrl,
    adminId: fsEvent.organizerId,
    status: fsEvent.status,
    createdAt: firestore.timestampToISO(fsEvent.createdAt),
    isPaid: !fsEvent.isFree,
    requiresApproval: fsEvent.requiresApproval,
    averageRating: fsEvent.averageRating,
    totalReviews: fsEvent.totalReviews
  };
}

/**
 * Map Firestore booking to application Booking type
 */
function mapFirestoreBookingToBooking(fsBooking: firestore.FirestoreBooking): Booking {
  return {
    id: fsBooking.id,
    userId: fsBooking.userId,
    eventId: fsBooking.eventId,
    ticketId: fsBooking.ticketId,
    qrCode: fsBooking.qrCode || '',
    status: fsBooking.status as Booking['status'],
    amountPaid: fsBooking.totalAmount,
    bookedAt: firestore.timestampToISO(fsBooking.createdAt),
    createdAt: firestore.timestampToISO(fsBooking.createdAt),
    checkedInAt: fsBooking.checkInTime ? firestore.timestampToISO(fsBooking.checkInTime) : undefined,
    isWaitlist: fsBooking.isWaitlist,
    eventTitle: fsBooking.eventTitle,
    eventDate: fsBooking.eventDate ? firestore.timestampToISO(fsBooking.eventDate) : undefined,
    eventVenue: fsBooking.eventVenue,
    userName: fsBooking.userName,
    userEmail: fsBooking.userEmail
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { toServiceResult };
export type { HybridConfig, HybridResult, FallbackEvent, ServiceResult, DataSource };

// Log initialization
logInfo('Hybrid Service initialized: Using Firebase Firestore (DataConnect removed)');
