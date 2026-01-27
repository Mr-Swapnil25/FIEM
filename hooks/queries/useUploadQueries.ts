/**
 * Upload Query Hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as storageService from '../../services/storageService';
import { queryKeys } from './queryKeys';

interface UploadProgress {
    progress: number;
    bytesTransferred: number;
    totalBytes: number;
}

/**
 * Upload event image mutation with progress tracking
 */
export function useUploadEventImage() {
    return useMutation({
        mutationFn: async ({
            eventId,
            file,
            onProgress
        }: {
            eventId: string;
            file: File;
            onProgress?: (progress: UploadProgress) => void;
        }) => {
            const result = await storageService.uploadEventImage(file, eventId, onProgress);
            return result;
        },
    });
}

/**
 * Upload user avatar mutation with progress tracking
 */
export function useUploadUserAvatar() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            file,
            onProgress
        }: {
            userId: string;
            file: File;
            onProgress?: (progress: UploadProgress) => void;
        }) => {
            const result = await storageService.uploadUserAvatar(file, userId, onProgress);
            return result;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.userId) });
        },
    });
}

/**
 * Upload ID card mutation with progress tracking
 */
export function useUploadIdCard() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            file,
            onProgress
        }: {
            userId: string;
            file: File;
            onProgress?: (progress: UploadProgress) => void;
        }) => {
            const result = await storageService.uploadIdCard(file, userId, onProgress);
            return result;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.userId) });
        },
    });
}

/**
 * Delete file mutation
 */
export function useDeleteFile() {
    return useMutation({
        mutationFn: async (path: string) => {
            await storageService.deleteFile(path);
        },
    });
}
