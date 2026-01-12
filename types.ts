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
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'checked_in';

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
  // Expanded for UI convenience
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
  userName?: string;
  userEmail?: string;
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
