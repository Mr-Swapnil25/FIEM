/**
 * Favorite Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import * as hybridService from '../../services/hybridService';
import { queryKeys } from './queryKeys';

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
            queryClient.setQueryData(queryKey, previousData);
            throw error;
        }
    };

    return {
        isFavorite: favoriteData?.isFavorite ?? false,
        isLoading: isLoading || addFavorite.isPending || removeFavorite.isPending,
        toggle,
    };
}
