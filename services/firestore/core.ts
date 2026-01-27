/**
 * Firestore Core
 * 
 * Core Firestore initialization and configuration.
 */

import {
    getFirestore,
    enableIndexedDbPersistence,
    connectFirestoreEmulator,
} from 'firebase/firestore';
import { app } from '../firebase';

// Initialize Firestore
export const db = getFirestore(app);

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

// Collection names
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
