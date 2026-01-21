/**
 * EventEase Type Definitions
 * 
 * Complete TypeScript type definitions for all data structures.
 * NO 'any' types allowed - use 'unknown' for truly dynamic data.
 * 
 * @module types
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * User roles in the system
 */
export type Role = 'student' | 'admin' | 'super_admin';

/**
 * Event status lifecycle
 */
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

/**
 * Event categories
 */
export type EventCategory = 
  | 'Cultural' 
  | 'Technical' 
  | 'Sports' 
  | 'Workshop' 
  | 'Seminar' 
  | 'Hackathon'
  | 'Competition'
  | 'Social'
  | 'Academic'
  | 'Other';

/**
 * Booking status
 */
export type BookingStatus = 
  | 'confirmed' 
  | 'cancelled' 
  | 'checked_in' 
  | 'waitlist' 
  | 'expired' 
  | 'no_show';

/**
 * Payment status for paid events
 */
export type PaymentStatus = 
  | 'not_required' 
  | 'pending' 
  | 'completed' 
  | 'failed' 
  | 'refunded';

/**
 * Notification types
 */
export type NotificationType = 
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'event_reminder'
  | 'event_updated'
  | 'event_cancelled'
  | 'check_in_success'
  | 'waitlist_promoted'
  | 'review_request'
  | 'system'
  | 'announcement';

/**
 * Check-in methods
 */
export type CheckInMethod = 'qr_scan' | 'manual_entry' | 'ticket_id' | 'auto';

/**
 * Rating values (1-5 stars)
 */
export type RatingValue = 1 | 2 | 3 | 4 | 5;

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Base document with common fields
 */
export interface BaseDocument {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Soft-deletable document
 */
export interface SoftDeletable {
  isDeleted?: boolean;
  deletedAt?: string;
}

/**
 * Timestamp representation for API communication
 */
export interface TimestampFields {
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * User profile from database
 */
export interface User extends BaseDocument {
  email: string;
  name: string;
  role: Role;
  // Profile info
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  // Institutional info
  department?: string;
  year?: string;
  division?: string;
  rollNo?: string;
  collegeIdUrl?: string;
  emailDomain?: string;
  // Metadata
  lastLoginAt?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
}

/**
 * User creation payload
 */
export interface CreateUserInput {
  email: string;
  name: string;
  role?: Role;
  firstName?: string;
  lastName?: string;
  department?: string;
  year?: string;
  division?: string;
  phone?: string;
  avatarUrl?: string;
}

/**
 * User update payload
 */
export interface UpdateUserInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  department?: string;
  year?: string;
  division?: string;
  rollNo?: string;
  collegeIdUrl?: string;
}

/**
 * Auth state for frontend
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

/**
 * Registration data
 */
export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  role?: Role;
  phone?: string;
  avatar?: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Rating distribution for reviews
 */
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/**
 * Event entity from database
 */
export interface Event extends BaseDocument, SoftDeletable {
  title: string;
  description: string;
  shortDescription?: string;
  // Date and time
  eventDate: string; // ISO string
  date?: string;     // Alias for compatibility
  time?: string;
  endTime?: string;
  // Location
  venue: string;
  location?: string;
  // Capacity
  totalSlots: number;
  availableSlots: number;
  capacity?: number;
  registeredCount?: number;
  waitlistCount?: number;
  // Pricing
  price: number;
  isFree?: boolean;
  isPaid?: boolean;
  currency?: string;
  // Categorization
  category: EventCategory;
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  // Media
  imageUrl?: string;
  coverPhotoUrl?: string;
  galleryUrls?: string[];
  // Organizer
  adminId: string;
  organizerId?: string;
  organizerName?: string;
  // Status and visibility
  status: EventStatus;
  featured?: boolean;
  isPublic?: boolean;
  requiresApproval?: boolean;
  publishedAt?: string;
  // Rating
  averageRating?: number;
  totalReviews?: number;
  ratingDistribution?: RatingDistribution;
}

/**
 * Event creation payload
 */
export interface CreateEventInput {
  title: string;
  description: string;
  shortDescription?: string;
  eventDate: string;
  time?: string;
  endTime?: string;
  venue: string;
  totalSlots: number;
  capacity?: number;
  price: number;
  category: EventCategory;
  categoryId?: string;
  imageUrl?: string;
  coverPhotoUrl?: string;
  adminId: string;
  organizerId?: string;
  status?: EventStatus;
  featured?: boolean;
  requiresApproval?: boolean;
  isPublic?: boolean;
  tags?: string[];
}

/**
 * Event update payload
 */
export interface UpdateEventInput {
  title?: string;
  description?: string;
  shortDescription?: string;
  eventDate?: string;
  time?: string;
  endTime?: string;
  venue?: string;
  totalSlots?: number;
  capacity?: number;
  price?: number;
  category?: EventCategory;
  categoryId?: string;
  imageUrl?: string;
  coverPhotoUrl?: string;
  status?: EventStatus;
  featured?: boolean;
  requiresApproval?: boolean;
  isPublic?: boolean;
  tags?: string[];
}

/**
 * Event filter options
 */
export interface EventFilterOptions {
  status?: EventStatus;
  category?: EventCategory;
  categoryId?: string;
  organizerId?: string;
  featured?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'date' | 'createdAt' | 'price' | 'popularity';
  orderDirection?: 'asc' | 'desc';
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

/**
 * Booking entity from database
 */
export interface Booking extends BaseDocument, SoftDeletable {
  userId: string;
  eventId: string;
  ticketId: string;
  qrCode: string;
  status: BookingStatus;
  // Payment
  amountPaid: number;
  totalAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  // Waitlist
  isWaitlist?: boolean;
  waitlistPosition?: number;
  // Check-in
  bookedAt: string;
  checkedInAt?: string;
  checkInTime?: string;
  checkedInBy?: string;
  checkInMethod?: CheckInMethod;
  // Cancellation
  cancelledAt?: string;
  cancelReason?: string;
  // Ticket info
  numberOfTickets?: number;
  // Denormalized fields for UI
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  eventImageUrl?: string;
  userName?: string;
  userEmail?: string;
}

/**
 * Booking creation payload
 */
export interface CreateBookingInput {
  userId: string;
  eventId: string;
  ticketId?: string;
  qrCode?: string;
  numberOfTickets?: number;
  amountPaid?: number;
  isWaitlist?: boolean;
  paymentId?: string;
}

/**
 * Booking with event details for display
 */
export interface BookingWithEvent extends Booking {
  event?: Event;
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Event category entity
 */
export interface Category extends BaseDocument {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder?: number;
}

/**
 * Category creation payload
 */
export interface CreateCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification entity
 */
export interface Notification extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  eventType?: string; // Legacy support
  isRead: boolean;
  read?: boolean;
  readAt?: string;
  link?: string;
  actionUrl?: string;
  eventId?: string;
  bookingId?: string;
  expiresAt?: string;
}

/**
 * Notification creation payload
 */
export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  eventId?: string;
  bookingId?: string;
  actionUrl?: string;
  expiresAt?: string;
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

/**
 * Review entity
 */
export interface Review extends BaseDocument {
  userId: string;
  eventId: string;
  rating: RatingValue;
  comment?: string;
  isAnonymous: boolean;
  // Moderation
  isFlagged?: boolean;
  flagReason?: string;
  flaggedBy?: string;
  flaggedAt?: string;
  isApproved?: boolean;
  // Denormalized for display
  userName?: string;
  userPhoto?: string;
  userAvatarUrl?: string;
}

/**
 * Review creation payload
 */
export interface CreateReviewInput {
  eventId: string;
  userId: string;
  rating: RatingValue;
  comment?: string;
  isAnonymous?: boolean;
}

// ============================================================================
// FAVORITE TYPES
// ============================================================================

/**
 * Favorite entity
 */
export interface Favorite extends BaseDocument {
  userId: string;
  eventId: string;
}

// ============================================================================
// DASHBOARD AND STATS TYPES
// ============================================================================

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  publishedEvents?: number;
  draftEvents?: number;
  cancelledEvents?: number;
  completedEvents?: number;
  totalRegistrations: number;
  totalBookings?: number;
  confirmedBookings?: number;
  checkedInCount?: number;
  totalRevenue: number;
  totalUsers?: number;
  averageRating?: number;
}

/**
 * Event statistics
 */
export interface EventStats {
  eventId: string;
  registrationCount: number;
  checkInCount: number;
  waitlistCount: number;
  cancellationCount: number;
  revenue: number;
  averageRating: number;
  totalReviews: number;
}

// ============================================================================
// CHECK-IN TYPES
// ============================================================================

/**
 * Check-in log entry (immutable)
 */
export interface CheckInLog {
  id: string;
  bookingId: string;
  eventId: string;
  userId: string;
  checkedInBy: string;
  method: CheckInMethod;
  deviceInfo?: string;
  ipAddress?: string;
  checkedInAt: string;
}

/**
 * Check-in request
 */
export interface CheckInRequest {
  bookingId?: string;
  ticketId?: string;
  qrData?: string;
  eventId: string;
  checkedInBy: string;
  method?: CheckInMethod;
}

/**
 * Check-in result
 */
export interface CheckInResult {
  success: boolean;
  booking?: Booking;
  message: string;
  alreadyCheckedIn?: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Generic API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Service result with success/error pattern
 */
export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================================================
// FIREBASE SERVICE TYPES
// ============================================================================

/**
 * Firebase error codes
 */
export type FirebaseErrorCode = 
  // Auth errors
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/weak-password'
  | 'auth/user-disabled'
  | 'auth/too-many-requests'
  | 'auth/invalid-credential'
  | 'auth/popup-closed-by-user'
  | 'auth/popup-blocked'
  | 'auth/account-exists-with-different-credential'
  | 'auth/operation-not-allowed'
  | 'auth/network-request-failed'
  | 'auth/requires-recent-login'
  // Firestore errors
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated'
  // Storage errors
  | 'storage/object-not-found'
  | 'storage/unauthorized'
  | 'storage/canceled'
  | 'storage/unknown'
  | 'storage/quota-exceeded'
  | 'storage/retry-limit-exceeded'
  | 'storage/invalid-checksum'
  // Generic
  | 'unknown';

/**
 * Error category for handling
 */
export type ErrorCategory = 
  | 'network'
  | 'permission'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'storage'
  | 'auth'
  | 'unknown';

/**
 * Structured Firebase error
 */
export interface FirebaseServiceError {
  code: FirebaseErrorCode | string;
  message: string;
  category: ErrorCategory;
  userMessage: string;
  retryable: boolean;
  originalError?: unknown;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Operation context for logging
 */
export interface OperationContext {
  operation: string;
  collection?: string;
  documentId?: string;
  userId?: string;
  timestamp: string;
  attempt?: number;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/**
 * Upload progress information
 */
export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  fileName?: string;
  fullPath?: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  name: string;
  fullPath: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  downloadURL?: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: UploadResult) => void;
  customMetadata?: Record<string, string>;
  contentType?: string;
}

// ============================================================================
// HYBRID SERVICE TYPES
// ============================================================================

/**
 * Data source indicator
 */
export type DataSource = 'firestore' | 'cache';

/**
 * Hybrid service result with source tracking
 */
export interface HybridResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: DataSource;
  fallbackUsed: boolean;
  latencyMs?: number;
}

/**
 * Fallback event for monitoring
 */
export interface FallbackEvent {
  timestamp: string;
  operation: string;
  reason: string;
  originalError?: string;
  recovered: boolean;
}

// ============================================================================
// FORM TYPES
// ============================================================================

/**
 * Form field validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Event form data
 */
export interface EventFormData {
  title: string;
  description: string;
  shortDescription: string;
  eventDate: string;
  time: string;
  endTime: string;
  venue: string;
  totalSlots: number;
  price: number;
  category: EventCategory;
  imageFile?: File;
  requiresApproval: boolean;
  featured: boolean;
}

/**
 * Profile form data
 */
export interface ProfileFormData {
  name: string;
  phone: string;
  department: string;
  year: string;
  division: string;
  rollNo: string;
  avatarFile?: File;
  idCardFile?: File;
}

/**
 * Review form data
 */
export interface ReviewFormData {
  rating: RatingValue;
  comment: string;
  isAnonymous: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Extract error from union type
 */
export type ExtractError<T> = T extends { error: infer E } ? E : never;

/**
 * Type guard helper
 */
export function isApiError(response: ApiResponse<unknown>): response is ApiErrorResponse {
  return !response.success;
}

/**
 * Type guard for service result
 */
export function isServiceError<T>(result: ServiceResult<T>): result is ServiceResult<T> & { error: string } {
  return !result.success && result.error !== undefined;
}

// Re-export for backward compatibility with existing types.ts
export type UserRole = Role;
