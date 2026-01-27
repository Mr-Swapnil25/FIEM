/**
 * Hooks Index
 * 
 * Re-exports all hooks for convenient imports
 * 
 * @module hooks
 */

// React Query data hooks
export {
  // Query keys for cache invalidation
  queryKeys,

  // User hooks
  useUser,
  useUpdateUser,

  // Event hooks
  usePublishedEvents,
  useEvent,
  useOrganizerEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUpdateEventStatus,

  // Booking hooks
  useUserBookings,
  useEventParticipants,
  useBooking,
  useBookingByTicket,
  useExistingBooking,
  useCreateBooking,
  useCancelBooking,
  useCheckInParticipant,

  // Category hooks
  useCategories,

  // Favorite hooks
  useUserFavorites,
  useIsFavorite,
  useAddFavorite,
  useRemoveFavorite,
  useOptimisticFavorite,

  // Notification hooks
  useUserNotifications,
  useMarkNotificationRead,

  // Review hooks
  useEventReviews,
  useCreateReview,
  useDeleteReview,
  useFlagReview,

  // Dashboard hooks
  useDashboardStats,

  // File upload hooks
  useUploadEventImage,
  useUploadUserAvatar,
  useUploadIdCard,
  useDeleteFile,

  // Utility hooks
  useErrorMessage,
} from './useFirebaseData';

// Real-time hooks
export {
  useRealtimeEvents,
  useRealtimeEvent,
  useRealtimeUserBookings,
  useRealtimeEventParticipants,
  useRealtimeNotifications,
  useRealtimeConnectionStatus,
  useLiveIndicator,
} from './useRealtime';

// Auth hooks
export {
  useAuthState,
  useAuthOperations,
  useSessionMonitor,
  useEmailVerification,
  usePasswordStrength,
  type AuthState,
  type UseAuthReturn,
  type SessionInfo,
} from './useAuth';

// QR Scanner hook
export { useQRScanner } from './useQRScanner';

// Check-in logic hook
export { useCheckInLogic, type CheckedInData } from './useCheckInLogic';

