/**
 * Event Service
 * 
 * Firestore operations for event documents.
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
    Timestamp,
    documentId,
    QueryConstraint,
    startAfter,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreEvent } from './types';
import { generateId, cleanFirestoreData } from './helpers';

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
 * Get multiple events by IDs in a single batch query
 */
export const getEventsByIds = async (eventIds: string[]): Promise<FirestoreEvent[]> => {
    if (eventIds.length === 0) return [];

    try {
        const BATCH_SIZE = 30;
        const batches: Promise<FirestoreEvent[]>[] = [];

        for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
            const batchIds = eventIds.slice(i, i + BATCH_SIZE);
            const batchPromise = (async () => {
                const q = query(
                    collection(db, COLLECTIONS.EVENTS),
                    where(documentId(), 'in', batchIds),
                    where('isDeleted', '==', false)
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreEvent));
            })();
            batches.push(batchPromise);
        }

        const results = await Promise.all(batches);
        const allEvents = results.flat();
        const eventMap = new Map(allEvents.map(e => [e.id, e]));
        return eventIds.map(id => eventMap.get(id)).filter((e): e is FirestoreEvent => e !== undefined);
    } catch (error) {
        console.error('[Firestore] getEventsByIds failed:', error);
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
        const constraints: QueryConstraint[] = [where('isDeleted', '==', false)];

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
    } catch (error: any) {
        if (error?.message?.includes('index') || error?.code === 'failed-precondition') {
            console.warn('[Firestore] listEvents - Index not ready, using fallback');
            return listEventsWithoutIndex(options);
        }
        throw error;
    }
};

/**
 * Fallback when indexes aren't ready
 */
const listEventsWithoutIndex = async (options: {
    status?: string;
    categoryId?: string;
    organizerId?: string;
    featured?: boolean;
    limitCount?: number;
    orderByField?: 'date' | 'createdAt';
    orderDirection?: 'asc' | 'desc';
} = {}): Promise<FirestoreEvent[]> => {
    const q = query(collection(db, COLLECTIONS.EVENTS), where('isDeleted', '==', false));
    const snapshot = await getDocs(q);

    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreEvent));

    if (options.status) events = events.filter(e => e.status === options.status);
    if (options.categoryId) events = events.filter(e => e.categoryId === options.categoryId);
    if (options.organizerId) events = events.filter(e => e.organizerId === options.organizerId);
    if (options.featured !== undefined) events = events.filter(e => e.featured === options.featured);

    const orderField = options.orderByField || 'date';
    const orderDir = options.orderDirection || 'asc';
    events.sort((a, b) => {
        const aVal = orderField === 'date' ? a.date?.toMillis() || 0 : a.createdAt?.toMillis() || 0;
        const bVal = orderField === 'date' ? b.date?.toMillis() || 0 : b.createdAt?.toMillis() || 0;
        return orderDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return options.limitCount ? events.slice(0, options.limitCount) : events;
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

        const cleanedData = cleanFirestoreData({
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

        await setDoc(docRef, cleanedData);
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
        const cleanedData = cleanFirestoreData(data);

        await updateDoc(docRef, {
            ...cleanedData,
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
 * Update event registration count
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
// BATCH & AGGREGATION FUNCTIONS
// ============================================================================

import { PaginatedResult, PaginationOptions, normalizePageSize, createPaginatedResponse } from './pagination';

/**
 * Event with participant count (aggregated)
 */
export interface EventWithCounts extends FirestoreEvent {
    confirmedCount: number;
    checkedInCount: number;
    cancelledCount: number;
}

/**
 * Get events with participant counts (batch aggregation to avoid N+1)
 */
export const getEventsWithParticipantCounts = async (
    eventIds: string[]
): Promise<EventWithCounts[]> => {
    if (eventIds.length === 0) return [];

    try {
        // Fetch events
        const events = await getEventsByIds(eventIds);
        if (events.length === 0) return [];

        // Fetch all bookings for these events in batches
        const BATCH_SIZE = 30;
        const allBookings: { eventId: string; status: string; isCheckedIn?: boolean }[] = [];

        for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
            const batchIds = eventIds.slice(i, i + BATCH_SIZE);
            const q = query(
                collection(db, COLLECTIONS.BOOKINGS),
                where('eventId', 'in', batchIds)
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                allBookings.push({
                    eventId: data.eventId,
                    status: data.status,
                    isCheckedIn: data.isCheckedIn || false,
                });
            });
        }

        // Aggregate counts per event
        const countMap = new Map<string, { confirmed: number; checkedIn: number; cancelled: number }>();
        eventIds.forEach(id => countMap.set(id, { confirmed: 0, checkedIn: 0, cancelled: 0 }));

        allBookings.forEach(booking => {
            const counts = countMap.get(booking.eventId);
            if (counts) {
                if (booking.status === 'confirmed') counts.confirmed++;
                if (booking.status === 'cancelled') counts.cancelled++;
                if (booking.isCheckedIn) counts.checkedIn++;
            }
        });

        // Merge with events
        return events.map(event => {
            const counts = countMap.get(event.id) || { confirmed: 0, checkedIn: 0, cancelled: 0 };
            return {
                ...event,
                confirmedCount: counts.confirmed,
                checkedInCount: counts.checkedIn,
                cancelledCount: counts.cancelled,
            };
        });
    } catch (error) {
        console.error('[Firestore] getEventsWithParticipantCounts failed:', error);
        throw error;
    }
};

// ============================================================================
// PAGINATED LIST FUNCTIONS
// ============================================================================

/**
 * List published events with pagination
 */
export const listPublishedEventsPaginated = async (
    options: PaginationOptions = {}
): Promise<PaginatedResult<FirestoreEvent>> => {
    try {
        const pageSize = normalizePageSize(options.pageSize);
        const constraints: QueryConstraint[] = [
            where('isDeleted', '==', false),
            where('status', '==', 'published'),
            orderBy('date', 'asc'),
            limit(pageSize + 1),
        ];

        // If cursor provided, fetch cursor doc first
        if (options.cursor) {
            const cursorDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, options.cursor));
            if (cursorDoc.exists()) {
                constraints.push(startAfter(cursorDoc));
            }
        }

        const q = query(collection(db, COLLECTIONS.EVENTS), ...constraints);
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreEvent));

        return createPaginatedResponse(events, pageSize);
    } catch (error) {
        console.error('[Firestore] listPublishedEventsPaginated failed:', error);
        throw error;
    }
};

/**
 * List events by organizer with pagination
 */
export const listOrganizerEventsPaginated = async (
    organizerId: string,
    options: PaginationOptions = {}
): Promise<PaginatedResult<FirestoreEvent>> => {
    try {
        const pageSize = normalizePageSize(options.pageSize);
        const constraints: QueryConstraint[] = [
            where('isDeleted', '==', false),
            where('organizerId', '==', organizerId),
            orderBy('createdAt', 'desc'),
            limit(pageSize + 1),
        ];

        if (options.cursor) {
            const cursorDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, options.cursor));
            if (cursorDoc.exists()) {
                constraints.push(startAfter(cursorDoc));
            }
        }

        const q = query(collection(db, COLLECTIONS.EVENTS), ...constraints);
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreEvent));

        return createPaginatedResponse(events, pageSize);
    } catch (error) {
        console.error('[Firestore] listOrganizerEventsPaginated failed:', error);
        throw error;
    }
};

