export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  rollNo?: string;
  collegeIdUrl?: string;
  avatarUrl?: string;
  phone?: string;
  year?: string;
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type EventCategory = 'Cultural' | 'Technical' | 'Sports' | 'Workshop' | 'Seminar' | 'Other';

export interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string; // ISO string
  venue: string;
  price: number;
  totalSlots: number;
  availableSlots: number;
  category: EventCategory;
  imageUrl?: string;
  adminId: string;
  status: EventStatus;
  createdAt: string;
  isPaid?: boolean;
  requiresApproval?: boolean;
  // Rating fields
  averageRating?: number;
  totalReviews?: number;
  ratingDistribution?: RatingDistribution;
}

export interface RatingDistribution {
  [key: number]: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'checked_in' | 'waitlist';

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  ticketId: string;
  qrCode: string;
  status: BookingStatus;
  amountPaid: number;
  bookedAt: string;
  checkedInAt?: string;
  isWaitlist?: boolean;
  // Expanded for UI convenience
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
  userName?: string;
  userEmail?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  eventType: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  eventId?: string;
}

export interface Review {
  id: string;
  userId: string;
  eventId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt?: string;
  // Expanded for UI convenience
  userName?: string;
  userPhoto?: string;
  // Admin moderation fields
  isFlagged?: boolean;
  flagReason?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
}
