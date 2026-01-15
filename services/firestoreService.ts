/**
 * Firestore Service - Fallback Database Layer
 * 
 * This service provides Firestore operations as a fallback when Firebase Data Connect
 * is unavailable or fails. It mirrors the Data Connect schema structure.
 * 
 * ZERO localStorage TOLERANCE - All data persists in Firestore
 * 
 * Architecture:
 * 1. Primary: Firebase Data Connect (Cloud SQL PostgreSQL)
 * 2. Fallback: Cloud Firestore (this service)
 * 
 * @module services/firestoreService
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  DocumentReference,
  DocumentSnapshot,
  QueryConstraint,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  FieldValue
} from 'firebase/firestore';
import { app } from './firebase';

// ============================================================================
// FIRESTORE INITIALIZATION
// ============================================================================

const db = getFirestore(app);

// Connect to emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  const port = parseInt(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || '8080');
  connectFirestoreEmulator(db, 'localhost', port);
  console.log('[Firestore] Connected to emulator on port', port);
}

// Enable offline persistence
if (import.meta.env.VITE_FIRESTORE_PERSISTENCE === 'true') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firestore] Persistence unavailable: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firestore] Persistence not supported in this browser');
    }
  });
}

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  BOOKINGS: 'bookings',
  CATEGORIES: 'categories',
  FAVORITES: 'favorites',
  NOTIFICATIONS: 'notifications',
  REVIEWS: 'reviews',
  CHECK_IN_LOGS: 'checkInLogs',
  ANNOUNCEMENTS: 'announcements',
  PAYMENT_TRANSACTIONS: 'paymentTransactions',
  FILE_UPLOADS: 'fileUploads',
  DAILY_METRICS: 'dailyEventMetrics',
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Base document with common fields
interface BaseDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Soft-deletable document
interface SoftDeletable {
  isDeleted: boolean;
  deletedAt?: Timestamp | null;
}

// User document
export interface FirestoreUser extends BaseDocument, SoftDeletable {
  email: string;
  displayName: string;
  role: 'student' | 'admin' | 'super_admin';
  emailDomain?: string;
  firstName?: string;
  lastName?: string;
  year?: string;
  division?: string;
  department?: string;
  rollNo?: string;
  avatarUrl?: string;
  collegeIdUrl?: string;
  phone?: string;
  lastLoginAt?: Timestamp;
}

// Event document
export interface FirestoreEvent extends BaseDocument, SoftDeletable {
  title: string;
  description: string;
  shortDescription?: string;
  date: Timestamp;
  time: string;
  endTime?: string;
  location: string;
  venue?: string;
  imageUrl?: string;
  categoryId: string;
  categoryName?: string;
  organizerId: string;
  organizerName?: string;
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  price: number;
  isFree: boolean;
  currency: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  featured: boolean;
  requiresApproval: boolean;
  isPublic: boolean;
  tags?: string[];
  averageRating: number;
  totalReviews: number;
  publishedAt?: Timestamp;
}

// Booking document
export interface FirestoreBooking extends BaseDocument, SoftDeletable {
  userId: string;
  eventId: string;
  ticketId: string;
  qrCode?: string;
  status: 'confirmed' | 'cancelled' | 'checked_in' | 'waitlist' | 'expired' | 'no_show';
  isWaitlist: boolean;
  waitlistPosition?: number;
  numberOfTickets: number;
  totalAmount: number;
  paymentStatus: 'not_required' | 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  checkInTime?: Timestamp;
  checkedInBy?: string;
  checkInMethod?: string;
  // Denormalized fields
  eventTitle?: string;
  eventDate?: Timestamp;
  eventTime?: string;
  eventVenue?: string;
  eventImageUrl?: string;
  userName?: string;
  userEmail?: string;
  cancelledAt?: Timestamp;
  cancelReason?: string;
}

// Category document
export interface FirestoreCategory extends BaseDocument {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
}

// Favorite document
export interface FirestoreFavorite extends BaseDocument {
  userId: string;
  eventId: string;
}

// Notification document
export interface FirestoreNotification extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: string;
  eventId?: string;
  bookingId?: string;
  actionUrl?: string;
  read: boolean;
  readAt?: Timestamp;
  expiresAt?: Timestamp;
}

// Review document
export interface FirestoreReview extends BaseDocument, SoftDeletable {
  userId: string;
  eventId: string;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  isFlagged: boolean;
  flagReason?: string;
  flaggedBy?: string;
  flaggedAt?: Timestamp;
  isApproved: boolean;
  userName?: string;
  userAvatarUrl?: string;
}

// Check-in log document (immutable)
export interface FirestoreCheckInLog {
  id: string;
  bookingId: string;
  eventId: string;
  userId: string;
  checkedInBy: string;
  method: 'qr_scan' | 'manual_entry' | 'ticket_id' | 'auto';
  deviceInfo?: string;
  ipAddress?: string;
  checkedInAt: Timestamp;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID (UUID v4)
 */
export const generateId = (): string => {
  return crypto.randomUUID();
};

/**
 * Generate a unique ticket ID
 */
export const generateTicketId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomPart = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `EVT-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
};

/**
 * Convert Firestore Timestamp to ISO string
 */
export const timestampToISO = (timestamp: Timestamp | undefined | null): string => {
  if (!timestamp) return new Date().toISOString();
  return timestamp.toDate().toISOString();
};

/**
 * Convert Date/string to Firestore Timestamp
 */
export const toTimestamp = (date: Date | string): Timestamp => {
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return Timestamp.fromDate(date);
};

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<FirestoreUser | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return { id: docSnap.id, ...docSnap.data() } as FirestoreUser;
  } catch (error) {
    console.error('[Firestore] getUserById failed:', error);
    throw error;
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<FirestoreUser | null> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('email', '==', email.toLowerCase()),
      where('isDeleted', '==', false),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as FirestoreUser;
  } catch (error) {
    console.error('[Firestore] getUserByEmail failed:', error);
    throw error;
  }
};

/**
 * Create a new user
 */
export const createUser = async (
  userId: string,
  data: Omit<FirestoreUser, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
): Promise<string> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await setDoc(docRef, {
      ...data,
      email: data.email.toLowerCase(),
      isDeleted: false,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] User created:', userId);
    return userId;
  } catch (error) {
    console.error('[Firestore] createUser failed:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUser = async (
  userId: string,
  data: Partial<Omit<FirestoreUser, 'id' | 'email' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] User updated:', userId);
  } catch (error) {
    console.error('[Firestore] updateUser failed:', error);
    throw error;
  }
};

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

/**
 * Get event by ID
 */
export const getEventById = async (eventId: string): Promise<FirestoreEvent | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.EVENTS, eventId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    if (data.isDeleted) return null;
    
    return { id: docSnap.id, ...data } as FirestoreEvent;
  } catch (error) {
    console.error('[Firestore] getEventById failed:', error);
    throw error;
  }
};

/**
 * List events with filters
 */
export const listEvents = async (options: {
  status?: string;
  categoryId?: string;
  organizerId?: string;
  featured?: boolean;
  limitCount?: number;
  orderByField?: 'date' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
} = {}): Promise<FirestoreEvent[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where('isDeleted', '==', false),
    ];
    
    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }
    
    if (options.categoryId) {
      constraints.push(where('categoryId', '==', options.categoryId));
    }
    
    if (options.organizerId) {
      constraints.push(where('organizerId', '==', options.organizerId));
    }
    
    if (options.featured !== undefined) {
      constraints.push(where('featured', '==', options.featured));
    }
    
    constraints.push(orderBy(options.orderByField || 'date', options.orderDirection || 'asc'));
    
    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }
    
    const q = query(collection(db, COLLECTIONS.EVENTS), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreEvent));
  } catch (error) {
    console.error('[Firestore] listEvents failed:', error);
    throw error;
  }
};

/**
 * List published events
 */
export const listPublishedEvents = async (limitCount: number = 50): Promise<FirestoreEvent[]> => {
  return listEvents({ status: 'published', limitCount });
};

/**
 * Create a new event
 */
export const createEvent = async (
  data: Omit<FirestoreEvent, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'registeredCount' | 'waitlistCount' | 'averageRating' | 'totalReviews'>
): Promise<string> => {
  try {
    const eventId = generateId();
    const docRef = doc(db, COLLECTIONS.EVENTS, eventId);
    
    await setDoc(docRef, {
      ...data,
      registeredCount: 0,
      waitlistCount: 0,
      averageRating: 0,
      totalReviews: 0,
      isDeleted: false,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] Event created:', eventId);
    return eventId;
  } catch (error) {
    console.error('[Firestore] createEvent failed:', error);
    throw error;
  }
};

/**
 * Update an event
 */
export const updateEvent = async (
  eventId: string,
  data: Partial<Omit<FirestoreEvent, 'id' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] Event updated:', eventId);
  } catch (error) {
    console.error('[Firestore] updateEvent failed:', error);
    throw error;
  }
};

/**
 * Soft delete an event
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] Event soft-deleted:', eventId);
  } catch (error) {
    console.error('[Firestore] deleteEvent failed:', error);
    throw error;
  }
};

/**
 * Update event status
 */
export const updateEventStatus = async (eventId: string, status: FirestoreEvent['status']): Promise<void> => {
  const updates: Partial<FirestoreEvent> = { status };
  
  if (status === 'published') {
    updates.publishedAt = Timestamp.now();
  }
  
  return updateEvent(eventId, updates);
};

/**
 * Increment/decrement event registration count
 */
export const updateEventRegistrationCount = async (eventId: string, delta: number): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(docRef, {
      registeredCount: increment(delta),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[Firestore] updateEventRegistrationCount failed:', error);
    throw error;
  }
};

// ============================================================================
// BOOKING OPERATIONS
// ============================================================================

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId: string): Promise<FirestoreBooking | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    if (data.isDeleted) return null;
    
    return { id: docSnap.id, ...data } as FirestoreBooking;
  } catch (error) {
    console.error('[Firestore] getBookingById failed:', error);
    throw error;
  }
};

/**
 * Get booking by ticket ID
 */
export const getBookingByTicketId = async (ticketId: string): Promise<FirestoreBooking | null> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('ticketId', '==', ticketId),
      where('isDeleted', '==', false),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as FirestoreBooking;
  } catch (error) {
    console.error('[Firestore] getBookingByTicketId failed:', error);
    throw error;
  }
};

/**
 * Get user's bookings
 */
export const getUserBookings = async (userId: string, limitCount: number = 50): Promise<FirestoreBooking[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('userId', '==', userId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreBooking));
  } catch (error) {
    console.error('[Firestore] getUserBookings failed:', error);
    throw error;
  }
};

/**
 * Get event participants (bookings)
 */
export const getEventParticipants = async (eventId: string, limitCount: number = 100): Promise<FirestoreBooking[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('eventId', '==', eventId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreBooking));
  } catch (error) {
    console.error('[Firestore] getEventParticipants failed:', error);
    throw error;
  }
};

/**
 * Check if user has existing booking for event
 */
export const checkExistingBooking = async (userId: string, eventId: string): Promise<FirestoreBooking | null> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('isDeleted', '==', false),
      where('status', 'in', ['confirmed', 'waitlist']),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as FirestoreBooking;
  } catch (error) {
    console.error('[Firestore] checkExistingBooking failed:', error);
    throw error;
  }
};

/**
 * Create a new booking
 */
export const createBooking = async (
  data: Omit<FirestoreBooking, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
): Promise<string> => {
  try {
    const bookingId = generateId();
    const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
    
    await setDoc(docRef, {
      ...data,
      ticketId: data.ticketId || generateTicketId(),
      isDeleted: false,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Update event registration count
    await updateEventRegistrationCount(data.eventId, 1);
    
    console.log('[Firestore] Booking created:', bookingId);
    return bookingId;
  } catch (error) {
    console.error('[Firestore] createBooking failed:', error);
    throw error;
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId: string, reason?: string): Promise<void> => {
  try {
    // Get booking to find event ID
    const booking = await getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    
    const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelReason: reason || null,
      updatedAt: serverTimestamp(),
    });
    
    // Decrement event registration count
    await updateEventRegistrationCount(booking.eventId, -1);
    
    console.log('[Firestore] Booking cancelled:', bookingId);
  } catch (error) {
    console.error('[Firestore] cancelBooking failed:', error);
    throw error;
  }
};

/**
 * Check in a participant
 */
export const checkInParticipant = async (
  bookingId: string, 
  checkedInBy: string,
  method: FirestoreCheckInLog['method'] = 'qr_scan'
): Promise<void> => {
  try {
    const booking = await getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    
    const batch = writeBatch(db);
    
    // Update booking
    const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
    batch.update(bookingRef, {
      status: 'checked_in',
      checkInTime: serverTimestamp(),
      checkedInBy,
      checkInMethod: method,
      updatedAt: serverTimestamp(),
    });
    
    // Create check-in log
    const logId = generateId();
    const logRef = doc(db, COLLECTIONS.CHECK_IN_LOGS, logId);
    batch.set(logRef, {
      id: logId,
      bookingId,
      eventId: booking.eventId,
      userId: booking.userId,
      checkedInBy,
      method,
      checkedInAt: serverTimestamp(),
    });
    
    await batch.commit();
    
    console.log('[Firestore] Participant checked in:', bookingId);
  } catch (error) {
    console.error('[Firestore] checkInParticipant failed:', error);
    throw error;
  }
};

// ============================================================================
// CATEGORY OPERATIONS
// ============================================================================

/**
 * List all active categories
 */
export const listCategories = async (): Promise<FirestoreCategory[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CATEGORIES),
      where('isActive', '==', true),
      orderBy('sortOrder', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreCategory));
  } catch (error) {
    console.error('[Firestore] listCategories failed:', error);
    throw error;
  }
};

/**
 * Create a category
 */
export const createCategory = async (
  data: Omit<FirestoreCategory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const categoryId = generateId();
    const docRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] Category created:', categoryId);
    return categoryId;
  } catch (error) {
    console.error('[Firestore] createCategory failed:', error);
    throw error;
  }
};

// ============================================================================
// FAVORITE OPERATIONS
// ============================================================================

/**
 * Get user's favorites
 */
export const getUserFavorites = async (userId: string): Promise<FirestoreFavorite[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.FAVORITES),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreFavorite));
  } catch (error) {
    console.error('[Firestore] getUserFavorites failed:', error);
    throw error;
  }
};

/**
 * Check if event is favorited
 */
export const checkIsFavorite = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.FAVORITES),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[Firestore] checkIsFavorite failed:', error);
    throw error;
  }
};

/**
 * Add favorite
 */
export const addFavorite = async (userId: string, eventId: string): Promise<string> => {
  try {
    const favoriteId = generateId();
    const docRef = doc(db, COLLECTIONS.FAVORITES, favoriteId);
    
    await setDoc(docRef, {
      id: favoriteId,
      userId,
      eventId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] Favorite added:', favoriteId);
    return favoriteId;
  } catch (error) {
    console.error('[Firestore] addFavorite failed:', error);
    throw error;
  }
};

/**
 * Remove favorite
 */
export const removeFavorite = async (userId: string, eventId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.FAVORITES),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
      console.log('[Firestore] Favorite removed');
    }
  } catch (error) {
    console.error('[Firestore] removeFavorite failed:', error);
    throw error;
  }
};

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Get user's notifications
 */
export const getUserNotifications = async (userId: string, limitCount: number = 50): Promise<FirestoreNotification[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreNotification));
  } catch (error) {
    console.error('[Firestore] getUserNotifications failed:', error);
    throw error;
  }
};

/**
 * Create notification
 */
export const createNotification = async (
  data: Omit<FirestoreNotification, 'id' | 'createdAt' | 'updatedAt' | 'read' | 'readAt'>
): Promise<string> => {
  try {
    const notificationId = generateId();
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    
    await setDoc(docRef, {
      ...data,
      read: false,
      readAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] Notification created:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[Firestore] createNotification failed:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(docRef, {
      read: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('[Firestore] Notification marked as read:', notificationId);
  } catch (error) {
    console.error('[Firestore] markNotificationRead failed:', error);
    throw error;
  }
};

// ============================================================================
// REVIEW OPERATIONS
// ============================================================================

/**
 * Get event reviews
 */
export const getEventReviews = async (
  eventId: string, 
  options: { 
    sortBy?: 'recent' | 'highest' | 'lowest';
    limitCount?: number;
  } = {}
): Promise<FirestoreReview[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where('eventId', '==', eventId),
      where('isDeleted', '==', false),
      where('isApproved', '==', true),
    ];
    
    switch (options.sortBy) {
      case 'highest':
        constraints.push(orderBy('rating', 'desc'));
        break;
      case 'lowest':
        constraints.push(orderBy('rating', 'asc'));
        break;
      case 'recent':
      default:
        constraints.push(orderBy('createdAt', 'desc'));
    }
    
    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }
    
    const q = query(collection(db, COLLECTIONS.REVIEWS), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreReview));
  } catch (error) {
    console.error('[Firestore] getEventReviews failed:', error);
    throw error;
  }
};

/**
 * Create a review
 */
export const createReview = async (
  data: Omit<FirestoreReview, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'isFlagged' | 'isApproved'>
): Promise<string> => {
  try {
    const reviewId = generateId();
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    
    await setDoc(docRef, {
      ...data,
      isDeleted: false,
      isFlagged: false,
      isApproved: true, // Auto-approve for now
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Update event review count and average
    // This should ideally be done in a Cloud Function for consistency
    
    console.log('[Firestore] Review created:', reviewId);
    return reviewId;
  } catch (error) {
    console.error('[Firestore] createReview failed:', error);
    throw error;
  }
};

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (organizerId?: string): Promise<{
  totalEvents: number;
  activeEvents: number;
  totalBookings: number;
  totalRevenue: number;
}> => {
  try {
    // Get events
    const eventsConstraints: QueryConstraint[] = [where('isDeleted', '==', false)];
    if (organizerId) {
      eventsConstraints.push(where('organizerId', '==', organizerId));
    }
    
    const eventsQuery = query(collection(db, COLLECTIONS.EVENTS), ...eventsConstraints);
    const eventsSnapshot = await getDocs(eventsQuery);
    
    const events = eventsSnapshot.docs.map(doc => doc.data() as FirestoreEvent);
    const totalEvents = events.length;
    const activeEvents = events.filter(e => e.status === 'published').length;
    
    // Get bookings
    const bookingsConstraints: QueryConstraint[] = [where('isDeleted', '==', false)];
    const bookingsQuery = query(collection(db, COLLECTIONS.BOOKINGS), ...bookingsConstraints);
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    const bookings = bookingsSnapshot.docs.map(doc => doc.data() as FirestoreBooking);
    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'completed')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    return {
      totalEvents,
      activeEvents,
      totalBookings,
      totalRevenue,
    };
  } catch (error) {
    console.error('[Firestore] getDashboardStats failed:', error);
    throw error;
  }
};

// ============================================================================
// REVIEW MODERATION
// ============================================================================

/**
 * Delete (soft-delete) a review
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[Firestore] Review deleted:', reviewId);
  } catch (error) {
    console.error('[Firestore] deleteReview failed:', error);
    throw error;
  }
};

/**
 * Flag a review for moderation
 */
export const flagReview = async (reviewId: string, userId: string, reason?: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await updateDoc(docRef, {
      isFlagged: true,
      flaggedBy: userId,
      flagReason: reason || 'Flagged by user',
      flaggedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[Firestore] Review flagged:', reviewId);
  } catch (error) {
    console.error('[Firestore] flagReview failed:', error);
    throw error;
  }
};

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

import {
  onSnapshot,
  QuerySnapshot,
  Unsubscribe,
  runTransaction,
  Transaction
} from 'firebase/firestore';

export type UnsubscribeFn = Unsubscribe;

/**
 * Subscribe to real-time event updates
 */
export const subscribeToEvents = (
  options: {
    status?: string;
    organizerId?: string;
    limitCount?: number;
  },
  onData: (events: FirestoreEvent[]) => void,
  onError?: (error: Error) => void
): UnsubscribeFn => {
  const constraints: QueryConstraint[] = [where('isDeleted', '==', false)];
  
  if (options.status) {
    constraints.push(where('status', '==', options.status));
  }
  if (options.organizerId) {
    constraints.push(where('organizerId', '==', options.organizerId));
  }
  constraints.push(orderBy('date', 'asc'));
  if (options.limitCount) {
    constraints.push(limit(options.limitCount));
  }
  
  const q = query(collection(db, COLLECTIONS.EVENTS), ...constraints);
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreEvent));
      onData(events);
    },
    (error) => {
      console.error('[Firestore] subscribeToEvents error:', error);
      onError?.(error);
    }
  );
};

/**
 * Subscribe to a single event's updates
 */
export const subscribeToEvent = (
  eventId: string,
  onData: (event: FirestoreEvent | null) => void,
  onError?: (error: Error) => void
): UnsubscribeFn => {
  const docRef = doc(db, COLLECTIONS.EVENTS, eventId);
  
  return onSnapshot(
    docRef,
    (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!data.isDeleted) {
          onData({ id: snapshot.id, ...data } as FirestoreEvent);
        } else {
          onData(null);
        }
      } else {
        onData(null);
      }
    },
    (error) => {
      console.error('[Firestore] subscribeToEvent error:', error);
      onError?.(error);
    }
  );
};

/**
 * Subscribe to user's bookings
 */
export const subscribeToUserBookings = (
  userId: string,
  onData: (bookings: FirestoreBooking[]) => void,
  onError?: (error: Error) => void
): UnsubscribeFn => {
  const q = query(
    collection(db, COLLECTIONS.BOOKINGS),
    where('userId', '==', userId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreBooking));
      onData(bookings);
    },
    (error) => {
      console.error('[Firestore] subscribeToUserBookings error:', error);
      onError?.(error);
    }
  );
};

/**
 * Subscribe to event participants
 */
export const subscribeToEventParticipants = (
  eventId: string,
  onData: (bookings: FirestoreBooking[]) => void,
  onError?: (error: Error) => void
): UnsubscribeFn => {
  const q = query(
    collection(db, COLLECTIONS.BOOKINGS),
    where('eventId', '==', eventId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreBooking));
      onData(bookings);
    },
    (error) => {
      console.error('[Firestore] subscribeToEventParticipants error:', error);
      onError?.(error);
    }
  );
};

/**
 * Subscribe to user's notifications
 */
export const subscribeToNotifications = (
  userId: string,
  onData: (notifications: FirestoreNotification[]) => void,
  onError?: (error: Error) => void,
  limitCount: number = 20
): UnsubscribeFn => {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreNotification));
      onData(notifications);
    },
    (error) => {
      console.error('[Firestore] subscribeToNotifications error:', error);
      onError?.(error);
    }
  );
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch create multiple bookings (e.g., for group registrations)
 */
export const batchCreateBookings = async (
  bookings: Array<Omit<FirestoreBooking, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>>
): Promise<string[]> => {
  try {
    const batch = writeBatch(db);
    const ids: string[] = [];
    const eventUpdates = new Map<string, number>();
    
    for (const bookingData of bookings) {
      const bookingId = generateId();
      ids.push(bookingId);
      
      const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      batch.set(docRef, {
        ...bookingData,
        ticketId: bookingData.ticketId || generateTicketId(),
        isDeleted: false,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Track event registration increments
      const count = eventUpdates.get(bookingData.eventId) || 0;
      eventUpdates.set(bookingData.eventId, count + 1);
    }
    
    // Update event registration counts
    for (const [eventId, count] of eventUpdates) {
      const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
      batch.update(eventRef, {
        registeredCount: increment(count),
        updatedAt: serverTimestamp(),
      });
    }
    
    await batch.commit();
    console.log('[Firestore] Batch created', ids.length, 'bookings');
    return ids;
  } catch (error) {
    console.error('[Firestore] batchCreateBookings failed:', error);
    throw error;
  }
};

/**
 * Batch cancel multiple bookings
 */
export const batchCancelBookings = async (
  bookingIds: string[],
  reason?: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const eventDecrements = new Map<string, number>();
    
    // First, get all bookings to find their event IDs
    for (const bookingId of bookingIds) {
      const booking = await getBookingById(bookingId);
      if (booking && booking.status !== 'cancelled') {
        const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
        batch.update(docRef, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          cancelReason: reason || null,
          updatedAt: serverTimestamp(),
        });
        
        const count = eventDecrements.get(booking.eventId) || 0;
        eventDecrements.set(booking.eventId, count + 1);
      }
    }
    
    // Update event registration counts
    for (const [eventId, count] of eventDecrements) {
      const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
      batch.update(eventRef, {
        registeredCount: increment(-count),
        updatedAt: serverTimestamp(),
      });
    }
    
    await batch.commit();
    console.log('[Firestore] Batch cancelled', bookingIds.length, 'bookings');
  } catch (error) {
    console.error('[Firestore] batchCancelBookings failed:', error);
    throw error;
  }
};

/**
 * Batch mark notifications as read
 */
export const batchMarkNotificationsRead = async (notificationIds: string[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    for (const notificationId of notificationIds) {
      const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      batch.update(docRef, {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    
    await batch.commit();
    console.log('[Firestore] Batch marked', notificationIds.length, 'notifications as read');
  } catch (error) {
    console.error('[Firestore] batchMarkNotificationsRead failed:', error);
    throw error;
  }
};

/**
 * Batch delete notifications
 */
export const batchDeleteNotifications = async (notificationIds: string[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    for (const notificationId of notificationIds) {
      const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      batch.delete(docRef);
    }
    
    await batch.commit();
    console.log('[Firestore] Batch deleted', notificationIds.length, 'notifications');
  } catch (error) {
    console.error('[Firestore] batchDeleteNotifications failed:', error);
    throw error;
  }
};

// ============================================================================
// TRANSACTION SUPPORT
// ============================================================================

/**
 * Create booking with transaction (ensures slot availability)
 */
export const createBookingWithTransaction = async (
  data: Omit<FirestoreBooking, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
): Promise<{ bookingId: string; isWaitlist: boolean }> => {
  try {
    return await runTransaction(db, async (transaction: Transaction) => {
      // Get current event data
      const eventRef = doc(db, COLLECTIONS.EVENTS, data.eventId);
      const eventDoc = await transaction.get(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const event = eventDoc.data() as FirestoreEvent;
      
      if (event.isDeleted) {
        throw new Error('Event has been deleted');
      }
      
      if (event.status !== 'published') {
        throw new Error('Event is not accepting registrations');
      }
      
      // Check capacity
      const hasCapacity = event.registeredCount < event.capacity;
      const isWaitlist = !hasCapacity;
      
      // Create booking
      const bookingId = generateId();
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      
      transaction.set(bookingRef, {
        ...data,
        ticketId: data.ticketId || generateTicketId(),
        isWaitlist,
        status: isWaitlist ? 'waitlist' : 'confirmed',
        waitlistPosition: isWaitlist ? event.waitlistCount + 1 : undefined,
        isDeleted: false,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Update event counts
      if (isWaitlist) {
        transaction.update(eventRef, {
          waitlistCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.update(eventRef, {
          registeredCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
      
      console.log('[Firestore] Transaction created booking:', bookingId, isWaitlist ? '(waitlist)' : '');
      return { bookingId, isWaitlist };
    });
  } catch (error) {
    console.error('[Firestore] createBookingWithTransaction failed:', error);
    throw error;
  }
};

/**
 * Check in with transaction (prevents double check-in)
 */
export const checkInWithTransaction = async (
  bookingId: string,
  checkedInBy: string,
  method: FirestoreCheckInLog['method'] = 'qr_scan'
): Promise<{ success: boolean; alreadyCheckedIn: boolean }> => {
  try {
    return await runTransaction(db, async (transaction: Transaction) => {
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      const bookingDoc = await transaction.get(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      
      const booking = bookingDoc.data() as FirestoreBooking;
      
      if (booking.isDeleted) {
        throw new Error('Booking has been deleted');
      }
      
      if (booking.status === 'cancelled') {
        throw new Error('Booking has been cancelled');
      }
      
      // Check if already checked in
      if (booking.status === 'checked_in') {
        return { success: false, alreadyCheckedIn: true };
      }
      
      // Update booking
      transaction.update(bookingRef, {
        status: 'checked_in',
        checkInTime: serverTimestamp(),
        checkedInBy,
        checkInMethod: method,
        updatedAt: serverTimestamp(),
      });
      
      // Create check-in log
      const logId = generateId();
      const logRef = doc(db, COLLECTIONS.CHECK_IN_LOGS, logId);
      transaction.set(logRef, {
        id: logId,
        bookingId,
        eventId: booking.eventId,
        userId: booking.userId,
        checkedInBy,
        method,
        checkedInAt: serverTimestamp(),
      });
      
      console.log('[Firestore] Transaction checked in:', bookingId);
      return { success: true, alreadyCheckedIn: false };
    });
  } catch (error) {
    console.error('[Firestore] checkInWithTransaction failed:', error);
    throw error;
  }
};

/**
 * Promote from waitlist with transaction
 */
export const promoteFromWaitlistWithTransaction = async (
  eventId: string
): Promise<string | null> => {
  try {
    return await runTransaction(db, async (transaction: Transaction) => {
      // Get event
      const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
      const eventDoc = await transaction.get(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const event = eventDoc.data() as FirestoreEvent;
      
      // Check if there's capacity
      if (event.registeredCount >= event.capacity) {
        return null; // No capacity available
      }
      
      // Get first waitlist booking
      const waitlistQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('eventId', '==', eventId),
        where('isWaitlist', '==', true),
        where('status', '==', 'waitlist'),
        where('isDeleted', '==', false),
        orderBy('waitlistPosition', 'asc'),
        limit(1)
      );
      
      // Note: We can't use getDocs in a transaction directly for queries
      // This is a simplified version - in production, use a different approach
      const waitlistSnapshot = await getDocs(waitlistQuery);
      
      if (waitlistSnapshot.empty) {
        return null; // No one on waitlist
      }
      
      const waitlistBooking = waitlistSnapshot.docs[0];
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, waitlistBooking.id);
      
      // Promote booking
      transaction.update(bookingRef, {
        status: 'confirmed',
        isWaitlist: false,
        waitlistPosition: null,
        updatedAt: serverTimestamp(),
      });
      
      // Update event counts
      transaction.update(eventRef, {
        registeredCount: increment(1),
        waitlistCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      
      // Create notification for user
      const booking = waitlistBooking.data() as FirestoreBooking;
      const notificationId = generateId();
      const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      transaction.set(notificationRef, {
        id: notificationId,
        userId: booking.userId,
        title: 'You\'re In!',
        message: `Great news! A spot opened up for ${booking.eventTitle || 'the event'}. Your registration is now confirmed.`,
        type: 'waitlist_promoted',
        eventId,
        bookingId: waitlistBooking.id,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('[Firestore] Promoted from waitlist:', waitlistBooking.id);
      return waitlistBooking.id;
    });
  } catch (error) {
    console.error('[Firestore] promoteFromWaitlistWithTransaction failed:', error);
    throw error;
  }
};

// ============================================================================
// EXPORT DATABASE INSTANCE
// ============================================================================

export { db };

console.log('[Firestore] Service initialized with real-time listeners, batch operations, and transaction support');
