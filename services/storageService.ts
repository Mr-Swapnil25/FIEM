/**
 * Firebase Storage Service
 * 
 * ZERO LOCAL STORAGE TOLERANCE - All files go ONLY to Firebase Storage.
 * NO localStorage fallback exists in this service.
 * 
 * Storage Structure:
 * - /avatars/{userId}/avatar.{ext}
 * - /id-cards/{userId}/{filename}
 * - /events/{eventId}/banner.{ext}
 * - /events/{eventId}/gallery/{filename}
 * - /tickets/{bookingId}/ticket.png
 * - /exports/{userId}/{filename}
 * - /temp/{userId}/{sessionId}/{filename}
 */

import {
  storage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  STORAGE_PATHS
} from './firebase';
import type { UploadTaskSnapshot, UploadMetadata, StorageReference } from 'firebase/storage';

// ==================== TYPES ====================

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state?: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  fileName?: string;
  fullPath?: string;
}

export interface FileMetadata {
  name: string;
  fullPath: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  downloadURL?: string;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: UploadResult) => void;
  customMetadata?: Record<string, string>;
  contentType?: string;
}

// ==================== CONSTANTS ====================

const MAX_FILE_SIZES = {
  AVATAR: 2 * 1024 * 1024,      // 2MB
  ID_CARD: 5 * 1024 * 1024,     // 5MB
  EVENT_IMAGE: 5 * 1024 * 1024, // 5MB
  TICKET: 1 * 1024 * 1024,      // 1MB
  EXPORT: 10 * 1024 * 1024      // 10MB
} as const;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf'
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Helper to extract error message
 */
function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  return defaultMessage;
}

/**
 * Get file extension from filename or content type
 */
function getFileExtension(filename: string, contentType?: string): string {
  const fromFilename = filename.split('.').pop()?.toLowerCase();
  if (fromFilename) return fromFilename;
  
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
  };
  
  return contentType ? mimeToExt[contentType] || 'bin' : 'bin';
}

/**
 * Generate a unique filename with timestamp
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = getFileExtension(originalName);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  return `${baseName}_${timestamp}_${random}.${ext}`;
}

/**
 * Validate file size
 */
function validateFileSize(file: File | Blob, maxSize: number): boolean {
  return file.size <= maxSize;
}

/**
 * Validate file type
 */
function validateFileType(file: File | Blob, allowedTypes: string[]): boolean {
  const type = file instanceof File ? file.type : (file as Blob).type;
  return allowedTypes.includes(type);
}

/**
 * Convert data URL to Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

// ==================== EVENT IMAGE UPLOADS ====================

/**
 * Upload event cover/banner image
 * Path: /events/{eventId}/banner.{ext} or /events/new_{timestamp}_{name}
 * NO localStorage fallback - Firebase Storage ONLY
 */
export const uploadEventImage = async (
  file: File,
  eventId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
      return { success: false, error: 'Please select a JPEG, PNG, GIF, or WebP image' };
    }

    // Validate file size (max 5MB)
    if (!validateFileSize(file, MAX_FILE_SIZES.EVENT_IMAGE)) {
      return { success: false, error: 'Image must be less than 5MB' };
    }

    // Generate file path
    const timestamp = Date.now();
    const ext = getFileExtension(file.name, file.type);
    const fileName = eventId 
      ? `${eventId}/banner.${ext}`
      : `new_${timestamp}_${generateUniqueFilename(file.name)}`;
    const filePath = `${STORAGE_PATHS.EVENT_IMAGES}/${fileName}`;
    
    const storageRef = ref(storage, filePath);
    
    // Upload metadata
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        eventId: eventId || 'new',
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    };

    // Upload with progress tracking
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
            // NO localStorage fallback - return error directly
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
      // Simple upload without progress
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
    // NO localStorage fallback - propagate error
    return { success: false, error: getErrorMessage(error, 'Failed to upload image. Please check your connection and try again.') };
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
 * Path: /avatars/{userId}/avatar.{ext}
 * NO localStorage fallback - Firebase Storage ONLY
 */
export const uploadUserAvatar = async (
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!validateFileType(file, ALLOWED_IMAGE_TYPES)) {
      return { success: false, error: 'Please select a JPEG, PNG, GIF, or WebP image' };
    }

    // Validate file size (max 2MB for avatars)
    if (!validateFileSize(file, MAX_FILE_SIZES.AVATAR)) {
      return { success: false, error: 'Avatar must be less than 2MB' };
    }

    // Generate file path - use consistent naming for easy retrieval
    const ext = getFileExtension(file.name, file.type);
    const filePath = `${STORAGE_PATHS.USER_AVATARS}/${userId}/avatar.${ext}`;
    
    const storageRef = ref(storage, filePath);
    
    // Upload metadata
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
            // NO localStorage fallback - return error directly
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
    // NO localStorage fallback - propagate error
    return { success: false, error: getErrorMessage(error, 'Failed to upload avatar. Please check your connection and try again.') };
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
 * Delete user avatar by URL (legacy support)
 */
export const deleteUserAvatarByUrl = async (avatarUrl: string): Promise<boolean> => {
  try {
    let path = avatarUrl;
    
    if (avatarUrl.includes('firebasestorage.googleapis.com') || avatarUrl.includes('storage.googleapis.com')) {
      const match = avatarUrl.match(/\/o\/(.+?)\?/);
      if (match) {
        path = decodeURIComponent(match[1]);
      }
    }
    
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting avatar by URL:', error);
    return false;
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Convert File to base64 data URL (for preview only - NOT for storage)
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
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
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
  } catch (error: unknown) {
    console.error('[Storage] Error compressing/uploading:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to upload image') };
  }
};

// ==================== ID CARD UPLOAD ====================

/**
 * Upload ID card image for verification
 * Path: /id-cards/{userId}/{filename}
 * NO localStorage fallback - Firebase Storage ONLY with strict security rules
 */
export const uploadIdCard = async (
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!validateFileType(file, ALLOWED_DOCUMENT_TYPES)) {
      return { success: false, error: 'Please select a JPEG, PNG, GIF, WebP, or PDF file' };
    }

    // Validate file size (max 5MB for ID cards)
    if (!validateFileSize(file, MAX_FILE_SIZES.ID_CARD)) {
      return { success: false, error: 'ID card file must be less than 5MB' };
    }

    // Generate unique filename for privacy
    const filename = generateUniqueFilename(file.name);
    const filePath = `id-cards/${userId}/${filename}`;
    
    const storageRef = ref(storage, filePath);
    
    // Upload metadata
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
            // NO localStorage fallback - return error directly
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
    // NO localStorage fallback - propagate error
    return { success: false, error: getErrorMessage(error, 'Failed to upload ID card. Please check your connection and try again.') };
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

// ==================== TICKET UPLOAD ====================

/**
 * Upload ticket image (QR code / pass)
 * Path: /tickets/{bookingId}/ticket.png
 */
export const uploadTicket = async (
  bookingId: string,
  imageData: string | Blob,
  options?: UploadOptions
): Promise<UploadResult> => {
  try {
    // Convert data URL to Blob if needed
    const blob = typeof imageData === 'string' 
      ? dataURLToBlob(imageData) 
      : imageData;
    
    // Validate file size
    if (!validateFileSize(blob, MAX_FILE_SIZES.TICKET)) {
      return { success: false, error: 'Ticket image must be less than 1MB' };
    }
    
    const filePath = `tickets/${bookingId}/ticket.png`;
    const storageRef = ref(storage, filePath);
    
    // Upload metadata
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

// ==================== GENERIC FILE OPERATIONS ====================

/**
 * Delete file by full path
 */
export const deleteFile = async (fullPath: string): Promise<boolean> => {
  try {
    const storageRef = ref(storage, fullPath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting file:', error);
    return false;
  }
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (fullPath: string): Promise<FileMetadata | null> => {
  try {
    const storageRef = ref(storage, fullPath);
    const meta = await getMetadata(storageRef);
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      name: meta.name,
      fullPath: meta.fullPath,
      size: meta.size,
      contentType: meta.contentType || 'application/octet-stream',
      timeCreated: meta.timeCreated,
      updated: meta.updated,
      downloadURL
    };
  } catch (error) {
    console.error('[Storage] Error getting file metadata:', error);
    return null;
  }
};

/**
 * Get download URL for a file
 */
export const getFileDownloadURL = async (fullPath: string): Promise<string | null> => {
  try {
    const storageRef = ref(storage, fullPath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('[Storage] Error getting download URL:', error);
    return null;
  }
};

/**
 * List all files in a folder
 */
export const listFiles = async (folderPath: string): Promise<FileMetadata[]> => {
  try {
    const folderRef = ref(storage, folderPath);
    const files = await listAll(folderRef);
    
    const metadataPromises = files.items.map(async (item): Promise<FileMetadata | null> => {
      try {
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
      } catch {
        return null;
      }
    });
    
    const results = await Promise.all(metadataPromises);
    return results.filter((r): r is FileMetadata => r !== null);
  } catch (error) {
    console.error('[Storage] Error listing files:', error);
    return [];
  }
};

// ==================== EXPORTS ====================

export { MAX_FILE_SIZES, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES };

// ==================== UPLOAD WITH RETRY ====================

import {
  withRetry,
  DEFAULT_RETRY_CONFIG,
  transformError,
  logError,
  logInfo,
  type RetryConfig
} from './errorHandler';

/**
 * Upload event image with retry logic
 */
export const uploadEventImageWithRetry = async (
  file: File,
  eventId?: string,
  onProgress?: (progress: UploadProgress) => void,
  retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 }
): Promise<UploadResult> => {
  try {
    return await withRetry(
      () => uploadEventImage(file, eventId, onProgress),
      retryConfig,
      { operation: 'uploadEventImage', collection: 'events' }
    );
  } catch (error) {
    const serviceError = transformError(error);
    logError(serviceError, { operation: 'uploadEventImageWithRetry', timestamp: new Date().toISOString() });
    return { success: false, error: serviceError.userMessage };
  }
};

/**
 * Upload user avatar with retry logic
 */
export const uploadUserAvatarWithRetry = async (
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
  retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 }
): Promise<UploadResult> => {
  try {
    return await withRetry(
      () => uploadUserAvatar(file, userId, onProgress),
      retryConfig,
      { operation: 'uploadUserAvatar', documentId: userId }
    );
  } catch (error) {
    const serviceError = transformError(error);
    logError(serviceError, { operation: 'uploadUserAvatarWithRetry', timestamp: new Date().toISOString() });
    return { success: false, error: serviceError.userMessage };
  }
};

/**
 * Upload ID card with retry logic
 */
export const uploadIdCardWithRetry = async (
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
  retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 }
): Promise<UploadResult> => {
  try {
    return await withRetry(
      () => uploadIdCard(file, userId, onProgress),
      retryConfig,
      { operation: 'uploadIdCard', documentId: userId }
    );
  } catch (error) {
    const serviceError = transformError(error);
    logError(serviceError, { operation: 'uploadIdCardWithRetry', timestamp: new Date().toISOString() });
    return { success: false, error: serviceError.userMessage };
  }
};

// ==================== THUMBNAIL GENERATION ====================

/**
 * Generate thumbnail from image
 */
export const generateThumbnail = async (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.7
): Promise<Blob | null> => {
  try {
    return await compressImage(file, maxWidth, maxHeight, quality);
  } catch (error) {
    console.error('[Storage] Error generating thumbnail:', error);
    return null;
  }
};

/**
 * Upload event image with auto-generated thumbnail
 */
export const uploadEventImageWithThumbnail = async (
  file: File,
  eventId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{
  main: UploadResult;
  thumbnail: UploadResult | null;
}> => {
  // Upload main image
  const mainResult = await uploadEventImage(file, eventId, onProgress);
  
  if (!mainResult.success) {
    return { main: mainResult, thumbnail: null };
  }
  
  // Generate and upload thumbnail
  try {
    const thumbnailBlob = await generateThumbnail(file, 400, 300);
    
    if (!thumbnailBlob) {
      return { main: mainResult, thumbnail: null };
    }
    
    const thumbnailFile = new File([thumbnailBlob], `thumb_${file.name}`, { type: file.type });
    const ext = getFileExtension(file.name, file.type);
    const thumbnailPath = `${STORAGE_PATHS.EVENT_IMAGES}/${eventId}/thumb.${ext}`;
    
    const storageRef = ref(storage, thumbnailPath);
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        eventId,
        type: 'thumbnail',
        originalName: file.name
      }
    };
    
    const snapshot = await uploadBytes(storageRef, thumbnailFile, metadata);
    const url = await getDownloadURL(snapshot.ref);
    
    logInfo(`Thumbnail uploaded for event ${eventId}`);
    
    return {
      main: mainResult,
      thumbnail: {
        success: true,
        url,
        path: thumbnailPath,
        fullPath: snapshot.ref.fullPath
      }
    };
  } catch (error) {
    console.error('[Storage] Error uploading thumbnail:', error);
    return { main: mainResult, thumbnail: null };
  }
};

/**
 * Get event thumbnail URL
 */
export const getEventThumbnailURL = async (eventId: string): Promise<string | null> => {
  const extensions = ['jpg', 'png', 'webp', 'gif'];
  
  for (const ext of extensions) {
    try {
      const filePath = `${STORAGE_PATHS.EVENT_IMAGES}/${eventId}/thumb.${ext}`;
      const storageRef = ref(storage, filePath);
      return await getDownloadURL(storageRef);
    } catch {
      // Continue to next extension
    }
  }
  
  return null;
};

/**
 * Upload user avatar with auto-generated thumbnail
 */
export const uploadUserAvatarWithThumbnail = async (
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{
  main: UploadResult;
  thumbnail: UploadResult | null;
}> => {
  // Upload main avatar
  const mainResult = await uploadUserAvatar(file, userId, onProgress);
  
  if (!mainResult.success) {
    return { main: mainResult, thumbnail: null };
  }
  
  // Generate and upload small thumbnail
  try {
    const thumbnailBlob = await generateThumbnail(file, 64, 64);
    
    if (!thumbnailBlob) {
      return { main: mainResult, thumbnail: null };
    }
    
    const ext = getFileExtension(file.name, file.type);
    const thumbnailPath = `${STORAGE_PATHS.USER_AVATARS}/${userId}/thumb.${ext}`;
    
    const storageRef = ref(storage, thumbnailPath);
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        userId,
        type: 'thumbnail'
      }
    };
    
    const snapshot = await uploadBytes(storageRef, new File([thumbnailBlob], `thumb.${ext}`, { type: file.type }), metadata);
    const url = await getDownloadURL(snapshot.ref);
    
    return {
      main: mainResult,
      thumbnail: {
        success: true,
        url,
        path: thumbnailPath,
        fullPath: snapshot.ref.fullPath
      }
    };
  } catch (error) {
    console.error('[Storage] Error uploading avatar thumbnail:', error);
    return { main: mainResult, thumbnail: null };
  }
};

/**
 * Get user avatar thumbnail URL
 */
export const getUserAvatarThumbnailURL = async (userId: string): Promise<string | null> => {
  const extensions = ['jpg', 'png', 'webp', 'gif'];
  
  for (const ext of extensions) {
    try {
      const filePath = `${STORAGE_PATHS.USER_AVATARS}/${userId}/thumb.${ext}`;
      const storageRef = ref(storage, filePath);
      return await getDownloadURL(storageRef);
    } catch {
      // Continue to next extension
    }
  }
  
  return null;
};

// ==================== BATCH UPLOAD OPERATIONS ====================

/**
 * Upload multiple files in sequence
 */
export const uploadMultipleFiles = async (
  files: Array<{ file: File; path: string }>,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const { file, path } = files[i];
    
    try {
      const storageRef = ref(storage, path);
      const metadata: UploadMetadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      };
      
      if (onProgress) {
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);
        
        const result = await new Promise<UploadResult>((resolve) => {
          uploadTask.on(
            'state_changed',
            (snapshot: UploadTaskSnapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(i, {
                progress,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                state: snapshot.state as UploadProgress['state']
              });
            },
            (error) => {
              resolve({ success: false, error: error.message });
            },
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                success: true,
                url,
                path,
                fullPath: uploadTask.snapshot.ref.fullPath,
                fileName: file.name
              });
            }
          );
        });
        
        results.push(result);
      } else {
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const url = await getDownloadURL(snapshot.ref);
        results.push({
          success: true,
          url,
          path,
          fullPath: snapshot.ref.fullPath,
          fileName: file.name
        });
      }
    } catch (error: unknown) {
      results.push({
        success: false,
        error: getErrorMessage(error, `Failed to upload ${file.name}`),
        fileName: file.name
      });
    }
  }
  
  return results;
};

/**
 * Upload event gallery images
 */
export const uploadEventGallery = async (
  files: File[],
  eventId: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> => {
  const uploadItems = files.map((file, index) => {
    const ext = getFileExtension(file.name, file.type);
    const timestamp = Date.now();
    const path = `${STORAGE_PATHS.EVENT_IMAGES}/${eventId}/gallery/${timestamp}_${index}.${ext}`;
    return { file, path };
  });
  
  return uploadMultipleFiles(uploadItems, onProgress);
};

/**
 * Delete event gallery
 */
export const deleteEventGallery = async (eventId: string): Promise<boolean> => {
  try {
    const folderRef = ref(storage, `${STORAGE_PATHS.EVENT_IMAGES}/${eventId}/gallery`);
    const files = await listAll(folderRef);
    
    await Promise.all(files.items.map(item => deleteObject(item)));
    logInfo(`Event gallery deleted for ${eventId}`);
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting gallery:', error);
    return false;
  }
};

/**
 * Get event gallery URLs
 */
export const getEventGalleryURLs = async (eventId: string): Promise<string[]> => {
  try {
    const folderRef = ref(storage, `${STORAGE_PATHS.EVENT_IMAGES}/${eventId}/gallery`);
    const files = await listAll(folderRef);
    
    const urls = await Promise.all(
      files.items.map(item => getDownloadURL(item))
    );
    
    return urls;
  } catch (error) {
    console.error('[Storage] Error getting gallery URLs:', error);
    return [];
  }
};

// ==================== DEFAULT EXPORT ====================

export default {
  // Event images
  uploadEventImage,
  uploadEventImageCompressed,
  uploadEventImageWithRetry,
  uploadEventImageWithThumbnail,
  deleteEventImage,
  getEventThumbnailURL,
  // Event gallery
  uploadEventGallery,
  deleteEventGallery,
  getEventGalleryURLs,
  // User avatars
  uploadUserAvatar,
  uploadUserAvatarWithRetry,
  uploadUserAvatarWithThumbnail,
  deleteUserAvatar,
  deleteUserAvatarByUrl,
  getUserAvatarURL,
  getUserAvatarThumbnailURL,
  // ID cards
  uploadIdCard,
  uploadIdCardWithRetry,
  getUserIdCards,
  // Tickets
  uploadTicket,
  getTicketURL,
  // Generic operations
  deleteFile,
  getFileMetadata,
  getFileDownloadURL,
  listFiles,
  uploadMultipleFiles,
  // Thumbnails
  generateThumbnail,
  // Utilities
  fileToDataUrl,
  compressImage,
  dataURLToBlob
};

console.log('[Storage] Service initialized with retry logic and thumbnail generation');