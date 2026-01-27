/**
 * Review Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import * as hybridService from '../../services/hybridService';
import { queryKeys } from './queryKeys';

type Review = {
    id: string;
    userId: string;
    eventId: string;
    rating: number;
    comment?: string;
    isAnonymous: boolean;
    createdAt: string;
};

/**
 * Fetch event reviews
 */
export function useEventReviews(eventId: string | undefined, options?: Omit<UseQueryOptions<Review[], Error>, 'queryKey' | 'queryFn'>) {
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
