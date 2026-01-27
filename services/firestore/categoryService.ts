/**
 * Category Service
 * 
 * Firestore operations for category documents.
 */

import {
    doc,
    getDocs,
    setDoc,
    query,
    where,
    collection,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreCategory } from './types';
import { generateId } from './helpers';

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
