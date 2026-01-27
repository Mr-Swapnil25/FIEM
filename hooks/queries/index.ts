/**
 * React Query Hooks - Modular Re-export Index
 * 
 * Re-exports all domain-specific query hooks for backward compatibility.
 */

// Query Keys
export { queryKeys } from './queryKeys';

// User Hooks
export { useUser, useUpdateUser } from './useUserQueries';

// Event Hooks
export {
    usePublishedEvents,
    useEvent,
    useOrganizerEvents,
    useCreateEvent,
    useUpdateEvent,
    useDeleteEvent,
    useUpdateEventStatus
} from './useEventQueries';

// Booking Hooks
export {
    useUserBookings,
    useEventParticipants,
    useBooking,
    useBookingByTicket,
    useExistingBooking,
    useCreateBooking,
    useCancelBooking,
    useCheckInParticipant
} from './useBookingQueries';

// Favorite Hooks
export {
    useUserFavorites,
    useIsFavorite,
    useAddFavorite,
    useRemoveFavorite,
    useOptimisticFavorite
} from './useFavoriteQueries';

// Notification Hooks
export {
    useUserNotifications,
    useMarkNotificationRead
} from './useNotificationQueries';

// Review Hooks
export {
    useEventReviews,
    useCreateReview,
    useDeleteReview,
    useFlagReview
} from './useReviewQueries';

// Upload Hooks
export {
    useUploadEventImage,
    useUploadUserAvatar,
    useUploadIdCard,
    useDeleteFile
} from './useUploadQueries';

// Category & Dashboard Hooks
export {
    useCategories,
    useDashboardStats
} from './useMiscQueries';
