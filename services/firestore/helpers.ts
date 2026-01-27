/**
 * Firestore Helpers
 * 
 * Utility functions for Firestore operations.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Generate a unique ID (UUID v4)
 */
export const generateId = (): string => {
    return crypto.randomUUID();
};

/**
 * Generate a unique ticket ID
 */
export const generateTicketId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    return `EVT-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
};

/**
 * Convert Firestore Timestamp to ISO string
 */
export const timestampToISO = (timestamp: Timestamp | undefined | null): string => {
    if (!timestamp) return new Date().toISOString();
    return timestamp.toDate().toISOString();
};

/**
 * Convert Date/string to Firestore Timestamp
 */
export const toTimestamp = (date: Date | string): Timestamp => {
    if (typeof date === 'string') {
        return Timestamp.fromDate(new Date(date));
    }
    return Timestamp.fromDate(date);
};

/**
 * Remove undefined fields from object (nested)
 * Preserves null values (for field deletion)
 */
export const cleanFirestoreData = (data: any): any => {
    if (data === undefined) return undefined;
    if (data === null) return null;

    if (Array.isArray(data)) {
        return data.map(item => cleanFirestoreData(item));
    }

    if (typeof data === 'object' && !(data instanceof Timestamp) && !(data instanceof Date)) {
        const clean: any = {};
        Object.keys(data).forEach(key => {
            const value = cleanFirestoreData(data[key]);
            if (value !== undefined) {
                clean[key] = value;
            }
        });
        return clean;
    }

    return data;
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 * Removes HTML tags, trims whitespace, limits length
 */
export const sanitizeInput = (
    input: string,
    options: {
        maxLength?: number;
        allowNewlines?: boolean;
        trim?: boolean;
    } = {}
): string => {
    const { maxLength = 5000, allowNewlines = true, trim = true } = options;

    if (typeof input !== 'string') return '';

    let sanitized = input
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove script-like patterns
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        // Normalize unicode
        .normalize('NFC');

    if (!allowNewlines) {
        sanitized = sanitized.replace(/[\r\n]+/g, ' ');
    }

    if (trim) {
        sanitized = sanitized.trim();
    }

    // Enforce max length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength);
    }

    return sanitized;
};

/**
 * Sanitize object fields recursively
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
    obj: T,
    stringFields: (keyof T)[]
): T => {
    const result = { ...obj };
    for (const field of stringFields) {
        if (typeof result[field] === 'string') {
            (result[field] as string) = sanitizeInput(result[field] as string);
        }
    }
    return result;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

