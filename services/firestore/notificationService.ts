/**
 * Notification Service
 * 
 * Firestore operations for notification documents.
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
    writeBatch,
    deleteDoc,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './core';
import { FirestoreNotification } from './types';
import { generateId } from './helpers';

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
