/**
 * ID Card Storage Service
 * 
 * Upload and manage ID card documents for verification.
 */

import {
    storage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    listAll,
    getMetadata
} from '../firebase';
import type { UploadTaskSnapshot, UploadMetadata } from 'firebase/storage';
import { UploadProgress, UploadResult, FileMetadata } from './types';
import {
    MAX_FILE_SIZES,
    ALLOWED_DOCUMENT_TYPES,
    generateUniqueFilename,
    validateFileSize,
    validateFileType,
    getErrorMessage
} from './helpers';

/**
 * Upload ID card image for verification
 */
export const uploadIdCard = async (
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    try {
        if (!validateFileType(file, ALLOWED_DOCUMENT_TYPES)) {
            return { success: false, error: 'Please select a JPEG, PNG, GIF, WebP, or PDF file' };
        }

        if (!validateFileSize(file, MAX_FILE_SIZES.ID_CARD)) {
            return { success: false, error: 'ID card file must be less than 5MB' };
        }

        const filename = generateUniqueFilename(file.name);
        const filePath = `id-cards/${userId}/${filename}`;
        const storageRef = ref(storage, filePath);

        const metadata: UploadMetadata = {
            contentType: file.type,
            customMetadata: {
                userId,
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                documentType: 'id-card'
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
                        console.error('[Storage] ID card upload error:', error);
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
        console.error('[Storage] Error uploading ID card:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to upload ID card') };
    }
};

/**
 * Get user ID cards list
 */
export const getUserIdCards = async (userId: string): Promise<FileMetadata[]> => {
    try {
        const folderRef = ref(storage, `id-cards/${userId}`);
        const files = await listAll(folderRef);

        const metadataPromises = files.items.map(async (item) => {
            const meta = await getMetadata(item);
            const downloadURL = await getDownloadURL(item);
            return {
                name: meta.name,
                fullPath: meta.fullPath,
                size: meta.size,
                contentType: meta.contentType || 'application/octet-stream',
                timeCreated: meta.timeCreated,
                updated: meta.updated,
                downloadURL
            };
        });

        return await Promise.all(metadataPromises);
    } catch (error) {
        console.error('[Storage] Error getting user ID cards:', error);
        return [];
    }
};
