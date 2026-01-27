/**
 * Firebase Storage Service - Backward Compatibility Layer
 * 
 * This file re-exports from the new modular structure.
 * The original 1224-line file has been decomposed into domain-specific modules.
 * 
 * @deprecated Import from './storage' or specific modules instead
 * @module services/storageService
 */

// Re-export everything from the new modular index
export * from './storage';

// Additional exports that may be needed for backward compatibility
import {
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  STORAGE_PATHS
} from './firebase';
import type { UploadTaskSnapshot, UploadMetadata } from 'firebase/storage';
import { UploadProgress, UploadResult } from './storage/types';
import {
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
  validateFileSize,
  validateFileType,
  getErrorMessage,
  getFileExtension,
  generateUniqueFilename
} from './storage/helpers';

/**
 * Upload with retry logic
 */
export const uploadWithRetry = async (
  file: File,
  storagePath: string,
  options: {
    maxRetries?: number;
    onProgress?: (progress: UploadProgress) => void;
    metadata?: UploadMetadata;
  } = {}
): Promise<UploadResult> => {
  const { maxRetries = 3, onProgress, metadata } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      const result = await new Promise<UploadResult>((resolve) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            if (onProgress) {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress({
                progress,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                state: snapshot.state as UploadProgress['state']
              });
            }
          },
          (error) => {
            resolve({ success: false, error: error.message });
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              success: true,
              url,
              path: storagePath,
              fullPath: uploadTask.snapshot.ref.fullPath,
              fileName: file.name
            });
          }
        );
      });

      if (result.success) return result;
      lastError = new Error(result.error);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload failed');
      console.warn(`[Storage] Retry ${attempt}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Upload failed after retries'
  };
};

/**
 * Upload gallery image for event
 */
export const uploadEventGalleryImage = async (
  file: File,
  eventId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
      return { success: false, error: 'Please select a JPEG, PNG, GIF, or WebP image' };
    }

    if (!validateFileSize(file, MAX_FILE_SIZES.EVENT_IMAGE)) {
      return { success: false, error: 'Image must be less than 5MB' };
    }

    const fileName = generateUniqueFilename(file.name);
    const filePath = `${STORAGE_PATHS.EVENT_IMAGES}/${eventId}/gallery/${fileName}`;

    return uploadWithRetry(file, filePath, {
      onProgress,
      metadata: {
        contentType: file.type,
        customMetadata: {
          eventId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          type: 'gallery'
        }
      }
    });
  } catch (error: unknown) {
    console.error('[Storage] Error uploading gallery image:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to upload image') };
  }
};

/**
 * Delete gallery image
 */
export const deleteGalleryImage = async (imagePath: string): Promise<boolean> => {
  try {
    const storageRef = ref(storage, imagePath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting gallery image:', error);
    return false;
  }
};

console.log('[Storage] Legacy service re-exporting from modular structure');