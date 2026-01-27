/**
 * Category and Dashboard Query Hooks
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { Category, DashboardStats } from '../../types';
import * as hybridService from '../../services/hybridService';
import { queryKeys } from './queryKeys';

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
        staleTime: 10 * 60 * 1000,
        ...options,
    });
}

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
        staleTime: 60 * 1000,
        ...options,
    });
}
