/**
 * Backend Service
 * Re-exports from Data Connect service for backwards compatibility
 * Uses Firebase Data Connect with Cloud SQL PostgreSQL
 */

// Re-export all operations from Data Connect service
export {
  // User operations
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  
  // Event operations
  getEvents,
  getPublishedEvents,
  getEventById,
  getEventsByOrganizer,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  
  // Booking operations
  getUserBookings,
  getEventParticipants,
  getBookingById,
  getBookingByTicketId,
  checkExistingBooking,
  createBooking,
  checkInParticipant,
  cancelBooking,
  
  // Category operations
  getCategories,
  createCategory,
  
  // Notification operations
  getUserNotifications,
  createNotification,
  markNotificationRead,
  
  // Favorite operations
  getUserFavorites,
  getUserFavoriteEvents,
  checkIsFavorite,
  addFavorite,
  removeFavorite,
  
  // Dashboard operations
  getDashboardStats,
  
  // Utilities
  generateTicketId,
  generateQRCode
} from './dataConnectService';

// Re-export types for convenience
export type { DataConnectUser } from './dataConnectService';

// Import types and functions
import { Event, Booking, EventStatus, User, DashboardStats } from '../types';
import * as dataConnect from './dataConnectService';

// ==================== SUBSCRIPTION FUNCTIONS (Polling-based) ====================
// Note: Data Connect doesn't support real-time subscriptions like Firestore
// These implementations use polling for backwards compatibility

/**
 * Subscribe to events (polling-based, checks every 30 seconds)
 */
export const subscribeToEvents = (
  callback: (events: Event[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let active = true;
  
  const fetchEvents = async () => {
    if (!active) return;
    try {
      const events = await dataConnect.getEvents();
      if (active) callback(events);
    } catch (error) {
      if (active) onError?.(error as Error);
    }
  };
  
  // Initial fetch
  fetchEvents();
  
  // Poll every 30 seconds
  const interval = setInterval(fetchEvents, 30000);
  
  // Return unsubscribe function
  return () => {
    active = false;
    clearInterval(interval);
  };
};

/**
 * Subscribe to user bookings (polling-based)
 */
export const subscribeToUserBookings = (
  userId: string,
  callback: (bookings: Booking[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let active = true;
  
  const fetchBookings = async () => {
    if (!active) return;
    try {
      const bookings = await dataConnect.getUserBookings(userId);
      if (active) callback(bookings);
    } catch (error) {
      if (active) onError?.(error as Error);
    }
  };
  
  // Initial fetch
  fetchBookings();
  
  // Poll every 30 seconds
  const interval = setInterval(fetchBookings, 30000);
  
  // Return unsubscribe function
  return () => {
    active = false;
    clearInterval(interval);
  };
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get admin dashboard statistics
 */
export const getAdminStats = async (adminId: string): Promise<DashboardStats> => {
  return dataConnect.getDashboardStats(adminId);
};

/**
 * Find booking by ticket ID (alias for getBookingByTicketId)
 */
export const findBookingByTicketId = async (ticketId: string): Promise<Booking | null> => {
  return dataConnect.getBookingByTicketId(ticketId);
};

/**
 * Find booking by QR code data
 */
export const findBookingByQRCode = async (qrData: string): Promise<Booking | null> => {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.type === 'EVENTEASE_TICKET' && parsed.ticketId) {
      return dataConnect.getBookingByTicketId(parsed.ticketId);
    }
    return null;
  } catch {
    // Try as raw ticket ID
    return dataConnect.getBookingByTicketId(qrData);
  }
};

/**
 * Get participant details for admin view
 */
export const getParticipantDetails = async (bookingId: string): Promise<{
  booking: Booking | null;
  user: User | null;
  event: Event | null;
}> => {
  const booking = await dataConnect.getBookingById(bookingId);
  
  if (!booking) {
    return { booking: null, user: null, event: null };
  }
  
  const [user, event] = await Promise.all([
    dataConnect.getUserById(booking.userId),
    dataConnect.getEventById(booking.eventId)
  ]);
  
  return { booking, user, event };
};

// ==================== ADDITIONAL HELPER FUNCTIONS ====================

/**
 * Get events by status (wrapper for backwards compatibility)
 */
export const getEventsByStatus = async (status: EventStatus): Promise<Event[]> => {
  return dataConnect.getEvents({ status });
};

/**
 * Get upcoming events (published and in the future)
 */
export const getUpcomingEvents = async (): Promise<Event[]> => {
  const events = await dataConnect.getPublishedEvents();
  const now = new Date();
  return events.filter(event => new Date(event.eventDate) >= now);
};

/**
 * Get past events
 */
export const getPastEvents = async (): Promise<Event[]> => {
  const events = await dataConnect.getPublishedEvents();
  const now = new Date();
  return events.filter(event => new Date(event.eventDate) < now);
};

/**
 * Get user's active bookings (not cancelled)
 */
export const getUserActiveBookings = async (userId: string): Promise<Booking[]> => {
  const bookings = await dataConnect.getUserBookings(userId);
  return bookings.filter(b => b.status !== 'cancelled');
};

/**
 * Get event statistics
 */
export const getEventStats = async (eventId: string): Promise<{
  totalBookings: number;
  checkedIn: number;
  cancelled: number;
  revenue: number;
}> => {
  const [participants, event] = await Promise.all([
    dataConnect.getEventParticipants(eventId),
    dataConnect.getEventById(eventId)
  ]);
  
  const stats = {
    totalBookings: participants.filter(p => p.status !== 'cancelled').length,
    checkedIn: participants.filter(p => p.status === 'checked_in').length,
    cancelled: participants.filter(p => p.status === 'cancelled').length,
    revenue: participants
      .filter(p => p.status !== 'cancelled')
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0)
  };
  
  return stats;
};

/**
 * Book event with validation
 */
export const bookEvent = async (
  userId: string, 
  eventId: string
): Promise<{ success: boolean; booking?: Booking; error?: string }> => {
  try {
    // Check if event exists
    const event = await dataConnect.getEventById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    
    // Check if event is published
    if (event.status !== 'published') {
      return { success: false, error: 'Event is not available for booking' };
    }
    
    // Check availability
    if (event.availableSlots <= 0) {
      return { success: false, error: 'No slots available' };
    }
    
    // Check existing booking
    const hasBooking = await dataConnect.checkExistingBooking(userId, eventId);
    if (hasBooking) {
      return { success: false, error: 'You have already booked this event' };
    }
    
    // Check if event date is in the past
    if (new Date(event.eventDate) < new Date()) {
      return { success: false, error: 'Cannot book past events' };
    }
    
    // Create booking
    const booking = await dataConnect.createBooking(userId, eventId, event.price);
    
    return { success: true, booking };
  } catch (error: any) {
    console.error('[Backend] Book event error:', error);
    return { success: false, error: error.message || 'Failed to book event' };
  }
};

/**
 * Cancel booking with validation
 */
export const cancelUserBooking = async (
  bookingId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const booking = await dataConnect.getBookingById(bookingId);
    
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }
    
    if (booking.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    if (booking.status === 'cancelled') {
      return { success: false, error: 'Booking is already cancelled' };
    }
    
    if (booking.status === 'checked_in') {
      return { success: false, error: 'Cannot cancel after check-in' };
    }
    
    await dataConnect.cancelBooking(bookingId, booking.eventId);
    
    return { success: true };
  } catch (error: any) {
    console.error('[Backend] Cancel booking error:', error);
    return { success: false, error: error.message || 'Failed to cancel booking' };
  }
};

/**
 * Check in participant by ticket ID
 */
export const checkInByTicketId = async (
  ticketId: string,
  staffUserId: string
): Promise<{ success: boolean; booking?: Booking; error?: string }> => {
  try {
    const booking = await dataConnect.getBookingByTicketId(ticketId);
    
    if (!booking) {
      return { success: false, error: 'Ticket not found' };
    }
    
    if (booking.status === 'checked_in') {
      return { success: false, error: 'Already checked in' };
    }
    
    if (booking.status === 'cancelled') {
      return { success: false, error: 'Booking was cancelled' };
    }
    
    await dataConnect.checkInParticipant(booking.id, staffUserId, 'ticket_id');
    
    const updatedBooking = await dataConnect.getBookingByTicketId(ticketId);
    
    return { success: true, booking: updatedBooking || booking };
  } catch (error: any) {
    console.error('[Backend] Check in error:', error);
    return { success: false, error: error.message || 'Failed to check in' };
  }
};

/**
 * Search events by title
 */
export const searchEvents = async (searchTerm: string): Promise<Event[]> => {
  if (!searchTerm.trim()) return [];
  
  const events = await dataConnect.getPublishedEvents();
  const term = searchTerm.toLowerCase();
  
  return events.filter(event => 
    event.title.toLowerCase().includes(term) ||
    event.venue.toLowerCase().includes(term) ||
    event.description.toLowerCase().includes(term)
  );
};

// ==================== REVIEW OPERATIONS ====================

import { Review, RatingDistribution } from '../types';

// LocalStorage key for reviews
const REVIEWS_STORAGE_KEY = 'eventease_reviews';

/**
 * Get all reviews from storage
 */
const getStoredReviews = (): Review[] => {
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Save reviews to storage
 */
const saveReviews = (reviews: Review[]): void => {
  localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
};

/**
 * Get reviews for an event with pagination and sorting
 */
export const getEventReviews = async (
  eventId: string,
  options: { sortBy?: 'recent' | 'highest' | 'lowest'; page?: number; pageSize?: number } = {}
): Promise<{ reviews: Review[]; total: number }> => {
  await delay(300);
  
  const { sortBy = 'recent', page = 1, pageSize = 10 } = options;
  const allReviews = getStoredReviews().filter(r => r.eventId === eventId && !r.isFlagged);
  
  // Sort reviews
  const sorted = [...allReviews].sort((a, b) => {
    switch (sortBy) {
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  
  // Paginate
  const start = (page - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);
  
  return {
    reviews: paginated,
    total: allReviews.length,
  };
};

/**
 * Get a user's review for a specific event
 */
export const getUserReviewForEvent = async (
  userId: string,
  eventId: string
): Promise<Review | null> => {
  await delay(200);
  const reviews = getStoredReviews();
  return reviews.find(r => r.userId === userId && r.eventId === eventId) || null;
};

/**
 * Create a new review
 */
export const createReview = async (data: {
  userId: string;
  eventId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  isAnonymous: boolean;
}): Promise<Review> => {
  await delay(500);
  
  const reviews = getStoredReviews();
  
  // Check for duplicate
  const existing = reviews.find(r => r.userId === data.userId && r.eventId === data.eventId);
  if (existing) {
    throw new Error('You have already reviewed this event');
  }
  
  // Get user info for the review
  const user = await dataConnect.getUserById(data.userId);
  
  const newReview: Review = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: data.userId,
    eventId: data.eventId,
    rating: data.rating,
    comment: data.comment,
    isAnonymous: data.isAnonymous,
    createdAt: new Date().toISOString(),
    userName: data.isAnonymous ? 'Anonymous' : user?.name || 'User',
    userPhoto: data.isAnonymous ? undefined : user?.avatarUrl,
    isFlagged: false,
  };
  
  reviews.push(newReview);
  saveReviews(reviews);
  
  // Update event's aggregate rating
  await updateEventRatingStats(data.eventId);
  
  return newReview;
};

/**
 * Delete a review (admin only)
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  await delay(300);
  
  const reviews = getStoredReviews();
  const reviewIndex = reviews.findIndex(r => r.id === reviewId);
  
  if (reviewIndex === -1) {
    throw new Error('Review not found');
  }
  
  const eventId = reviews[reviewIndex].eventId;
  reviews.splice(reviewIndex, 1);
  saveReviews(reviews);
  
  // Update event's aggregate rating
  await updateEventRatingStats(eventId);
};

/**
 * Flag/unflag a review for moderation
 */
export const flagReview = async (
  reviewId: string,
  flagged: boolean,
  reason?: string
): Promise<void> => {
  await delay(200);
  
  const reviews = getStoredReviews();
  const reviewIndex = reviews.findIndex(r => r.id === reviewId);
  
  if (reviewIndex === -1) {
    throw new Error('Review not found');
  }
  
  reviews[reviewIndex] = {
    ...reviews[reviewIndex],
    isFlagged: flagged,
    flagReason: reason,
    updatedAt: new Date().toISOString(),
  };
  
  saveReviews(reviews);
};

/**
 * Get all reviews (admin)
 */
export const getAllReviews = async (): Promise<Review[]> => {
  await delay(300);
  const reviews = getStoredReviews();
  
  // Sort by most recent first
  return reviews.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Update event's aggregate rating statistics
 */
const updateEventRatingStats = async (eventId: string): Promise<void> => {
  const reviews = getStoredReviews().filter(r => r.eventId === eventId && !r.isFlagged);
  
  if (reviews.length === 0) {
    // Reset stats if no reviews
    await dataConnect.updateEvent(eventId, {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
    return;
  }
  
  // Calculate average
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal
  
  // Calculate distribution
  const ratingDistribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    ratingDistribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
  });
  
  // Update event
  await dataConnect.updateEvent(eventId, {
    averageRating,
    totalReviews: reviews.length,
    ratingDistribution,
  });
};

// Helper delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log('[Backend] Using Firebase Data Connect with Cloud SQL');
