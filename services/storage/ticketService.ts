/**
 * Ticket Storage Service
 * 
 * Upload and manage ticket images (QR codes).
 */

import {
    storage,
    ref,
    uploadBytes,
    getDownloadURL
} from '../firebase';
import type { UploadMetadata } from 'firebase/storage';
import { UploadResult, UploadOptions } from './types';
import { MAX_FILE_SIZES, validateFileSize, dataURLToBlob } from './helpers';

/**
 * Upload ticket image (QR code / pass)
 */
export const uploadTicket = async (
    bookingId: string,
    imageData: string | Blob,
    options?: UploadOptions
): Promise<UploadResult> => {
    try {
        const blob = typeof imageData === 'string'
            ? dataURLToBlob(imageData)
            : imageData;

        if (!validateFileSize(blob, MAX_FILE_SIZES.TICKET)) {
            return { success: false, error: 'Ticket image must be less than 1MB' };
        }

        const filePath = `tickets/${bookingId}/ticket.png`;
        const storageRef = ref(storage, filePath);

        const metadata: UploadMetadata = {
            contentType: 'image/png',
            customMetadata: {
                bookingId,
                uploadedAt: new Date().toISOString(),
                documentType: 'ticket'
            }
        };

        const snapshot = await uploadBytes(storageRef, blob, metadata);
        const url = await getDownloadURL(snapshot.ref);

        const result = {
            success: true,
            url,
            path: filePath,
            fullPath: snapshot.ref.fullPath
        };

        options?.onComplete?.(result);
        return result;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Ticket upload failed';
        options?.onError?.(error instanceof Error ? error : new Error(errorMsg));
        return { success: false, error: errorMsg };
    }
};

/**
 * Get ticket URL
 */
export const getTicketURL = async (bookingId: string): Promise<string | null> => {
    try {
        const filePath = `tickets/${bookingId}/ticket.png`;
        const storageRef = ref(storage, filePath);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('[Storage] Error getting ticket URL:', error);
        return null;
    }
};
