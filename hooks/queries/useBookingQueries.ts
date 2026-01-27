/**
 * Booking Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Booking } from '../../types';
import * as hybridService from '../../services/hybridService';
import { queryKeys } from './queryKeys';

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
        staleTime: 60 * 1000,
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
            queryClient.invalidateQueries({ queryKey: ['bookings', 'event'] });
        },
    });
}
