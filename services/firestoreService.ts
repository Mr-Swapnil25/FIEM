/**
 * Firestore Service - Backward Compatibility Layer
 * 
 * This file re-exports from the new modular structure.
 * The original 1820-line file has been decomposed into domain-specific modules.
 * 
 * @deprecated Import from './firestore' or specific modules instead
 * @module services/firestoreService
 */

// Re-export everything from the new modular index
export * from './firestore';

// Dashboard stats (kept here for now as it crosses domains)
import { getDocs, query, where, collection, QueryConstraint } from 'firebase/firestore';
import { db, COLLECTIONS } from './firestore/core';
import { FirestoreEvent, FirestoreBooking } from './firestore/types';

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
    const eventsConstraints: QueryConstraint[] = [where('isDeleted', '==', false)];
    if (organizerId) {
      eventsConstraints.push(where('organizerId', '==', organizerId));
    }

    const eventsQuery = query(collection(db, COLLECTIONS.EVENTS), ...eventsConstraints);
    const eventsSnapshot = await getDocs(eventsQuery);

    const events = eventsSnapshot.docs.map(doc => doc.data() as FirestoreEvent);
    const totalEvents = events.length;
    const activeEvents = events.filter(e => e.status === 'published').length;

    const bookingsConstraints: QueryConstraint[] = [where('isDeleted', '==', false)];
    const bookingsQuery = query(collection(db, COLLECTIONS.BOOKINGS), ...bookingsConstraints);
    const bookingsSnapshot = await getDocs(bookingsQuery);

    const bookings = bookingsSnapshot.docs.map(doc => doc.data() as FirestoreBooking);
    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'completed')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    return { totalEvents, activeEvents, totalBookings, totalRevenue };
  } catch (error) {
    console.error('[Firestore] getDashboardStats failed:', error);
    throw error;
  }
};

// Batch booking operations (cross-domain, kept here)
import { writeBatch, increment, serverTimestamp, doc } from 'firebase/firestore';
import { generateId, generateTicketId } from './firestore/helpers';
import { getBookingById } from './firestore/bookingService';

/**
 * Batch create multiple bookings
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

      const count = eventUpdates.get(bookingData.eventId) || 0;
      eventUpdates.set(bookingData.eventId, count + 1);
    }

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

// Waitlist promotion (cross-domain transaction)
import { runTransaction, Transaction, orderBy, limit as limitFn } from 'firebase/firestore';

/**
 * Promote from waitlist with transaction
 */
export const promoteFromWaitlistWithTransaction = async (
  eventId: string
): Promise<string | null> => {
  try {
    return await runTransaction(db, async (transaction: Transaction) => {
      const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
      const eventDoc = await transaction.get(eventRef);

      if (!eventDoc.exists()) throw new Error('Event not found');

      const event = eventDoc.data() as FirestoreEvent;

      if (event.registeredCount >= event.capacity) return null;

      const waitlistQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('eventId', '==', eventId),
        where('isWaitlist', '==', true),
        where('status', '==', 'waitlist'),
        where('isDeleted', '==', false),
        orderBy('waitlistPosition', 'asc'),
        limitFn(1)
      );

      const waitlistSnapshot = await getDocs(waitlistQuery);

      if (waitlistSnapshot.empty) return null;

      const waitlistBooking = waitlistSnapshot.docs[0];
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, waitlistBooking.id);

      transaction.update(bookingRef, {
        status: 'confirmed',
        isWaitlist: false,
        waitlistPosition: null,
        updatedAt: serverTimestamp(),
      });

      transaction.update(eventRef, {
        registeredCount: increment(1),
        waitlistCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      const booking = waitlistBooking.data() as FirestoreBooking;
      const notificationId = generateId();
      const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      transaction.set(notificationRef, {
        id: notificationId,
        userId: booking.userId,
        title: "You're In!",
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

console.log('[Firestore] Legacy service re-exporting from modular structure');
