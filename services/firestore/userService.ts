/**
 * User Service
 * 
 * Firestore operations for user documents.
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
    serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreUser } from './types';
import { cleanFirestoreData } from './helpers';

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
        const cleanedData = cleanFirestoreData(data);

        await updateDoc(docRef, {
            ...cleanedData,
            updatedAt: serverTimestamp(),
        });

        console.log('[Firestore] User updated:', userId);
    } catch (error) {
        console.error('[Firestore] updateUser failed:', error);
        throw error;
    }
};
