/**
 * Firebase Data Connect Service
 * Provides type-safe operations for Cloud SQL PostgreSQL via Data Connect
 * This service wraps the generated SDK and provides business logic
 */

import { 
  getDataConnect, 
  connectDataConnectEmulator, 
  DataConnect,
  executeQuery as firebaseExecuteQuery,
  executeMutation as firebaseExecuteMutation
} from 'firebase/data-connect';
import { app } from './firebase';
import { User, Event, Booking, EventStatus, EventCategory, BookingStatus, DashboardStats } from '../types';

// Data Connect configuration
const DATA_CONNECT_CONFIG = {
  connector: 'eventease-connector',
  location: import.meta.env.VITE_DATACONNECT_LOCATION || 'us-central1',
  service: import.meta.env.VITE_DATACONNECT_SERVICE_ID || 'eventease-service'
};

// Initialize Data Connect
let dataConnect: DataConnect;

export const getDataConnectInstance = (): DataConnect => {
  if (!dataConnect) {
    dataConnect = getDataConnect(app, DATA_CONNECT_CONFIG);
    
    // Connect to emulator in development
    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
      connectDataConnectEmulator(dataConnect, 'localhost', 9399);
      console.log('[DataConnect] Connected to emulator');
    }
  }
  return dataConnect;
};

// Helper to generate unique IDs
export const generateTicketId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomPart = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `EVT-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
};

// Helper to generate QR code data
export const generateQRCode = (eventId: string, ticketId: string): string => {
  return JSON.stringify({
    type: 'EVENTEASE_TICKET',
    eventId,
    ticketId,
    timestamp: Date.now()
  });
};

// ==================== GRAPHQL QUERY/MUTATION EXECUTION ====================

/**
 * Execute a Data Connect query with proper error handling and timeout
 * This is a wrapper that constructs query references for Firebase Data Connect
 */
export async function executeQuery<T>(
  queryName: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const dc = getDataConnectInstance();
  
  // PERFORMANCE: Add timeout to prevent hanging requests
  const timeoutMs = 30000; // 30 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
  });
  
  try {
    // Create query reference with the Data Connect instance, query name, and variables
    const queryRef = { dataConnect: dc, name: queryName, variables };
    
    const result = await Promise.race([
      firebaseExecuteQuery(queryRef as any),
      timeoutPromise
    ]);
    
    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid query response');
    }
    
    return result.data as T;
  } catch (error) {
    const err = error as Error;
    console.error(`[DataConnect] Query ${queryName} failed:`, err.message);
    
    // SECURITY: Don't expose internal error details
    if (err.message?.includes('timeout')) {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

/**
 * Execute a Data Connect mutation with proper error handling and timeout
 * This is a wrapper that constructs mutation references for Firebase Data Connect
 */
export async function executeMutation<T>(
  mutationName: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const dc = getDataConnectInstance();
  
  // PERFORMANCE: Add timeout to prevent hanging requests
  const timeoutMs = 30000; // 30 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Mutation timeout')), timeoutMs);
  });
  
  try {
    // Create mutation reference with the Data Connect instance, mutation name, and variables
    const mutationRef = { dataConnect: dc, name: mutationName, variables };
    
    const result = await Promise.race([
      firebaseExecuteMutation(mutationRef as any),
      timeoutPromise
    ]);
    
    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid mutation response');
    }
    
    return result.data as T;
  } catch (error) {
    const err = error as Error;
    console.error(`[DataConnect] Mutation ${mutationName} failed:`, err.message);
    
    // SECURITY: Don't expose internal error details
    if (err.message?.includes('timeout')) {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

// ==================== USER OPERATIONS ====================

export interface DataConnectUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  studentId?: string;
  major?: string;
  year?: string;
  photoUrl?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Get user by Firebase Auth UID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const result = await executeQuery<{ user: DataConnectUser | null }>('GetUserById', { id: userId });
    
    if (!result.user) return null;
    
    return mapDataConnectUserToUser(result.user);
  } catch (error) {
    console.error('[DataConnect] Error getting user:', error);
    return null;
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const result = await executeQuery<{ users: DataConnectUser[] }>('GetUserByEmail', { 
      email: email.toLowerCase() 
    });
    
    if (!result.users || result.users.length === 0) return null;
    
    return mapDataConnectUserToUser(result.users[0]);
  } catch (error) {
    console.error('[DataConnect] Error getting user by email:', error);
    return null;
  }
};

/**
 * Create new user profile
 */
export const createUser = async (
  userId: string, 
  userData: Omit<User, 'id'>
): Promise<User> => {
  try {
    await executeMutation('CreateUser', {
      id: userId,
      displayName: userData.name,
      email: userData.email.toLowerCase(),
      role: userData.role || 'student',
      phoneNumber: userData.phone || null,
      photoUrl: userData.avatarUrl || null,
      studentId: userData.rollNo || null,
      major: userData.department || null,
      year: null
    });
    
    return { id: userId, ...userData };
  } catch (error) {
    console.error('[DataConnect] Error creating user:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUser = async (
  userId: string, 
  data: Partial<User>
): Promise<void> => {
  try {
    await executeMutation('UpdateUser', {
      id: userId,
      displayName: data.name,
      phoneNumber: data.phone,
      photoUrl: data.avatarUrl,
      studentId: data.rollNo,
      major: data.department
    });
  } catch (error) {
    console.error('[DataConnect] Error updating user:', error);
    throw error;
  }
};

// ==================== EVENT OPERATIONS ====================

interface DataConnectEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  capacity: number;
  availableSlots: number;
  status: string;
  coverPhotoUrl?: string;
  price?: number;
  isPaid: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; icon?: string; color?: string };
  organizer: { id: string; displayName: string; email: string };
}

/**
 * Get all published events
 */
export const getPublishedEvents = async (): Promise<Event[]> => {
  try {
    const result = await executeQuery<{ events: DataConnectEvent[] }>('ListPublishedEvents', { limit: 100 });
    return result.events.map(mapDataConnectEventToEvent);
  } catch (error) {
    console.error('[DataConnect] Error getting published events:', error);
    return [];
  }
};

/**
 * Get events with optional status filter
 */
export const getEvents = async (filters?: { status?: EventStatus }): Promise<Event[]> => {
  try {
    const result = await executeQuery<{ events: DataConnectEvent[] }>('ListEvents', { 
      status: filters?.status,
      limit: 100 
    });
    return result.events.map(mapDataConnectEventToEvent);
  } catch (error) {
    console.error('[DataConnect] Error getting events:', error);
    return [];
  }
};

/**
 * Get event by ID
 */
export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const result = await executeQuery<{ event: DataConnectEvent | null }>('GetEventById', { id: eventId });
    
    if (!result.event) return null;
    
    return mapDataConnectEventToEvent(result.event);
  } catch (error) {
    console.error('[DataConnect] Error getting event:', error);
    return null;
  }
};

/**
 * Get events by organizer
 */
export const getEventsByOrganizer = async (organizerId: string): Promise<Event[]> => {
  try {
    const result = await executeQuery<{ events: DataConnectEvent[] }>('GetEventsByOrganizer', { 
      organizerId 
    });
    return result.events.map(mapDataConnectEventToEvent);
  } catch (error) {
    console.error('[DataConnect] Error getting organizer events:', error);
    return [];
  }
};

/**
 * Create new event
 */
export const createEvent = async (
  eventData: Omit<Event, 'id' | 'createdAt' | 'availableSlots'> & { categoryId: string }
): Promise<Event> => {
  try {
    const result = await executeMutation<{ event_insert: { id: string } }>('CreateEvent', {
      title: eventData.title,
      description: eventData.description,
      date: eventData.eventDate.split('T')[0], // Extract date part
      time: eventData.eventDate.split('T')[1]?.substring(0, 5) || '00:00', // Extract time part
      venue: eventData.venue,
      capacity: eventData.totalSlots,
      categoryId: eventData.categoryId,
      status: eventData.status || 'draft',
      organizerId: eventData.adminId,
      coverPhotoUrl: eventData.imageUrl || null,
      price: eventData.price || 0,
      isPaid: (eventData.price || 0) > 0,
      requiresApproval: false
    });
    
    return {
      id: result.event_insert.id,
      ...eventData,
      availableSlots: eventData.totalSlots,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DataConnect] Error creating event:', error);
    throw error;
  }
};

/**
 * Update event
 */
export const updateEvent = async (
  eventId: string, 
  data: Partial<Event> & { categoryId?: string }
): Promise<void> => {
  try {
    await executeMutation('UpdateEvent', {
      id: eventId,
      title: data.title,
      description: data.description,
      date: data.eventDate?.split('T')[0],
      time: data.eventDate?.split('T')[1]?.substring(0, 5),
      venue: data.venue,
      capacity: data.totalSlots,
      categoryId: data.categoryId,
      status: data.status,
      coverPhotoUrl: data.imageUrl,
      price: data.price,
      isPaid: (data.price || 0) > 0
    });
  } catch (error) {
    console.error('[DataConnect] Error updating event:', error);
    throw error;
  }
};

/**
 * Update event status
 */
export const updateEventStatus = async (eventId: string, status: EventStatus): Promise<void> => {
  try {
    await executeMutation('UpdateEventStatus', { id: eventId, status });
  } catch (error) {
    console.error('[DataConnect] Error updating event status:', error);
    throw error;
  }
};

/**
 * Delete event
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    await executeMutation('DeleteEvent', { id: eventId });
  } catch (error) {
    console.error('[DataConnect] Error deleting event:', error);
    throw error;
  }
};

// ==================== BOOKING OPERATIONS ====================

interface DataConnectBooking {
  id: string;
  ticketId: string;
  qrCode: string;
  status: string;
  bookingDate: string;
  checkedInAt?: string;
  isWaitlist: boolean;
  student: { id: string; displayName: string; email: string; phoneNumber?: string };
  event: { id: string; title: string; date: string; time: string; venue: string; coverPhotoUrl?: string };
}

/**
 * Get user's bookings
 */
export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    const result = await executeQuery<{ bookings: DataConnectBooking[] }>('GetUserBookings', { userId });
    return result.bookings.map(mapDataConnectBookingToBooking);
  } catch (error) {
    console.error('[DataConnect] Error getting user bookings:', error);
    return [];
  }
};

/**
 * Get event participants
 */
export const getEventParticipants = async (eventId: string): Promise<Booking[]> => {
  try {
    const result = await executeQuery<{ bookings: DataConnectBooking[] }>('GetEventParticipants', { eventId });
    return result.bookings.map(mapDataConnectBookingToBooking);
  } catch (error) {
    console.error('[DataConnect] Error getting event participants:', error);
    return [];
  }
};

/**
 * Get booking by ticket ID
 */
export const getBookingByTicketId = async (ticketId: string): Promise<Booking | null> => {
  try {
    const result = await executeQuery<{ bookings: DataConnectBooking[] }>('GetBookingByTicketId', { ticketId });
    
    if (!result.bookings || result.bookings.length === 0) return null;
    
    return mapDataConnectBookingToBooking(result.bookings[0]);
  } catch (error) {
    console.error('[DataConnect] Error getting booking by ticket ID:', error);
    return null;
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  try {
    const result = await executeQuery<{ booking: DataConnectBooking | null }>('GetBookingById', { id: bookingId });
    
    if (!result.booking) return null;
    
    return mapDataConnectBookingToBooking(result.booking);
  } catch (error) {
    console.error('[DataConnect] Error getting booking:', error);
    return null;
  }
};

/**
 * Check if user has existing booking for event
 */
export const checkExistingBooking = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    const result = await executeQuery<{ bookings: { id: string }[] }>('CheckExistingBooking', { 
      userId, 
      eventId 
    });
    return result.bookings && result.bookings.length > 0;
  } catch (error) {
    console.error('[DataConnect] Error checking existing booking:', error);
    return false;
  }
};

/**
 * Create booking
 */
export const createBooking = async (
  userId: string,
  eventId: string,
  amountPaid: number = 0
): Promise<Booking> => {
  const ticketId = generateTicketId();
  const qrCode = generateQRCode(eventId, ticketId);
  
  try {
    // Create the booking
    const result = await executeMutation<{ booking_insert: { id: string } }>('CreateBooking', {
      studentId: userId,
      eventId,
      ticketId,
      qrCode,
      isWaitlist: false
    });
    
    // Decrement available slots
    await executeMutation('DecrementEventSlots', { id: eventId });
    
    return {
      id: result.booking_insert.id,
      userId,
      eventId,
      ticketId,
      qrCode,
      status: 'confirmed',
      amountPaid,
      bookedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DataConnect] Error creating booking:', error);
    throw error;
  }
};

/**
 * Check in participant
 */
export const checkInParticipant = async (
  bookingId: string, 
  staffUserId: string,
  method: string = 'qr_scan'
): Promise<void> => {
  try {
    // Update booking status
    await executeMutation('CheckInParticipant', { id: bookingId });
    
    // Create check-in log
    await executeMutation('CreateCheckInLog', {
      staffUserId,
      bookingId,
      method
    });
  } catch (error) {
    console.error('[DataConnect] Error checking in participant:', error);
    throw error;
  }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId: string, eventId: string): Promise<void> => {
  try {
    await executeMutation('CancelBooking', { id: bookingId });
    
    // Increment available slots
    await executeMutation('IncrementEventSlots', { id: eventId });
  } catch (error) {
    console.error('[DataConnect] Error cancelling booking:', error);
    throw error;
  }
};

// ==================== CATEGORY OPERATIONS ====================

interface DataConnectCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

/**
 * Get all active categories
 */
export const getCategories = async (): Promise<DataConnectCategory[]> => {
  try {
    const result = await executeQuery<{ categories: DataConnectCategory[] }>('ListCategories');
    return result.categories;
  } catch (error) {
    console.error('[DataConnect] Error getting categories:', error);
    return [];
  }
};

/**
 * Create category
 */
export const createCategory = async (
  name: string,
  description?: string,
  icon?: string,
  color?: string
): Promise<void> => {
  try {
    await executeMutation('CreateCategory', { name, description, icon, color });
  } catch (error) {
    console.error('[DataConnect] Error creating category:', error);
    throw error;
  }
};

// ==================== NOTIFICATION OPERATIONS ====================

interface DataConnectNotification {
  id: string;
  title: string;
  message: string;
  eventType: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  event?: { id: string; title: string };
}

/**
 * Get user's notifications
 */
export const getUserNotifications = async (userId: string): Promise<DataConnectNotification[]> => {
  try {
    const result = await executeQuery<{ notifications: DataConnectNotification[] }>('GetUserNotifications', { 
      userId,
      limit: 50 
    });
    return result.notifications;
  } catch (error) {
    console.error('[DataConnect] Error getting notifications:', error);
    return [];
  }
};

/**
 * Create notification
 */
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  eventType: string,
  eventId?: string
): Promise<void> => {
  try {
    await executeMutation('CreateNotification', {
      userId,
      title,
      message,
      eventType,
      eventId: eventId || null,
      link: eventId ? `/events/${eventId}` : null
    });
  } catch (error) {
    console.error('[DataConnect] Error creating notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  try {
    await executeMutation('MarkNotificationRead', { id: notificationId });
  } catch (error) {
    console.error('[DataConnect] Error marking notification read:', error);
    throw error;
  }
};

// ==================== FAVORITE OPERATIONS ====================

interface DataConnectFavorite {
  id: string;
  eventId: string;
  createdAt: string;
}

/**
 * Get user's favorite events
 */
export const getUserFavorites = async (userId: string): Promise<DataConnectFavorite[]> => {
  try {
    const result = await executeQuery<{ favoriteEvents: DataConnectFavorite[] }>('ListUserFavorites', { 
      userId 
    });
    return result.favoriteEvents || [];
  } catch (error) {
    console.error('[DataConnect] Error getting user favorites:', error);
    return [];
  }
};

/**
 * Check if an event is favorited by a user
 */
export const checkIsFavorite = async (
  userId: string, 
  eventId: string
): Promise<{ isFavorite: boolean; favoriteId: string | null }> => {
  try {
    const favorites = await getUserFavorites(userId);
    const favorite = favorites.find(f => f.eventId === eventId);
    return {
      isFavorite: !!favorite,
      favoriteId: favorite?.id || null
    };
  } catch (error) {
    console.error('[DataConnect] Error checking favorite:', error);
    return { isFavorite: false, favoriteId: null };
  }
};

/**
 * Add event to favorites
 */
export const addFavorite = async (
  userId: string, 
  eventId: string
): Promise<DataConnectFavorite> => {
  try {
    const result = await executeMutation<{ favoriteEvent_insert: { id: string } }>('AddFavorite', {
      userId,
      eventId
    });
    
    return {
      id: result.favoriteEvent_insert.id,
      eventId,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DataConnect] Error adding favorite:', error);
    throw new Error('Failed to add to favorites');
  }
};

/**
 * Remove event from favorites
 */
export const removeFavorite = async (favoriteId: string): Promise<void> => {
  try {
    await executeMutation('RemoveFavorite', { id: favoriteId });
  } catch (error) {
    console.error('[DataConnect] Error removing favorite:', error);
    throw new Error('Failed to remove from favorites');
  }
};

/**
 * Get user's favorite events with full event details
 */
export const getUserFavoriteEvents = async (userId: string): Promise<Event[]> => {
  try {
    const favorites = await getUserFavorites(userId);
    if (favorites.length === 0) return [];
    
    // Fetch event details for each favorite
    const eventPromises = favorites.map(f => getEventById(f.eventId));
    const events = await Promise.all(eventPromises);
    
    // Filter out any null events (deleted/invalid) and maintain favorite order
    return events.filter((e): e is Event => e !== null);
  } catch (error) {
    console.error('[DataConnect] Error getting favorite events:', error);
    return [];
  }
};

// ==================== DASHBOARD STATS ====================

/**
 * Get dashboard statistics for admin
 */
export const getDashboardStats = async (organizerId: string): Promise<DashboardStats> => {
  try {
    const result = await executeQuery<{
      totalEvents: { id: string }[];
      publishedEvents: { id: string }[];
      allBookings: { id: string; status: string }[];
    }>('GetDashboardStats', { organizerId });
    
    const confirmedBookings = result.allBookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in');
    
    return {
      totalEvents: result.totalEvents.length,
      activeEvents: result.publishedEvents.length,
      totalRegistrations: confirmedBookings.length,
      totalRevenue: 0 // Calculate from payment transactions if needed
    };
  } catch (error) {
    console.error('[DataConnect] Error getting dashboard stats:', error);
    return {
      totalEvents: 0,
      activeEvents: 0,
      totalRegistrations: 0,
      totalRevenue: 0
    };
  }
};

// ==================== HELPER FUNCTIONS ====================

function mapDataConnectUserToUser(dcUser: DataConnectUser): User {
  return {
    id: dcUser.id,
    name: dcUser.displayName,
    email: dcUser.email,
    role: dcUser.role as 'student' | 'admin',
    phone: dcUser.phoneNumber,
    avatarUrl: dcUser.photoUrl,
    department: dcUser.major,
    rollNo: dcUser.studentId
  };
}

function mapDataConnectEventToEvent(dcEvent: DataConnectEvent): Event {
  return {
    id: dcEvent.id,
    title: dcEvent.title,
    description: dcEvent.description,
    eventDate: `${dcEvent.date}T${dcEvent.time}`,
    venue: dcEvent.venue,
    price: dcEvent.price || 0,
    totalSlots: dcEvent.capacity,
    availableSlots: dcEvent.availableSlots,
    category: dcEvent.category.name as EventCategory,
    imageUrl: dcEvent.coverPhotoUrl,
    adminId: dcEvent.organizer.id,
    status: dcEvent.status as EventStatus,
    createdAt: dcEvent.createdAt
  };
}

function mapDataConnectBookingToBooking(dcBooking: DataConnectBooking): Booking {
  return {
    id: dcBooking.id,
    userId: dcBooking.student.id,
    eventId: dcBooking.event.id,
    ticketId: dcBooking.ticketId,
    qrCode: dcBooking.qrCode,
    status: dcBooking.status as BookingStatus,
    amountPaid: 0,
    bookedAt: dcBooking.bookingDate,
    checkedInAt: dcBooking.checkedInAt,
    eventTitle: dcBooking.event.title,
    eventDate: `${dcBooking.event.date}T${dcBooking.event.time}`,
    eventVenue: dcBooking.event.venue,
    userName: dcBooking.student.displayName,
    userEmail: dcBooking.student.email
  };
}

// Export the Data Connect instance for direct access if needed
export { dataConnect };

console.log('[DataConnect] Service initialized');
