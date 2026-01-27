/**
 * Review Service
 * 
 * Firestore operations for review documents.
 */

import {
    doc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    collection,
    orderBy,
    limit,
    serverTimestamp,
    QueryConstraint,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreReview } from './types';
import { generateId } from './helpers';

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
            isApproved: true,
            deletedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        console.log('[Firestore] Review created:', reviewId);
        return reviewId;
    } catch (error) {
        console.error('[Firestore] createReview failed:', error);
        throw error;
    }
};

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
