/**
 * Firestore Service - Modular Re-export Index
 * 
 * This file re-exports all domain-specific modules for backward compatibility.
 * The monolithic firestoreService has been decomposed into:
 * 
 * - core.ts - DB initialization, collection constants
 * - types.ts - Type definitions
 * - helpers.ts - Utility functions
 * - userService.ts - User operations
 * - eventService.ts - Event operations
 * - bookingService.ts - Booking operations
 * - categoryService.ts - Category operations
 * - favoriteService.ts - Favorite operations
 * - notificationService.ts - Notification operations
 * - reviewService.ts - Review operations
 * - realtimeService.ts - Real-time subscriptions
 * 
 * @module services/firestore
 */

// Core
export { db, COLLECTIONS } from './core';

// Types
export type {
    BaseDocument,
    SoftDeletable,
    FirestoreUser,
    FirestoreEvent,
    FirestoreBooking,
    FirestoreCategory,
    FirestoreFavorite,
    FirestoreNotification,
    FirestoreReview,
    FirestoreCheckInLog,
} from './types';

// Helpers
export {
    generateId,
    generateTicketId,
    timestampToISO,
    toTimestamp,
    cleanFirestoreData,
} from './helpers';

// User Service
export {
    getUserById,
    getUserByEmail,
    createUser,
    updateUser,
} from './userService';

// Event Service
export {
    getEventById,
    getEventsByIds,
    listEvents,
    listPublishedEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventStatus,
    updateEventRegistrationCount,
} from './eventService';

// Booking Service
export {
    getBookingById,
    getBookingByTicketId,
    getUserBookings,
    getEventParticipants,
    checkExistingBooking,
    createBooking,
    createBookingWithTransaction,
    cancelBooking,
    checkInParticipant,
    checkInWithTransaction,
} from './bookingService';

// Category Service
export {
    listCategories,
    createCategory,
} from './categoryService';

// Favorite Service
export {
    getUserFavorites,
    checkIsFavorite,
    addFavorite,
    removeFavorite,
} from './favoriteService';

// Notification Service
export {
    getUserNotifications,
    createNotification,
    markNotificationRead,
    batchMarkNotificationsRead,
    batchDeleteNotifications,
} from './notificationService';

// Review Service
export {
    getEventReviews,
    createReview,
    deleteReview,
    flagReview,
} from './reviewService';

// Realtime Service
export {
    subscribeToEvents,
    subscribeToEvent,
    subscribeToUserBookings,
    subscribeToEventParticipants,
    subscribeToNotifications,
    type UnsubscribeFn,
} from './realtimeService';

// Pagination
export {
    type PaginatedResult,
    type PaginationOptions,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    normalizePageSize,
    createPaginatedResponse,
    encodeCursor,
    decodeCursor,
} from './pagination';

// Extended Helpers
export {
    sanitizeInput,
    sanitizeObject,
    isValidEmail,
} from './helpers';

// Batch & Aggregation
export {
    getEventsWithParticipantCounts,
    listPublishedEventsPaginated,
    listOrganizerEventsPaginated,
    type EventWithCounts,
} from './eventService';

// Paginated Booking Functions
export {
    getUserBookingsPaginated,
    getEventParticipantsPaginated,
} from './bookingService';

console.log('[Firestore] Modular service initialized');

