/**
 * Pagination Helpers
 * 
 * Cursor-based pagination utilities for Firestore queries.
 */

import {
    QueryDocumentSnapshot,
    DocumentData,
    startAfter,
    limit,
    QueryConstraint,
} from 'firebase/firestore';

/**
 * Paginated result type
 */
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        hasMore: boolean;
        nextCursor: string | null;
        totalFetched: number;
        pageSize: number;
    };
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    pageSize?: number;
    cursor?: string | null;
}

/**
 * Default page size
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Validate and normalize page size
 */
export const normalizePageSize = (size?: number): number => {
    if (!size || size <= 0) return DEFAULT_PAGE_SIZE;
    return Math.min(size, MAX_PAGE_SIZE);
};

/**
 * Create pagination query constraints
 */
export const createPaginationConstraints = (
    options: PaginationOptions,
    cursorDoc?: QueryDocumentSnapshot<DocumentData>
): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [];
    const pageSize = normalizePageSize(options.pageSize);

    if (cursorDoc) {
        constraints.push(startAfter(cursorDoc));
    }

    constraints.push(limit(pageSize + 1)); // Fetch one extra to check hasMore

    return constraints;
};

/**
 * Process query results into paginated response
 */
export const createPaginatedResponse = <T extends { id: string }>(
    docs: T[],
    pageSize: number
): PaginatedResult<T> => {
    const hasMore = docs.length > pageSize;
    const data = hasMore ? docs.slice(0, pageSize) : docs;
    const lastItem = data[data.length - 1];

    return {
        data,
        pagination: {
            hasMore,
            nextCursor: hasMore && lastItem ? lastItem.id : null,
            totalFetched: data.length,
            pageSize,
        },
    };
};

/**
 * Encode cursor (document ID) for URL-safe transmission
 */
export const encodeCursor = (docId: string): string => {
    return Buffer.from(docId).toString('base64url');
};

/**
 * Decode cursor back to document ID
 */
export const decodeCursor = (cursor: string): string => {
    try {
        return Buffer.from(cursor, 'base64url').toString('utf-8');
    } catch {
        return cursor; // Return as-is if not encoded
    }
};
