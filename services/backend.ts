/**
 * Backend Service
 * Uses Firebase Firestore as the primary database
 * Migrated from DataConnect to pure Firestore
 * 
 * @module services/backend
 */

// Import types
import { Event, Booking, EventStatus, User, DashboardStats } from '../types';
import * as firestoreService from './firestoreService';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique ticket ID
 */
export const generateTicketId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomPart = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `EVT-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
};

/**
 * Generate QR code data
 */
export const generateQRCode = (eventId: string, ticketId: string): string => {
  return JSON.stringify({
    type: 'EVENTEASE_TICKET',
    eventId,
    ticketId,
    timestamp: Date.now()
  });
};

// ============================================================================
// TYPE MAPPERS
// ============================================================================

function mapFirestoreUserToUser(fsUser: firestoreService.FirestoreUser): User {
  return {
    id: fsUser.id,
    email: fsUser.email,
    name: fsUser.displayName || `${fsUser.firstName || ''} ${fsUser.lastName || ''}`.trim() || 'User',
    role: fsUser.role,
    firstName: fsUser.firstName,
    lastName: fsUser.lastName,
    displayName: fsUser.displayName,
    avatarUrl: fsUser.avatarUrl,
    phone: fsUser.phone,
    department: fsUser.department,
    year: fsUser.year,
    division: fsUser.division,
    rollNo: fsUser.rollNo,
    collegeIdUrl: fsUser.collegeIdUrl,
    emailDomain: fsUser.emailDomain,
    createdAt: firestoreService.timestampToISO(fsUser.createdAt),
    updatedAt: fsUser.updatedAt ? firestoreService.timestampToISO(fsUser.updatedAt) : undefined,
    lastLoginAt: fsUser.lastLoginAt ? firestoreService.timestampToISO(fsUser.lastLoginAt) : undefined,
  };
}

function mapFirestoreEventToEvent(fsEvent: firestoreService.FirestoreEvent): Event {
  return {
    id: fsEvent.id,
    title: fsEvent.title,
    description: fsEvent.description,
    eventDate: firestoreService.timestampToISO(fsEvent.date),
    venue: fsEvent.venue || fsEvent.location,
    price: fsEvent.price,
    totalSlots: fsEvent.capacity,
    availableSlots: fsEvent.capacity - fsEvent.registeredCount,
    category: (fsEvent.categoryName || 'Other') as any,
    imageUrl: fsEvent.imageUrl,
    adminId: fsEvent.organizerId,
    status: fsEvent.status,
    createdAt: firestoreService.timestampToISO(fsEvent.createdAt),
    averageRating: fsEvent.averageRating,
    totalReviews: fsEvent.totalReviews,
  };
}

function mapFirestoreBookingToBooking(fsBooking: firestoreService.FirestoreBooking): Booking {
  return {
    id: fsBooking.id,
    userId: fsBooking.userId,
    eventId: fsBooking.eventId,
    ticketId: fsBooking.ticketId,
    qrCode: fsBooking.qrCode,
    status: fsBooking.status,
    amountPaid: fsBooking.totalAmount,
    bookedAt: firestoreService.timestampToISO(fsBooking.createdAt),
    checkedInAt: fsBooking.checkInTime ? firestoreService.timestampToISO(fsBooking.checkInTime) : undefined,
    createdAt: firestoreService.timestampToISO(fsBooking.createdAt),
    eventTitle: fsBooking.eventTitle,
    eventDate: fsBooking.eventDate ? firestoreService.timestampToISO(fsBooking.eventDate) : undefined,
    eventVenue: fsBooking.eventVenue,
    userName: fsBooking.userName,
    userEmail: fsBooking.userEmail,
  };
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export const getUserById = async (userId: string): Promise<User | null> => {
  const user = await firestoreService.getUserById(userId);
  if (!user) return null;
  return mapFirestoreUserToUser(user);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const user = await firestoreService.getUserByEmail(email);
  if (!user) return null;
  return mapFirestoreUserToUser(user);
};

export const createUser = async (userId: string, userData: Omit<User, 'id'>): Promise<User> => {
  const email = userData.email.toLowerCase();
  const emailDomain = email.includes('@') ? '@' + email.split('@')[1] : undefined;
  const nameParts = (userData.name || '').trim().split(' ');
  const firstName = nameParts[0] || undefined;
  const lastName = nameParts.slice(1).join(' ') || undefined;
  
  await firestoreService.createUser(userId, {
    email: email,
    displayName: userData.name || `${firstName || ''} ${lastName || ''}`.trim() || 'User',
    role: userData.role || 'student',
    emailDomain: emailDomain,
    firstName: firstName,
    lastName: lastName,
    year: userData.year,
    division: userData.division,
    department: userData.department,
    phone: userData.phone,
    avatarUrl: userData.avatarUrl,
  });
  
  return { id: userId, ...userData };
};

export const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  const nameParts = (data.name || '').trim().split(' ');
  const firstName = nameParts[0] || undefined;
  const lastName = nameParts.slice(1).join(' ') || undefined;
  
  await firestoreService.updateUser(userId, {
    displayName: data.name,
    firstName: firstName,
    lastName: lastName,
    phone: data.phone,
    avatarUrl: data.avatarUrl,
    department: data.department,
    year: data.year,
    division: data.division,
    rollNo: data.rollNo,
    collegeIdUrl: data.collegeIdUrl,
  });
};

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

export const getEvents = async (filters?: { status?: EventStatus }): Promise<Event[]> => {
  const events = await firestoreService.listEvents({ status: filters?.status });
  return events.map(mapFirestoreEventToEvent);
};

export const getPublishedEvents = async (): Promise<Event[]> => {
  const events = await firestoreService.listPublishedEvents();
  return events.map(mapFirestoreEventToEvent);
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
  const event = await firestoreService.getEventById(eventId);
  if (!event) return null;
  return mapFirestoreEventToEvent(event);
};

export const getEventsByOrganizer = async (organizerId: string): Promise<Event[]> => {
  const events = await firestoreService.listEvents({ organizerId });
  return events.map(mapFirestoreEventToEvent);
};

export const createEvent = async (
  eventData: Omit<Event, 'id' | 'createdAt' | 'availableSlots'> & { categoryId?: string }
): Promise<Event> => {
  const eventId = await firestoreService.createEvent({
    title: eventData.title,
    description: eventData.description,
    date: firestoreService.toTimestamp(eventData.eventDate),
    time: eventData.eventDate?.split('T')[1]?.substring(0, 5) || '00:00',
    location: eventData.venue || '',
    venue: eventData.venue,
    categoryId: eventData.categoryId || '',
    categoryName: eventData.category,
    imageUrl: eventData.imageUrl,
    capacity: eventData.totalSlots || 0,
    price: eventData.price || 0,
    isFree: (eventData.price || 0) === 0,
    currency: 'INR',
    organizerId: eventData.adminId || '',
    organizerName: '',
    status: eventData.status || 'draft',
    featured: false,
    requiresApproval: false,
    isPublic: true,
  });
  
  return {
    id: eventId,
    ...eventData,
    availableSlots: eventData.totalSlots,
    createdAt: new Date().toISOString()
  };
};

export const updateEvent = async (eventId: string, data: Partial<Event> & { categoryId?: string }): Promise<void> => {
  await firestoreService.updateEvent(eventId, {
    title: data.title,
    description: data.description,
    date: data.eventDate ? firestoreService.toTimestamp(data.eventDate) : undefined,
    time: data.eventDate?.split('T')[1]?.substring(0, 5),
    venue: data.venue,
    categoryId: data.categoryId,
    categoryName: data.category,
    imageUrl: data.imageUrl,
    capacity: data.totalSlots,
    price: data.price,
    isFree: (data.price || 0) === 0,
    status: data.status,
    averageRating: data.averageRating,
    totalReviews: data.totalReviews,
  });
};

export const updateEventStatus = async (eventId: string, status: EventStatus): Promise<void> => {
  await firestoreService.updateEventStatus(eventId, status);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await firestoreService.deleteEvent(eventId);
};

// ============================================================================
// BOOKING OPERATIONS
// ============================================================================

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  const bookings = await firestoreService.getUserBookings(userId);
  return bookings.map(mapFirestoreBookingToBooking);
};

export const getEventParticipants = async (eventId: string): Promise<Booking[]> => {
  const bookings = await firestoreService.getEventParticipants(eventId);
  return bookings.map(mapFirestoreBookingToBooking);
};

export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  const booking = await firestoreService.getBookingById(bookingId);
  if (!booking) return null;
  return mapFirestoreBookingToBooking(booking);
};

export const getBookingByTicketId = async (ticketId: string): Promise<Booking | null> => {
  const booking = await firestoreService.getBookingByTicketId(ticketId);
  if (!booking) return null;
  return mapFirestoreBookingToBooking(booking);
};

export const checkExistingBooking = async (userId: string, eventId: string): Promise<boolean> => {
  const booking = await firestoreService.checkExistingBooking(userId, eventId);
  return booking !== null;
};

export const createBooking = async (userId: string, eventId: string, amountPaid: number = 0): Promise<Booking> => {
  const ticketId = generateTicketId();
  const qrCode = generateQRCode(eventId, ticketId);
  
  const bookingId = await firestoreService.createBooking({
    userId,
    eventId,
    ticketId,
    qrCode,
    status: 'confirmed',
    isWaitlist: false,
    numberOfTickets: 1,
    totalAmount: amountPaid,
    paymentStatus: amountPaid > 0 ? 'completed' : 'not_required',
  });
  
  return {
    id: bookingId,
    userId,
    eventId,
    ticketId,
    qrCode,
    status: 'confirmed',
    amountPaid,
    bookedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
};

export const checkInParticipant = async (bookingId: string, staffUserId: string, method: string = 'qr_scan'): Promise<void> => {
  await firestoreService.checkInParticipant(
    bookingId, 
    staffUserId, 
    method as 'qr_scan' | 'manual_entry' | 'ticket_id' | 'auto'
  );
};

export const cancelBooking = async (bookingId: string, eventId?: string): Promise<void> => {
  await firestoreService.cancelBooking(bookingId);
};

// ============================================================================
// CATEGORY OPERATIONS
// ============================================================================

export const getCategories = async () => {
  return firestoreService.listCategories();
};

export const createCategory = async (name: string, description?: string, icon?: string, color?: string): Promise<void> => {
  await firestoreService.createCategory({
    name,
    description,
    icon,
    color,
    isActive: true,
    sortOrder: 0,
  });
};

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

export const getUserNotifications = async (userId: string) => {
  return firestoreService.getUserNotifications(userId);
};

export const createNotification = async (userId: string, title: string, message: string, eventType: string, eventId?: string): Promise<void> => {
  await firestoreService.createNotification({
    userId,
    title,
    message,
    type: eventType,
    eventId,
  });
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await firestoreService.markNotificationRead(notificationId);
};

// ============================================================================
// FAVORITE OPERATIONS
// ============================================================================

export interface FavoriteItem {
  id: string;
  eventId: string;
  createdAt: string;
}

export const getUserFavorites = async (userId: string): Promise<FavoriteItem[]> => {
  const favorites = await firestoreService.getUserFavorites(userId);
  return favorites.map(f => ({
    id: f.id,
    eventId: f.eventId,
    createdAt: firestoreService.timestampToISO(f.createdAt),
  }));
};

export const getUserFavoriteEvents = async (userId: string): Promise<Event[]> => {
  const favorites = await firestoreService.getUserFavorites(userId);
  if (favorites.length === 0) return [];
  
  const eventIds = favorites.map(f => f.eventId);
  const events = await firestoreService.getEventsByIds(eventIds);
  return events.map(mapFirestoreEventToEvent);
};

export const checkIsFavorite = async (userId: string, eventId: string): Promise<{ isFavorite: boolean; favoriteId: string | null }> => {
  const favorites = await firestoreService.getUserFavorites(userId);
  const favorite = favorites.find(f => f.eventId === eventId);
  return {
    isFavorite: !!favorite,
    favoriteId: favorite?.id || null
  };
};

export const addFavorite = async (userId: string, eventId: string): Promise<FavoriteItem> => {
  const id = await firestoreService.addFavorite(userId, eventId);
  return {
    id,
    eventId,
    createdAt: new Date().toISOString()
  };
};

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  const { deleteDoc, doc, getFirestore } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'favorites', favoriteId));
};

// ============================================================================
// DASHBOARD OPERATIONS
// ============================================================================

export const getDashboardStats = async (organizerId?: string): Promise<DashboardStats> => {
  const stats = await firestoreService.getDashboardStats(organizerId);
  return {
    totalEvents: stats.totalEvents,
    activeEvents: stats.activeEvents,
    totalRegistrations: stats.totalBookings,
    totalRevenue: stats.totalRevenue,
  };
};

// Re-export type for backwards compatibility
export type DataConnectUser = User;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  return defaultMessage;
}

// ============================================================================
// SUBSCRIPTION FUNCTIONS (Real-time via Firestore)
// ============================================================================

/**
 * Subscribe to events (real-time via Firestore)
 */
export const subscribeToEvents = (
  callback: (events: Event[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  return firestoreService.subscribeToEvents(
    { status: 'published' },
    (events) => callback(events.map(mapFirestoreEventToEvent)),
    onError
  );
};

/**
 * Subscribe to user bookings (real-time via Firestore)
 */
export const subscribeToUserBookings = (
  userId: string,
  callback: (bookings: Booking[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  return firestoreService.subscribeToUserBookings(
    userId,
    (bookings) => callback(bookings.map(mapFirestoreBookingToBooking)),
    onError
  );
};

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get admin dashboard statistics
 */
export const getAdminStats = async (adminId: string): Promise<DashboardStats> => {
  return getDashboardStats(adminId);
};

/**
 * Find booking by ticket ID
 */
export const findBookingByTicketId = async (ticketId: string): Promise<Booking | null> => {
  return getBookingByTicketId(ticketId);
};

/**
 * Find booking by QR code data
 */
export const findBookingByQRCode = async (qrData: string): Promise<Booking | null> => {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.type === 'EVENTEASE_TICKET' && parsed.ticketId) {
      return getBookingByTicketId(parsed.ticketId);
    }
    return null;
  } catch {
    return getBookingByTicketId(qrData);
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
  const booking = await getBookingById(bookingId);
  
  if (!booking) {
    return { booking: null, user: null, event: null };
  }
  
  const [user, event] = await Promise.all([
    getUserById(booking.userId),
    getEventById(booking.eventId)
  ]);
  
  return { booking, user, event };
};

// ============================================================================
// ADDITIONAL HELPER FUNCTIONS
// ============================================================================

/**
 * Get events by status
 */
export const getEventsByStatus = async (status: EventStatus): Promise<Event[]> => {
  return getEvents({ status });
};

/**
 * Get upcoming events (published and in the future)
 */
export const getUpcomingEvents = async (): Promise<Event[]> => {
  const events = await getPublishedEvents();
  const now = new Date();
  return events.filter(event => new Date(event.eventDate) >= now);
};

/**
 * Get past events
 */
export const getPastEvents = async (): Promise<Event[]> => {
  const events = await getPublishedEvents();
  const now = new Date();
  return events.filter(event => new Date(event.eventDate) < now);
};

/**
 * Get user's active bookings (not cancelled)
 */
export const getUserActiveBookings = async (userId: string): Promise<Booking[]> => {
  const bookings = await getUserBookings(userId);
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
    getEventParticipants(eventId),
    getEventById(eventId)
  ]);
  
  return {
    totalBookings: participants.filter(p => p.status !== 'cancelled').length,
    checkedIn: participants.filter(p => p.status === 'checked_in').length,
    cancelled: participants.filter(p => p.status === 'cancelled').length,
    revenue: participants
      .filter(p => p.status !== 'cancelled')
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0)
  };
};

/**
 * Book event with validation
 */
export const bookEvent = async (
  userId: string, 
  eventId: string
): Promise<{ success: boolean; booking?: Booking; error?: string }> => {
  try {
    const event = await getEventById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    
    if (event.status !== 'published') {
      return { success: false, error: 'Event is not available for booking' };
    }
    
    if (event.availableSlots <= 0) {
      return { success: false, error: 'No slots available' };
    }
    
    const hasBooking = await checkExistingBooking(userId, eventId);
    if (hasBooking) {
      return { success: false, error: 'You have already booked this event' };
    }
    
    if (new Date(event.eventDate) < new Date()) {
      return { success: false, error: 'Cannot book past events' };
    }
    
    const booking = await createBooking(userId, eventId, event.price);
    
    return { success: true, booking };
  } catch (error: unknown) {
    console.error('[Backend] Book event error:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to book event') };
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
    const booking = await getBookingById(bookingId);
    
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
    
    await cancelBooking(bookingId, booking.eventId);
    
    return { success: true };
  } catch (error: unknown) {
    console.error('[Backend] Cancel booking error:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to cancel booking') };
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
    const booking = await getBookingByTicketId(ticketId);
    
    if (!booking) {
      return { success: false, error: 'Ticket not found' };
    }
    
    if (booking.status === 'checked_in') {
      return { success: false, error: 'Already checked in' };
    }
    
    if (booking.status === 'cancelled') {
      return { success: false, error: 'Booking was cancelled' };
    }
    
    await checkInParticipant(booking.id, staffUserId, 'ticket_id');
    
    const updatedBooking = await getBookingByTicketId(ticketId);
    
    return { success: true, booking: updatedBooking || booking };
  } catch (error: unknown) {
    console.error('[Backend] Check in error:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to check in') };
  }
};

/**
 * Search events by title
 */
export const searchEvents = async (searchTerm: string): Promise<Event[]> => {
  if (!searchTerm.trim()) return [];
  
  const events = await getPublishedEvents();
  const term = searchTerm.toLowerCase();
  
  return events.filter(event => 
    event.title.toLowerCase().includes(term) ||
    event.venue.toLowerCase().includes(term) ||
    event.description.toLowerCase().includes(term)
  );
};

// ============================================================================
// REVIEW OPERATIONS
// ============================================================================

import { Review, RatingDistribution } from '../types';

/**
 * Get reviews for an event with pagination and sorting
 */
export const getEventReviews = async (
  eventId: string,
  options: { sortBy?: 'recent' | 'highest' | 'lowest'; page?: number; pageSize?: number } = {}
): Promise<{ reviews: Review[]; total: number }> => {
  const { sortBy = 'recent', page = 1, pageSize = 10 } = options;
  
  try {
    const firestoreReviews = await firestoreService.getEventReviews(eventId);
    
    const allReviews: Review[] = firestoreReviews
      .filter(r => !r.isFlagged && !r.isDeleted)
      .map(r => ({
        id: r.id,
        userId: r.userId,
        eventId: r.eventId,
        rating: r.rating as 1 | 2 | 3 | 4 | 5,
        comment: r.comment,
        isAnonymous: r.isAnonymous,
        createdAt: firestoreService.timestampToISO(r.createdAt),
        updatedAt: r.updatedAt ? firestoreService.timestampToISO(r.updatedAt) : undefined,
        userName: r.userName || 'User',
        userPhoto: r.userAvatarUrl,
        isFlagged: r.isFlagged,
        flagReason: r.flagReason,
      }));
    
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
    
    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);
    
    return {
      reviews: paginated,
      total: allReviews.length,
    };
  } catch (error) {
    console.error('[Backend] Failed to get event reviews:', error);
    return { reviews: [], total: 0 };
  }
};

/**
 * Get a user's review for a specific event
 */
export const getUserReviewForEvent = async (
  userId: string,
  eventId: string
): Promise<Review | null> => {
  try {
    const firestoreReviews = await firestoreService.getEventReviews(eventId);
    const userReview = firestoreReviews.find(r => r.userId === userId && !r.isDeleted);
    
    if (!userReview) return null;
    
    return {
      id: userReview.id,
      userId: userReview.userId,
      eventId: userReview.eventId,
      rating: userReview.rating as 1 | 2 | 3 | 4 | 5,
      comment: userReview.comment,
      isAnonymous: userReview.isAnonymous,
      createdAt: firestoreService.timestampToISO(userReview.createdAt),
      updatedAt: userReview.updatedAt ? firestoreService.timestampToISO(userReview.updatedAt) : undefined,
      userName: userReview.userName || 'User',
      userPhoto: userReview.userAvatarUrl,
      isFlagged: userReview.isFlagged,
      flagReason: userReview.flagReason,
    };
  } catch (error) {
    console.error('[Backend] Failed to get user review:', error);
    return null;
  }
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
  try {
    const existingReview = await getUserReviewForEvent(data.userId, data.eventId);
    if (existingReview) {
      throw new Error('You have already reviewed this event');
    }
    
    const user = await getUserById(data.userId);
    
    const reviewId = await firestoreService.createReview({
      userId: data.userId,
      eventId: data.eventId,
      rating: data.rating,
      comment: data.comment,
      isAnonymous: data.isAnonymous,
      userName: data.isAnonymous ? 'Anonymous' : user?.name || 'User',
      userAvatarUrl: data.isAnonymous ? undefined : user?.avatarUrl,
    });
    
    await updateEventRatingStats(data.eventId);
    
    return {
      id: reviewId,
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
  } catch (error) {
    console.error('[Backend] Failed to create review:', error);
    throw error;
  }
};

/**
 * Delete a review (soft delete)
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  try {
    const events = await firestoreService.listEvents();
    let eventId: string | null = null;
    
    for (const event of events) {
      const reviews = await firestoreService.getEventReviews(event.id);
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        eventId = review.eventId;
        break;
      }
    }
    
    await firestoreService.deleteReview(reviewId);
    
    if (eventId) {
      await updateEventRatingStats(eventId);
    }
  } catch (error) {
    console.error('[Backend] Failed to delete review:', error);
    throw error;
  }
};

/**
 * Flag/unflag a review for moderation
 */
export const flagReview = async (
  reviewId: string,
  flagged: boolean,
  reason?: string
): Promise<void> => {
  try {
    await firestoreService.flagReview(reviewId, reason || '');
  } catch (error) {
    console.error('[Backend] Failed to flag review:', error);
    throw error;
  }
};

/**
 * Get all reviews (admin)
 */
export const getAllReviews = async (): Promise<Review[]> => {
  try {
    const events = await firestoreService.listEvents();
    const allReviews: Review[] = [];
    
    for (const event of events) {
      const eventReviews = await firestoreService.getEventReviews(event.id);
      for (const r of eventReviews) {
        if (!r.isDeleted) {
          allReviews.push({
            id: r.id,
            userId: r.userId,
            eventId: r.eventId,
            rating: r.rating as 1 | 2 | 3 | 4 | 5,
            comment: r.comment,
            isAnonymous: r.isAnonymous,
            createdAt: firestoreService.timestampToISO(r.createdAt),
            updatedAt: r.updatedAt ? firestoreService.timestampToISO(r.updatedAt) : undefined,
            userName: r.userName || 'User',
            userPhoto: r.userAvatarUrl,
            isFlagged: r.isFlagged,
            flagReason: r.flagReason,
          });
        }
      }
    }
    
    return allReviews.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[Backend] Failed to get all reviews:', error);
    return [];
  }
};

/**
 * Update event's aggregate rating statistics
 */
const updateEventRatingStats = async (eventId: string): Promise<void> => {
  try {
    const firestoreReviews = await firestoreService.getEventReviews(eventId);
    const reviews = firestoreReviews.filter(r => !r.isFlagged && !r.isDeleted);
    
    if (reviews.length === 0) {
      await updateEvent(eventId, {
        averageRating: 0,
        totalReviews: 0,
      });
      return;
    }
    
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = Math.round((sum / reviews.length) * 10) / 10;
    
    await updateEvent(eventId, {
      averageRating,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error('[Backend] Failed to update event rating stats:', error);
  }
};

console.log('[Backend] Using Firebase Firestore - DataConnect migration complete');
console.log('[Backend] ZERO localStorage - All data persists in Firestore');
