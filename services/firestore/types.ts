/**
 * Firestore Types
 * 
 * Shared type definitions for all Firestore documents.
 */

import { Timestamp } from 'firebase/firestore';

// Base document with common fields
export interface BaseDocument {
    id: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Soft-deletable document
export interface SoftDeletable {
    isDeleted: boolean;
    deletedAt?: Timestamp | null;
}

// User document
export interface FirestoreUser extends BaseDocument, SoftDeletable {
    email: string;
    displayName: string;
    role: 'student' | 'admin' | 'super_admin';
    emailDomain?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    year?: string | null;
    division?: string | null;
    department?: string | null;
    rollNo?: string | null;
    avatarUrl?: string | null;
    collegeIdUrl?: string | null;
    phone?: string | null;
    lastLoginAt?: Timestamp;
}

// Event document
export interface FirestoreEvent extends BaseDocument, SoftDeletable {
    title: string;
    description: string;
    shortDescription?: string;
    date: Timestamp;
    time: string;
    endTime?: string;
    location: string;
    venue?: string;
    imageUrl?: string;
    categoryId: string;
    categoryName?: string;
    organizerId: string;
    organizerName?: string;
    capacity: number;
    registeredCount: number;
    waitlistCount: number;
    price: number;
    isFree: boolean;
    currency: string;
    status: 'draft' | 'published' | 'cancelled' | 'completed';
    featured: boolean;
    requiresApproval: boolean;
    isPublic: boolean;
    tags?: string[];
    averageRating: number;
    totalReviews: number;
    publishedAt?: Timestamp;
}

// Booking document
export interface FirestoreBooking extends BaseDocument, SoftDeletable {
    userId: string;
    eventId: string;
    ticketId: string;
    qrCode?: string;
    status: 'confirmed' | 'cancelled' | 'checked_in' | 'waitlist' | 'expired' | 'no_show';
    isWaitlist: boolean;
    waitlistPosition?: number;
    numberOfTickets: number;
    totalAmount: number;
    paymentStatus: 'not_required' | 'pending' | 'completed' | 'failed' | 'refunded';
    paymentId?: string;
    checkInTime?: Timestamp;
    checkedInBy?: string;
    checkInMethod?: string;
    // Denormalized fields
    eventTitle?: string;
    eventDate?: Timestamp;
    eventTime?: string;
    eventVenue?: string;
    eventImageUrl?: string;
    userName?: string;
    userEmail?: string;
    cancelledAt?: Timestamp;
    cancelReason?: string;
}

// Category document
export interface FirestoreCategory extends BaseDocument {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive: boolean;
    sortOrder: number;
}

// Favorite document
export interface FirestoreFavorite extends BaseDocument {
    userId: string;
    eventId: string;
}

// Notification document
export interface FirestoreNotification extends BaseDocument {
    userId: string;
    title: string;
    message: string;
    type: string;
    eventId?: string;
    bookingId?: string;
    actionUrl?: string;
    read: boolean;
    readAt?: Timestamp;
    expiresAt?: Timestamp;
}

// Review document
export interface FirestoreReview extends BaseDocument, SoftDeletable {
    userId: string;
    eventId: string;
    rating: number;
    comment?: string;
    isAnonymous: boolean;
    isFlagged: boolean;
    flagReason?: string;
    flaggedBy?: string;
    flaggedAt?: Timestamp;
    isApproved: boolean;
    userName?: string;
    userAvatarUrl?: string;
}

// Check-in log document (immutable)
export interface FirestoreCheckInLog {
    id: string;
    bookingId: string;
    eventId: string;
    userId: string;
    checkedInBy: string;
    method: 'qr_scan' | 'manual_entry' | 'ticket_id' | 'auto';
    deviceInfo?: string;
    ipAddress?: string;
    checkedInAt: Timestamp;
}
