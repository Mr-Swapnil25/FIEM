/**
 * React Query Hooks for Firebase Data
 * 
 * Provides type-safe hooks for all data fetching and mutations
 * with proper loading, error, and success states.
 * 
 * ZERO localStorage - All data comes from Firebase
 * 
 * @module hooks/useFirebaseData
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { Event, User, Booking, Category, Notification, DashboardStats, EventCategory } from '../types';
import * as hybridService from '../services/hybridService';
import * as storageService from '../services/storageService';
import { transformError } from '../services/errorHandler';

// ============================================================================
// QUERY KEYS - Centralized for cache invalidation
// ============================================================================

export const queryKeys = {
  // Users
  user: (id: string) => ['user', id] as const,
  userByEmail: (email: string) => ['user', 'email', email] as const,
  
  // Events
  events: ['events'] as const,
  publishedEvents: ['events', 'published'] as const,
  event: (id: string) => ['events', id] as const,
  organizerEvents: (organizerId: string) => ['events', 'organizer', organizerId] as const,
  
  // Bookings
  userBookings: (userId: string) => ['bookings', 'user', userId] as const,
  eventParticipants: (eventId: string) => ['bookings', 'event', eventId] as const,
  booking: (id: string) => ['bookings', id] as const,
  bookingByTicket: (ticketId: string) => ['bookings', 'ticket', ticketId] as const,
  existingBooking: (userId: string, eventId: string) => ['bookings', 'existing', userId, eventId] as const,
  
  // Categories
  categories: ['categories'] as const,
  
  // Favorites
  userFavorites: (userId: string) => ['favorites', userId] as const,
  isFavorite: (userId: string, eventId: string) => ['favorites', userId, eventId] as const,
  
  // Notifications
  userNotifications: (userId: string) => ['notifications', userId] as const,
  
  // Reviews
  eventReviews: (eventId: string) => ['reviews', eventId] as const,
  
  // Dashboard
  dashboardStats: (organizerId?: string) => ['dashboard', organizerId || 'all'] as const,
};

// ============================================================================
// USER HOOKS
// ============================================================================

/**
 * Fetch user by ID
 */
export function useUser(userId: string | undefined, options?: Omit<UseQueryOptions<User | null, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.user(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      const result = await hybridService.getUserById(userId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Update user profile mutation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<User> }) => {
      const result = await hybridService.updateUser(userId, data);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidate user query
      queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.userId) });
    },
  });
}

// ============================================================================
// EVENT HOOKS
// ============================================================================

/**
 * Fetch all published events
 */
export function usePublishedEvents(options?: Omit<UseQueryOptions<Event[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.publishedEvents,
    queryFn: async () => {
      const result = await hybridService.listPublishedEvents();
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetch single event by ID
 */
export function useEvent(eventId: string | undefined, options?: Omit<UseQueryOptions<Event | null, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.event(eventId || ''),
    queryFn: async () => {
      if (!eventId) return null;
      const result = await hybridService.getEventById(eventId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetch events by organizer
 */
export function useOrganizerEvents(organizerId: string | undefined, options?: Omit<UseQueryOptions<Event[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.organizerEvents(organizerId || ''),
    queryFn: async () => {
      if (!organizerId) return [];
      const result = await hybridService.getEventsByOrganizer(organizerId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!organizerId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Create event mutation
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      venue: string;
      adminId: string;
      eventDate: string;
      totalSlots: number;
      price: number;
      category: EventCategory;
      imageUrl?: string;
      status?: Event['status'];
      requiresApproval?: boolean;
    }) => {
      const result = await hybridService.createEvent(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publishedEvents });
    },
  });
}

/**
 * Update event mutation
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: Partial<Event> }) => {
      const result = await hybridService.updateEvent(eventId, data);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.event(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.publishedEvents });
    },
  });
}

/**
 * Delete event mutation
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const result = await hybridService.deleteEvent(eventId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publishedEvents });
    },
  });
}

/**
 * Update event status mutation
 */
export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: Event['status'] }) => {
      const result = await hybridService.updateEventStatus(eventId, status);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.event(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.publishedEvents });
    },
  });
}

// ============================================================================
// BOOKING HOOKS
// ============================================================================

/**
 * Fetch user's bookings
 */
export function useUserBookings(userId: string | undefined, options?: Omit<UseQueryOptions<Booking[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.userBookings(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const result = await hybridService.getUserBookings(userId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Fetch event participants
 */
export function useEventParticipants(eventId: string | undefined, options?: Omit<UseQueryOptions<Booking[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.eventParticipants(eventId || ''),
    queryFn: async () => {
      if (!eventId) return [];
      const result = await hybridService.getEventParticipants(eventId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Fetch single booking by ID
 */
export function useBooking(bookingId: string | undefined, options?: Omit<UseQueryOptions<Booking | null, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.booking(bookingId || ''),
    queryFn: async () => {
      if (!bookingId) return null;
      const result = await hybridService.getBookingById(bookingId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: !!bookingId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Fetch booking by ticket ID
 */
export function useBookingByTicket(ticketId: string | undefined, options?: Omit<UseQueryOptions<Booking | null, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.bookingByTicket(ticketId || ''),
    queryFn: async () => {
      if (!ticketId) return null;
      const result = await hybridService.getBookingByTicketId(ticketId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: !!ticketId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Check if user has existing booking for event
 */
export function useExistingBooking(userId: string | undefined, eventId: string | undefined, options?: Omit<UseQueryOptions<boolean, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.existingBooking(userId || '', eventId || ''),
    queryFn: async () => {
      if (!userId || !eventId) return false;
      const result = await hybridService.checkExistingBooking(userId, eventId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? false;
    },
    enabled: !!userId && !!eventId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Create booking mutation
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, eventId }: { userId: string; eventId: string }) => {
      const result = await hybridService.createBooking(userId, eventId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userBookings(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventParticipants(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.existingBooking(variables.userId, variables.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.event(variables.eventId) });
    },
  });
}

/**
 * Cancel booking mutation
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, eventId, reason }: { bookingId: string; eventId: string; reason?: string }) => {
      const result = await hybridService.cancelBooking(bookingId, eventId, reason);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventParticipants(variables.eventId) });
      // Invalidate all user bookings (we don't have userId in variables)
      queryClient.invalidateQueries({ queryKey: ['bookings', 'user'] });
    },
  });
}

/**
 * Check-in participant mutation
 */
export function useCheckInParticipant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      checkedInBy,
      method 
    }: { 
      bookingId: string; 
      checkedInBy: string;
      method?: 'qr_scan' | 'manual_entry' | 'ticket_id' | 'auto';
    }) => {
      const result = await hybridService.checkInParticipant(bookingId, checkedInBy, method);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(variables.bookingId) });
      // Invalidate all event participants
      queryClient.invalidateQueries({ queryKey: ['bookings', 'event'] });
    },
  });
}

// ============================================================================
// CATEGORY HOOKS
// ============================================================================

/**
 * Fetch all categories
 */
export function useCategories(options?: Omit<UseQueryOptions<Category[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const result = await hybridService.listCategories();
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
    ...options,
  });
}

// ============================================================================
// FAVORITE HOOKS
// ============================================================================

/**
 * Fetch user's favorites
 */
export function useUserFavorites(userId: string | undefined, options?: Omit<UseQueryOptions<Array<{ id: string; eventId: string }>, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.userFavorites(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const result = await hybridService.getUserFavorites(userId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Check if event is favorited
 */
export function useIsFavorite(userId: string | undefined, eventId: string | undefined, options?: Omit<UseQueryOptions<{ isFavorite: boolean; favoriteId: string }, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.isFavorite(userId || '', eventId || ''),
    queryFn: async () => {
      if (!userId || !eventId) return { isFavorite: false, favoriteId: '' };
      const result = await hybridService.checkIsFavorite(userId, eventId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? { isFavorite: false, favoriteId: '' };
    },
    enabled: !!userId && !!eventId,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Add favorite mutation
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, eventId }: { userId: string; eventId: string }) => {
      const result = await hybridService.addFavorite(userId, eventId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userFavorites(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.isFavorite(variables.userId, variables.eventId) });
    },
  });
}

/**
 * Remove favorite mutation
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ favoriteId, userId, eventId }: { favoriteId: string; userId: string; eventId: string }) => {
      const result = await hybridService.removeFavorite(favoriteId, userId, eventId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userFavorites(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.isFavorite(variables.userId, variables.eventId) });
    },
  });
}

// ============================================================================
// NOTIFICATION HOOKS
// ============================================================================

/**
 * Fetch user's notifications
 */
export function useUserNotifications(userId: string | undefined, options?: Omit<UseQueryOptions<Notification[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.userNotifications(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const result = await hybridService.getUserNotifications(userId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute for notifications
    ...options,
  });
}

/**
 * Mark notification as read mutation
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await hybridService.markNotificationRead(notificationId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ============================================================================
// REVIEW HOOKS
// ============================================================================

/**
 * Fetch event reviews
 */
export function useEventReviews(eventId: string | undefined, options?: Omit<UseQueryOptions<Array<{
  id: string;
  userId: string;
  eventId: string;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
}>, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.eventReviews(eventId || ''),
    queryFn: async () => {
      if (!eventId) return [];
      const result = await hybridService.getEventReviews(eventId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!eventId,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Create review mutation
 */
export function useCreateReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      userId: string;
      rating: number;
      comment?: string;
      isAnonymous?: boolean;
    }) => {
      const result = await hybridService.createReview(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventReviews(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.event(variables.eventId) });
    },
  });
}

/**
 * Delete review mutation
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reviewId, eventId }: { reviewId: string; eventId: string }) => {
      const result = await hybridService.deleteReview(reviewId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventReviews(variables.eventId) });
    },
  });
}

/**
 * Flag review mutation
 */
export function useFlagReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reviewId, userId, reason, eventId }: { reviewId: string; userId: string; reason?: string; eventId: string }) => {
      const result = await hybridService.flagReview(reviewId, userId, reason);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventReviews(variables.eventId) });
    },
  });
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetch dashboard statistics
 */
export function useDashboardStats(organizerId?: string, options?: Omit<UseQueryOptions<DashboardStats, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(organizerId),
    queryFn: async () => {
      const result = await hybridService.getDashboardStats(organizerId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? { totalEvents: 0, activeEvents: 0, totalRegistrations: 0, totalRevenue: 0 };
    },
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

// ============================================================================
// FILE UPLOAD HOOKS
// ============================================================================

interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

/**
 * Upload event image mutation with progress tracking
 */
export function useUploadEventImage() {
  return useMutation({
    mutationFn: async ({ 
      eventId, 
      file,
      onProgress 
    }: { 
      eventId: string; 
      file: File;
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      const result = await storageService.uploadEventImage(file, eventId, onProgress);
      return result;
    },
  });
}

/**
 * Upload user avatar mutation with progress tracking
 */
export function useUploadUserAvatar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      file,
      onProgress 
    }: { 
      userId: string; 
      file: File;
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      const result = await storageService.uploadUserAvatar(file, userId, onProgress);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.userId) });
    },
  });
}

/**
 * Upload ID card mutation with progress tracking
 */
export function useUploadIdCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      file,
      onProgress 
    }: { 
      userId: string; 
      file: File;
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      const result = await storageService.uploadIdCard(file, userId, onProgress);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.userId) });
    },
  });
}

/**
 * Delete file mutation
 */
export function useDeleteFile() {
  return useMutation({
    mutationFn: async (path: string) => {
      await storageService.deleteFile(path);
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get error message from mutation error
 */
export function useErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  const serviceError = transformError(error);
  return serviceError.userMessage;
}

/**
 * Hook for optimistic updates on favorites
 */
export function useOptimisticFavorite(userId: string, eventId: string) {
  const queryClient = useQueryClient();
  const { data: favoriteData, isLoading } = useIsFavorite(userId, eventId);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  
  const toggle = async () => {
    if (!favoriteData) return;
    
    const queryKey = queryKeys.isFavorite(userId, eventId);
    const previousData = queryClient.getQueryData(queryKey);
    
    // Optimistic update
    queryClient.setQueryData(queryKey, {
      isFavorite: !favoriteData.isFavorite,
      favoriteId: favoriteData.favoriteId
    });
    
    try {
      if (favoriteData.isFavorite) {
        await removeFavorite.mutateAsync({ 
          favoriteId: favoriteData.favoriteId, 
          userId, 
          eventId 
        });
      } else {
        await addFavorite.mutateAsync({ userId, eventId });
      }
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(queryKey, previousData);
      throw error;
    }
  };
  
  return {
    isFavorite: favoriteData?.isFavorite ?? false,
    isLoading: isLoading || addFavorite.isPending || removeFavorite.isPending,
    toggle,
    error: addFavorite.error || removeFavorite.error,
  };
}
