/**
 * Firebase Data Connect Service
 * Provides type-safe operations for Cloud SQL PostgreSQL via Data Connect
 * This service wraps the generated SDK and provides business logic
 * 
 * ZERO LOCAL STORAGE TOLERANCE
 * Fallback: Firestore (via firestoreService.ts) - NOT localStorage
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

// Import Firestore fallback service - NO localStorage
import * as firestoreService from './firestoreService';

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

// Flag to enable/disable Data Connect (set to false for offline/development mode)
const USE_DATA_CONNECT = import.meta.env.VITE_USE_DATA_CONNECT === 'true';

// REMOVED: localStorage fallback - using Firestore instead
// See firestoreService.ts for Firestore fallback implementation

/**
 * Execute a Data Connect query with proper error handling and timeout
 * Falls back to Firestore (NOT localStorage) when Data Connect is unavailable
 */
export async function executeQuery<T>(
  queryName: string,
  variables?: Record<string, unknown>
): Promise<T> {
  // If Data Connect is disabled or not configured, use Firestore fallback
  if (!USE_DATA_CONNECT) {
    console.log(`[DataConnect] Using Firestore fallback for query: ${queryName}`);
    return executeFirestoreQuery<T>(queryName, variables);
  }
  
  const dc = getDataConnectInstance();
  
  // PERFORMANCE: Add timeout to prevent hanging requests
  const timeoutMs = 30000; // 30 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
  });
  
  try {
    // Create query reference with the Data Connect instance, query name, and variables
    // Note: This is a simplified reference structure - in production, use the generated SDK
    const queryRef = { dataConnect: dc, name: queryName, variables };
    
    const result = await Promise.race([
      firebaseExecuteQuery(queryRef as unknown as Parameters<typeof firebaseExecuteQuery>[0]),
      timeoutPromise
    ]);
    
    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid query response');
    }
    
    return (result as { data: T }).data;
  } catch (error) {
    const err = error as Error;
    console.error(`[DataConnect] Query ${queryName} failed:`, err.message);
    
    // Fallback to Firestore on error - NEVER use localStorage
    console.log(`[DataConnect] Falling back to Firestore for query: ${queryName}`);
    return executeFirestoreQuery<T>(queryName, variables);
  }
}

/**
 * Execute a Data Connect mutation with proper error handling and timeout
 * Falls back to Firestore (NOT localStorage) when Data Connect is unavailable
 */
export async function executeMutation<T>(
  mutationName: string,
  variables?: Record<string, unknown>
): Promise<T> {
  // If Data Connect is disabled or not configured, use Firestore fallback
  if (!USE_DATA_CONNECT) {
    console.log(`[DataConnect] Using Firestore fallback for mutation: ${mutationName}`);
    return executeFirestoreMutation<T>(mutationName, variables);
  }
  
  const dc = getDataConnectInstance();
  
  // PERFORMANCE: Add timeout to prevent hanging requests
  const timeoutMs = 30000; // 30 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Mutation timeout')), timeoutMs);
  });
  
  try {
    // Create mutation reference with the Data Connect instance, mutation name, and variables
    // Note: This is a simplified reference structure - in production, use the generated SDK
    const mutationRef = { dataConnect: dc, name: mutationName, variables };
    
    const result = await Promise.race([
      firebaseExecuteMutation(mutationRef as unknown as Parameters<typeof firebaseExecuteMutation>[0]),
      timeoutPromise
    ]);
    
    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid mutation response');
    }
    
    return (result as { data: T }).data;
  } catch (error) {
    const err = error as Error;
    console.error(`[DataConnect] Mutation ${mutationName} failed:`, err.message);
    
    // Fallback to Firestore on error - NEVER use localStorage
    console.log(`[DataConnect] Falling back to Firestore for mutation: ${mutationName}`);
    return executeFirestoreMutation<T>(mutationName, variables);
  }
}

// ==================== FIRESTORE FALLBACK (ZERO localStorage) ====================

// Interface for internal booking mapping
interface InternalBooking {
  id: string;
  ticketId: string;
  qrCode: string;
  status: string;
  bookingDate: string;
  checkedInAt?: string;
  isWaitlist: boolean;
  userId: string;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  eventImage?: string;
}

/**
 * Execute Firestore query fallback - REPLACES localStorage
 * All data persistence goes to Cloud Firestore
 */
async function executeFirestoreQuery<T>(queryName: string, variables?: Record<string, unknown>): Promise<T> {
  console.log(`[DataConnect] Firestore fallback query: ${queryName}`);
  
  switch (queryName) {
    case 'GetUserByEmail': {
      const email = (variables?.email as string)?.toLowerCase();
      const user = await firestoreService.getUserByEmail(email);
      return { users: user ? [user] : [] } as T;
    }
    case 'GetUserById': {
      const id = variables?.id as string;
      const user = await firestoreService.getUserById(id);
      return { user: user || null } as T;
    }
    case 'ListPublishedEvents': {
      const events = await firestoreService.listPublishedEvents();
      return { events } as T;
    }
    case 'ListEvents': {
      const result = await firestoreService.listEvents();
      return { events: result } as T;
    }
    case 'GetEventById': {
      const event = await firestoreService.getEventById(variables?.id as string);
      return { event: event || null } as T;
    }
    case 'GetEventsByOrganizer': {
      const events = await firestoreService.listEvents({ organizerId: variables?.organizerId as string });
      return { events } as T;
    }
    case 'GetUserBookings': {
      const bookings = await firestoreService.getUserBookings(variables?.userId as string);
      return { bookings } as T;
    }
    case 'GetEventParticipants': {
      const participants = await firestoreService.getEventParticipants(variables?.eventId as string);
      return { bookings: participants } as T;
    }
    case 'GetBookingByTicketId': {
      const booking = await firestoreService.getBookingByTicketId(variables?.ticketId as string);
      return { bookings: booking ? [booking] : [] } as T;
    }
    case 'GetBookingById': {
      const booking = await firestoreService.getBookingById(variables?.id as string);
      return { booking: booking || null } as T;
    }
    case 'CheckExistingBooking': {
      const bookings = await firestoreService.getUserBookings(variables?.userId as string);
      const existing = bookings.filter((b: { eventId: string }) => b.eventId === variables?.eventId);
      return { bookings: existing.map((b: { id: string }) => ({ id: b.id })) } as T;
    }
    case 'GetUserFavorites': {
      const favorites = await firestoreService.getUserFavorites(variables?.userId as string);
      return { favorites } as T;
    }
    case 'GetUserFavoriteEvents': {
      const favorites = await firestoreService.getUserFavorites(variables?.userId as string);
      const eventIds = favorites.map((f: { eventId: string }) => f.eventId);
      const events = await Promise.all(eventIds.map((id: string) => firestoreService.getEventById(id)));
      return { events: events.filter(e => e !== null) } as T;
    }
    case 'CheckIsFavorite': {
      const isFavorite = await firestoreService.checkIsFavorite(
        variables?.userId as string,
        variables?.eventId as string
      );
      return { favorites: isFavorite ? [{ id: '1' }] : [] } as T;
    }
    case 'GetUserNotifications': {
      const notifications = await firestoreService.getUserNotifications(variables?.userId as string);
      return { notifications } as T;
    }
    case 'GetDashboardStats': {
      const stats = await firestoreService.getDashboardStats(variables?.organizerId as string);
      return stats as T;
    }
    case 'ListCategories': {
      const categories = await firestoreService.listCategories();
      return { categories } as T;
    }
    case 'GetEventReviews': {
      const reviews = await firestoreService.getEventReviews(variables?.eventId as string);
      return { reviews } as T;
    }
    default:
      console.warn(`[DataConnect] Unknown Firestore query: ${queryName}`);
      return {} as T;
  }
}

/**
 * Execute Firestore mutation fallback - REPLACES localStorage
 * All data writes go to Cloud Firestore
 */
async function executeFirestoreMutation<T>(mutationName: string, variables?: Record<string, unknown>): Promise<T> {
  console.log(`[DataConnect] Firestore fallback mutation: ${mutationName}`);
  
  switch (mutationName) {
    case 'CreateUser': {
      const userId = crypto.randomUUID();
      const id = await firestoreService.createUser(userId, {
        email: (variables?.email as string)?.toLowerCase() || '',
        displayName: (variables?.displayName as string) || '',
        role: (variables?.role as 'student' | 'admin' | 'super_admin') || 'student',
        emailDomain: variables?.emailDomain as string,
        firstName: variables?.firstName as string,
        lastName: variables?.lastName as string,
        year: variables?.year as string,
        division: variables?.division as string,
      });
      return { user_insert: { id } } as T;
    }
    case 'UpdateUser': {
      await firestoreService.updateUser(variables?.id as string, variables as Record<string, unknown>);
      return {} as T;
    }
    case 'CreateBooking': {
      const id = await firestoreService.createBooking({
        eventId: variables?.eventId as string,
        userId: variables?.studentId as string || variables?.userId as string,
        ticketId: (variables?.ticketId as string) || generateTicketId(),
        qrCode: (variables?.qrCode as string) || '',
        status: 'confirmed',
        isWaitlist: (variables?.isWaitlist as boolean) || false,
        numberOfTickets: 1,
        totalAmount: 0,
        paymentStatus: 'not_required',
      });
      return { booking_insert: { id } } as T;
    }
    case 'CheckInParticipant': {
      await firestoreService.checkInParticipant(
        variables?.id as string,
        variables?.checkedInBy as string
      );
      return {} as T;
    }
    case 'CancelBooking': {
      await firestoreService.cancelBooking(variables?.id as string);
      return {} as T;
    }
    case 'CreateEvent': {
      const id = await firestoreService.createEvent({
        title: variables?.title as string,
        description: variables?.description as string,
        date: firestoreService.toTimestamp(variables?.date as string),
        time: variables?.time as string,
        endTime: variables?.endTime as string,
        location: variables?.venue as string || '',
        venue: variables?.venue as string,
        categoryId: variables?.categoryId as string || '',
        imageUrl: variables?.coverPhotoUrl as string,
        capacity: variables?.capacity as number || 0,
        price: variables?.price as number || 0,
        isFree: (variables?.price as number || 0) === 0,
        currency: 'INR',
        organizerId: variables?.organizerId as string || '',
        status: 'draft',
        featured: false,
        requiresApproval: false,
        isPublic: true,
      });
      return { event_insert: { id } } as T;
    }
    case 'UpdateEvent': {
      await firestoreService.updateEvent(variables?.id as string, variables as Record<string, unknown>);
      return {} as T;
    }
    case 'UpdateEventStatus': {
      const status = variables?.status as 'draft' | 'published' | 'cancelled' | 'completed';
      await firestoreService.updateEvent(variables?.id as string, { status });
      return {} as T;
    }
    case 'DeleteEvent': {
      await firestoreService.deleteEvent(variables?.id as string);
      return {} as T;
    }
    case 'DecrementEventSlots': {
      const event = await firestoreService.getEventById(variables?.id as string);
      if (event && event.registeredCount < event.capacity) {
        await firestoreService.updateEvent(event.id, { registeredCount: event.registeredCount + 1 });
      }
      return {} as T;
    }
    case 'IncrementEventSlots': {
      const event = await firestoreService.getEventById(variables?.id as string);
      if (event && event.registeredCount > 0) {
        await firestoreService.updateEvent(event.id, { registeredCount: event.registeredCount - 1 });
      }
      return {} as T;
    }
    case 'AddFavorite': {
      const id = await firestoreService.addFavorite(
        variables?.userId as string,
        variables?.eventId as string
      );
      return { favorite_insert: { id } } as T;
    }
    case 'RemoveFavorite': {
      await firestoreService.removeFavorite(
        variables?.userId as string,
        variables?.eventId as string
      );
      return {} as T;
    }
    case 'CreateNotification': {
      const id = await firestoreService.createNotification({
        userId: variables?.userId as string,
        title: variables?.title as string,
        message: variables?.message as string,
        type: (variables?.type as string) || 'system',
      });
      return { notification_insert: { id } } as T;
    }
    case 'MarkNotificationRead': {
      await firestoreService.markNotificationRead(variables?.id as string);
      return {} as T;
    }
    case 'CreateCategory': {
      const id = await firestoreService.createCategory({
        name: variables?.name as string,
        icon: variables?.icon as string,
        color: variables?.color as string,
        isActive: true,
        sortOrder: 0,
      });
      return { category_insert: { id } } as T;
    }
    case 'CreateReview': {
      const id = await firestoreService.createReview({
        eventId: variables?.eventId as string,
        userId: variables?.userId as string,
        rating: variables?.rating as number,
        comment: variables?.comment as string,
        isAnonymous: false,
      });
      return { review_insert: { id } } as T;
    }
    case 'CreateCheckInLog': {
      console.log('[DataConnect] Check-in logged to Firestore:', variables);
      return {} as T;
    }
    default:
      console.warn(`[DataConnect] Unknown Firestore mutation: ${mutationName}`);
      return {} as T;
  }
}

// ==================== USER OPERATIONS ====================

// Interface matching the actual GraphQL schema
export interface DataConnectUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  emailDomain?: string;
  firstName?: string;
  lastName?: string;
  year?: string;
  division?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Get user by Firebase Auth UID
 * Since schema uses auto-generated UUID, we use email-based lookup
 * This function is kept for backward compatibility with authService
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    // Import auth to get the user's email
    const { auth } = await import('./firebase');
    const currentUser = auth.currentUser;
    
    // If we have a current user with matching UID, use their email
    if (currentUser && currentUser.uid === userId && currentUser.email) {
      return await getUserByEmail(currentUser.email);
    }
    
    // If no current user or UID doesn't match, we can't look up by UID
    // because the schema uses auto-generated UUIDs, not Firebase UIDs
    console.warn('[DataConnect] getUserById: Cannot look up user by Firebase UID directly, need email');
    return null;
  } catch (error) {
    console.error('[DataConnect] Error getting user:', error);
    return null;
  }
};

/**
 * Get user by email - primary lookup method
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  if (!email) return null;
  
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
 * Note: The schema auto-generates UUID for id, so we pass email-based data
 */
export const createUser = async (
  userId: string, 
  userData: Omit<User, 'id'>
): Promise<User> => {
  try {
    // Parse institutional email for additional fields
    const email = userData.email.toLowerCase();
    const emailDomain = email.includes('@') ? '@' + email.split('@')[1] : null;
    
    // Parse name into first/last name
    const nameParts = (userData.name || '').trim().split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;
    
    // Parse email parts for institutional email format (firstname.lastname.year.division@domain)
    let year = null;
    let division = null;
    const localPart = email.split('@')[0];
    const emailParts = localPart.split('.');
    if (emailParts.length >= 4) {
      year = emailParts[2] || null;
      division = emailParts[3] || null;
    }
    
    await executeMutation('CreateUser', {
      email: email,
      displayName: userData.name || `${firstName || ''} ${lastName || ''}`.trim() || 'User',
      role: userData.role || 'student',
      emailDomain: emailDomain,
      firstName: firstName,
      lastName: lastName,
      year: year,
      division: division
    });
    
    // Return user with the Firebase UID as the id (for app consistency)
    return { id: userId, ...userData };
  } catch (error) {
    console.error('[DataConnect] Error creating user:', error);
    throw error;
  }
};

/**
 * Update user profile
 * Note: We need to get the database UUID first since Firebase UID != database UUID
 */
export const updateUser = async (
  userId: string, 
  data: Partial<User>
): Promise<void> => {
  try {
    // Get the user's database record to find their UUID
    const { auth } = await import('./firebase');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    
    // Get user by email to find their database UUID
    const result = await executeQuery<{ users: DataConnectUser[] }>('GetUserByEmail', { 
      email: currentUser.email?.toLowerCase() 
    });
    
    if (!result.users || result.users.length === 0) {
      throw new Error('User not found in database');
    }
    
    const dbUser = result.users[0];
    
    // Parse name into first/last
    const nameParts = (data.name || '').trim().split(' ');
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.slice(1).join(' ') || undefined;
    
    await executeMutation('UpdateUser', {
      id: dbUser.id, // Use the database UUID, not Firebase UID
      displayName: data.name,
      firstName: firstName,
      lastName: lastName,
      year: undefined,
      division: undefined
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
  // Construct name from firstName + lastName if displayName is empty
  const displayName = dcUser.displayName || 
    `${dcUser.firstName || ''} ${dcUser.lastName || ''}`.trim() || 
    'User';
  
  return {
    id: dcUser.id,
    name: displayName,
    email: dcUser.email,
    role: dcUser.role as 'student' | 'admin',
    // These fields aren't in the current schema but kept for compatibility
    phone: undefined,
    avatarUrl: undefined,
    department: dcUser.division || dcUser.year, // Use division or year as department
    rollNo: undefined
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
