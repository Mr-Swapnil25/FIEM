/**
 * Realtime Service
 * 
 * Real-time subscription functions for Firestore.
 */

import {
    doc,
    query,
    where,
    collection,
    orderBy,
    limit,
    onSnapshot,
    QuerySnapshot,
    DocumentSnapshot,
    Unsubscribe,
    QueryConstraint,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreEvent, FirestoreBooking, FirestoreNotification } from './types';

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
