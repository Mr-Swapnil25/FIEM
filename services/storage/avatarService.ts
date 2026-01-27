/**
 * Avatar Storage Service
 * 
 * Upload and manage user avatar images.
 */

import {
    storage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    STORAGE_PATHS
} from '../firebase';
import type { UploadTaskSnapshot, UploadMetadata } from 'firebase/storage';
import { UploadProgress, UploadResult } from './types';
import {
    MAX_FILE_SIZES,
    ALLOWED_IMAGE_TYPES,
    getFileExtension,
    validateFileSize,
    validateFileType,
    getErrorMessage,
    extractPathFromUrl
} from './helpers';

/**
 * Upload user avatar
 */
export const uploadUserAvatar = async (
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    try {
        if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
            return { success: false, error: 'Please select a JPEG, PNG, GIF, or WebP image' };
        }

        if (!validateFileSize(file, MAX_FILE_SIZES.AVATAR)) {
            return { success: false, error: 'Avatar must be less than 2MB' };
        }

        const ext = getFileExtension(file.name, file.type);
        const filePath = `${STORAGE_PATHS.USER_AVATARS}/${userId}/avatar.${ext}`;
        const storageRef = ref(storage, filePath);

        const metadata: UploadMetadata = {
            contentType: file.type,
            customMetadata: {
                userId,
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
                        console.error('[Storage] Avatar upload error:', error);
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
        console.error('[Storage] Error uploading avatar:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to upload avatar') };
    }
};

/**
 * Get user avatar URL by trying common extensions
 */
export const getUserAvatarURL = async (userId: string): Promise<string | null> => {
    const extensions = ['jpg', 'png', 'webp', 'gif'];

    for (const ext of extensions) {
        try {
            const filePath = `${STORAGE_PATHS.USER_AVATARS}/${userId}/avatar.${ext}`;
            const storageRef = ref(storage, filePath);
            return await getDownloadURL(storageRef);
        } catch {
            // Continue to next extension
        }
    }

    return null;
};

/**
 * Delete user avatar (all extensions)
 */
export const deleteUserAvatar = async (userId: string): Promise<boolean> => {
    try {
        const folderRef = ref(storage, `${STORAGE_PATHS.USER_AVATARS}/${userId}`);
        const files = await listAll(folderRef);
        await Promise.all(files.items.map(item => deleteObject(item)));
        return true;
    } catch (error) {
        console.error('[Storage] Error deleting avatar:', error);
        return false;
    }
};

/**
 * Delete user avatar by URL
 */
export const deleteUserAvatarByUrl = async (avatarUrl: string): Promise<boolean> => {
    try {
        const path = extractPathFromUrl(avatarUrl);
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        return true;
    } catch (error) {
        console.error('[Storage] Error deleting avatar by URL:', error);
        return false;
    }
};
