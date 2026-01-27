/**
 * Storage Helpers
 * 
 * Utility functions for storage operations.
 */

// Constants
export const MAX_FILE_SIZES = {
    AVATAR: 2 * 1024 * 1024,      // 2MB
    ID_CARD: 5 * 1024 * 1024,     // 5MB
    EVENT_IMAGE: 5 * 1024 * 1024, // 5MB
    TICKET: 1 * 1024 * 1024,      // 1MB
    EXPORT: 10 * 1024 * 1024      // 10MB
} as const;

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
];

export const ALLOWED_DOCUMENT_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    'application/pdf'
];

/**
 * Helper to extract error message
 */
export function getErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof Error) {
        return error.message || defaultMessage;
    }
    return defaultMessage;
}

/**
 * Get file extension from filename or content type
 */
export function getFileExtension(filename: string, contentType?: string): string {
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
export function generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = getFileExtension(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseName}_${timestamp}_${random}.${ext}`;
}

/**
 * Validate file size
 */
export function validateFileSize(file: File | Blob, maxSize: number): boolean {
    return file.size <= maxSize;
}

/**
 * Validate file type
 */
export function validateFileType(file: File | Blob, allowedTypes: string[]): boolean {
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

/**
 * Convert File to base64 data URL (for preview only)
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
 * Compress image before upload
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
 * Extract path from Firebase Storage URL
 */
export function extractPathFromUrl(url: string): string {
    if (url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com')) {
        const match = url.match(/\/o\/(.+?)\?/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
    }
    return url;
}
