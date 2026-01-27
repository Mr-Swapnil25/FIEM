/**
 * User Query Hooks
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { User } from '../../types';
import * as hybridService from '../../services/hybridService';
import { queryKeys } from './queryKeys';

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
        staleTime: 5 * 60 * 1000,
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
            queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.userId) });
        },
    });
}
