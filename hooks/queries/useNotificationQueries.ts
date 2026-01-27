/**
 * Notification Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Notification } from '../../types';
import * as hybridService from '../../services/hybridService';
import { queryKeys } from './queryKeys';

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
        refetchInterval: 60 * 1000,
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
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
