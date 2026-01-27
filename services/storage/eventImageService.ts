/**
 * Event Image Storage Service
 * 
 * Upload and manage event images.
 */

import {
    storage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    STORAGE_PATHS
} from '../firebase';
import type { UploadTaskSnapshot, UploadMetadata } from 'firebase/storage';
import { UploadProgress, UploadResult } from './types';
import {
    MAX_FILE_SIZES,
    ALLOWED_IMAGE_TYPES,
    getFileExtension,
    generateUniqueFilename,
    validateFileSize,
    validateFileType,
    getErrorMessage,
    extractPathFromUrl,
    compressImage
} from './helpers';

/**
 * Upload event cover/banner image
 */
export const uploadEventImage = async (
    file: File,
    eventId?: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    try {
        if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
            return { success: false, error: 'Please select a JPEG, PNG, GIF, or WebP image' };
        }

        if (!validateFileSize(file, MAX_FILE_SIZES.EVENT_IMAGE)) {
            return { success: false, error: 'Image must be less than 5MB' };
        }

        const timestamp = Date.now();
        const ext = getFileExtension(file.name, file.type);
        const fileName = eventId
            ? `${eventId}/banner.${ext}`
            : `new_${timestamp}_${generateUniqueFilename(file.name)}`;
        const filePath = `${STORAGE_PATHS.EVENT_IMAGES}/${fileName}`;

        const storageRef = ref(storage, filePath);

        const metadata: UploadMetadata = {
            contentType: file.type,
            customMetadata: {
                eventId: eventId || 'new',
                originalName: file.name,
                uploadedAt: new Date().toISOString()
            }
        };

        if (onProgress) {
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            return new Promise((resolve) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot: UploadTaskSnapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        onProgress({
                            progress,
                            bytesTransferred: snapshot.bytesTransferred,
                            totalBytes: snapshot.totalBytes,
                            state: snapshot.state as UploadProgress['state']
                        });
                    },
                    (error) => {
                        console.error('[Storage] Event image upload error:', error);
                        resolve({ success: false, error: error.message });
                    },
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({
                            success: true,
                            url,
                            path: filePath,
                            fullPath: uploadTask.snapshot.ref.fullPath,
                            fileName: file.name
                        });
                    }
                );
            });
        } else {
            const snapshot = await uploadBytes(storageRef, file, metadata);
            const url = await getDownloadURL(snapshot.ref);
            return {
                success: true,
                url,
                path: filePath,
                fullPath: snapshot.ref.fullPath,
                fileName: file.name
            };
        }
    } catch (error: unknown) {
        console.error('[Storage] Error uploading event image:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to upload image') };
    }
};

/**
 * Upload with compression (recommended for large images)
 */
export const uploadEventImageCompressed = async (
    file: File,
    eventId?: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    try {
        let fileToUpload: File | Blob = file;

        if (file.size > 500 * 1024) {
            const compressed = await compressImage(file);
            fileToUpload = new File([compressed], file.name, { type: file.type });
        }

        return uploadEventImage(fileToUpload as File, eventId, onProgress);
    } catch (error: unknown) {
        console.error('[Storage] Error compressing/uploading:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to upload image') };
    }
};

/**
 * Delete event image
 */
export const deleteEventImage = async (imageUrl: string): Promise<boolean> => {
    try {
        const path = extractPathFromUrl(imageUrl);
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        return true;
    } catch (error) {
        console.error('[Storage] Error deleting image:', error);
        return false;
    }
};
