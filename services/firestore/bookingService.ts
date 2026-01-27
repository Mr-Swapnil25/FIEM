/**
 * Booking Service
 * 
 * Firestore operations for booking documents.
 */

import {
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    collection,
    limit,
    orderBy,
    serverTimestamp,
    increment,
    writeBatch,
    runTransaction,
    Transaction,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreBooking, FirestoreEvent, FirestoreCheckInLog } from './types';
import { generateId, generateTicketId, cleanFirestoreData } from './helpers';
import { updateEventRegistrationCount } from './eventService';

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
 * Create booking with transaction
 */
export const createBookingWithTransaction = async (
    data: Omit<FirestoreBooking, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
    customBookingId?: string
): Promise<{ bookingId: string; isWaitlist: boolean }> => {
    try {
        return await runTransaction(db, async (transaction: Transaction) => {
            const bookingId = customBookingId || generateId();
            const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);

            const bookingDoc = await transaction.get(bookingRef);
            if (bookingDoc.exists()) {
                throw new Error('You have already booked this event.');
            }

            const eventRef = doc(db, COLLECTIONS.EVENTS, data.eventId);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists()) {
                throw new Error('Event not found');
            }

            const event = eventDoc.data() as FirestoreEvent;

            if (event.isDeleted) throw new Error('Event has been deleted');
            if (event.status !== 'published') throw new Error('Event is not accepting registrations');

            const hasCapacity = event.registeredCount < event.capacity;
            const isWaitlist = !hasCapacity;

            transaction.set(bookingRef, {
                ...data,
                id: bookingId,
                ticketId: data.ticketId || generateTicketId(),
                isWaitlist,
                status: isWaitlist ? 'waitlist' : 'confirmed',
                waitlistPosition: isWaitlist ? event.waitlistCount + 1 : undefined,
                isDeleted: false,
                deletedAt: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            if (isWaitlist) {
                transaction.update(eventRef, { waitlistCount: increment(1), updatedAt: serverTimestamp() });
            } else {
                transaction.update(eventRef, { registeredCount: increment(1), updatedAt: serverTimestamp() });
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
 * Create a new booking (delegates to transaction version)
 */
export const createBooking = async (
    data: Omit<FirestoreBooking, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
    customBookingId?: string
): Promise<string> => {
    const result = await createBookingWithTransaction(data, customBookingId);
    return result.bookingId;
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId: string, reason?: string): Promise<void> => {
    try {
        const booking = await getBookingById(bookingId);
        if (!booking) throw new Error('Booking not found');

        const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
        await updateDoc(docRef, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            cancelReason: reason || null,
            updatedAt: serverTimestamp(),
        });

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

        const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
        batch.update(bookingRef, {
            status: 'checked_in',
            checkInTime: serverTimestamp(),
            checkedInBy,
            checkInMethod: method,
            updatedAt: serverTimestamp(),
        });

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

            if (!bookingDoc.exists()) throw new Error('Booking not found');

            const booking = bookingDoc.data() as FirestoreBooking;

            if (booking.isDeleted) throw new Error('Booking has been deleted');
            if (booking.status === 'cancelled') throw new Error('Booking has been cancelled');
            if (booking.status === 'checked_in') {
                return { success: false, alreadyCheckedIn: true };
            }

            transaction.update(bookingRef, {
                status: 'checked_in',
                checkInTime: serverTimestamp(),
                checkedInBy,
                checkInMethod: method,
                updatedAt: serverTimestamp(),
            });

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

// ============================================================================
// PAGINATED BOOKING FUNCTIONS
// ============================================================================

import { startAfter, QueryConstraint } from 'firebase/firestore';
import { PaginatedResult, PaginationOptions, normalizePageSize, createPaginatedResponse } from './pagination';

/**
 * Get user bookings with pagination
 */
export const getUserBookingsPaginated = async (
    userId: string,
    options: PaginationOptions = {}
): Promise<PaginatedResult<FirestoreBooking>> => {
    try {
        const pageSize = normalizePageSize(options.pageSize);
        const constraints: QueryConstraint[] = [
            where('userId', '==', userId),
            where('isDeleted', '==', false),
            orderBy('createdAt', 'desc'),
            limit(pageSize + 1),
        ];

        if (options.cursor) {
            const cursorDoc = await getDoc(doc(db, COLLECTIONS.BOOKINGS, options.cursor));
            if (cursorDoc.exists()) {
                constraints.push(startAfter(cursorDoc));
            }
        }

        const q = query(collection(db, COLLECTIONS.BOOKINGS), ...constraints);
        const snapshot = await getDocs(q);
        const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreBooking));

        return createPaginatedResponse(bookings, pageSize);
    } catch (error) {
        console.error('[Firestore] getUserBookingsPaginated failed:', error);
        throw error;
    }
};

/**
 * Get event participants with pagination
 */
export const getEventParticipantsPaginated = async (
    eventId: string,
    options: PaginationOptions = {}
): Promise<PaginatedResult<FirestoreBooking>> => {
    try {
        const pageSize = normalizePageSize(options.pageSize);
        const constraints: QueryConstraint[] = [
            where('eventId', '==', eventId),
            where('isDeleted', '==', false),
            orderBy('createdAt', 'desc'),
            limit(pageSize + 1),
        ];

        if (options.cursor) {
            const cursorDoc = await getDoc(doc(db, COLLECTIONS.BOOKINGS, options.cursor));
            if (cursorDoc.exists()) {
                constraints.push(startAfter(cursorDoc));
            }
        }

        const q = query(collection(db, COLLECTIONS.BOOKINGS), ...constraints);
        const snapshot = await getDocs(q);
        const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreBooking));

        return createPaginatedResponse(bookings, pageSize);
    } catch (error) {
        console.error('[Firestore] getEventParticipantsPaginated failed:', error);
        throw error;
    }
};

