/**
 * Favorite Service
 * 
 * Firestore operations for favorite documents.
 */

import {
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    collection,
    orderBy,
    limit,
    serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreFavorite } from './types';
import { generateId } from './helpers';

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
