/**
 * React Query Keys
 * 
 * Centralized query keys for cache invalidation.
 */

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
