/**
 * Event Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Event, EventCategory } from '../../types';
import * as hybridService from '../../services/hybridService';
import { queryKeys } from './queryKeys';

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
        staleTime: 30 * 1000,
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
        staleTime: 30 * 1000,
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
