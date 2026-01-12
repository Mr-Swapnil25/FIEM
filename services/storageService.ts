/**
 * Firebase Storage Service
 * Handles image uploads for events, user avatars, and tickets
 */

import {
  storage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  STORAGE_PATHS
} from './firebase';
import type { UploadTaskSnapshot } from 'firebase/storage';

// ==================== TYPES ====================

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

// ==================== EVENT IMAGE UPLOADS ====================

/**
 * Upload event cover image
 * @param file - The image file to upload
 * @param eventId - Optional event ID (use for editing), will generate random name for new events
 * @param onProgress - Optional progress callback
 */
export const uploadEventImage = async (
  file: File,
  eventId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select an image file' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'Image must be less than 5MB' };
    }

    // Generate file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = eventId 
      ? `${eventId}_${timestamp}_${sanitizedName}`
      : `new_${timestamp}_${sanitizedName}`;
    const filePath = `${STORAGE_PATHS.EVENT_IMAGES}/${fileName}`;
    
    const storageRef = ref(storage, filePath);

    // Upload with progress tracking
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes
            });
          },
          (error) => {
            console.error('[Storage] Upload error:', error);
            resolve({ success: false, error: error.message });
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, url, path: filePath });
          }
        );
      });
    } else {
      // Simple upload without progress
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return { success: true, url, path: filePath };
    }
  } catch (error: any) {
    console.error('[Storage] Error uploading event image:', error);
    return { success: false, error: error.message || 'Failed to upload image' };
  }
};

/**
 * Delete event image
 */
export const deleteEventImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract path from URL or use as-is if it's a path
    let path = imageUrl;
    
    // If it's a full URL, extract the path
    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      const match = imageUrl.match(/\/o\/(.+?)\?/);
      if (match) {
        path = decodeURIComponent(match[1]);
      }
    }
    
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting image:', error);
    return false;
  }
};

// ==================== USER AVATAR UPLOADS ====================

/**
 * Upload user avatar
 */
export const uploadUserAvatar = async (
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select an image file' };
    }

    // Validate file size (max 2MB for avatars)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'Avatar must be less than 2MB' };
    }

    // Generate file path
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${STORAGE_PATHS.USER_AVATARS}/${userId}_${timestamp}.${ext}`;
    
    const storageRef = ref(storage, filePath);

    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes
            });
          },
          (error) => {
            console.error('[Storage] Avatar upload error:', error);
            resolve({ success: false, error: error.message });
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, url, path: filePath });
          }
        );
      });
    } else {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return { success: true, url, path: filePath };
    }
  } catch (error: any) {
    console.error('[Storage] Error uploading avatar:', error);
    return { success: false, error: error.message || 'Failed to upload avatar' };
  }
};

/**
 * Delete user avatar
 */
export const deleteUserAvatar = async (avatarUrl: string): Promise<boolean> => {
  try {
    let path = avatarUrl;
    
    if (avatarUrl.includes('firebasestorage.googleapis.com')) {
      const match = avatarUrl.match(/\/o\/(.+?)\?/);
      if (match) {
        path = decodeURIComponent(match[1]);
      }
    }
    
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting avatar:', error);
    return false;
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Convert File to base64 data URL (for preview)
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image before upload (reduces file size)
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
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
    // Compress if larger than 500KB
    let fileToUpload: File | Blob = file;
    
    if (file.size > 500 * 1024) {
      const compressed = await compressImage(file);
      fileToUpload = new File([compressed], file.name, { type: file.type });
    }
    
    return uploadEventImage(fileToUpload as File, eventId, onProgress);
  } catch (error: any) {
    console.error('[Storage] Error compressing/uploading:', error);
    return { success: false, error: error.message };
  }
};

export default {
  uploadEventImage,
  uploadEventImageCompressed,
  deleteEventImage,
  uploadUserAvatar,
  deleteUserAvatar,
  fileToDataUrl,
  compressImage
};
