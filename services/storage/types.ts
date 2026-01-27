/**
 * Storage Types
 * 
 * Shared type definitions for storage operations.
 */

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
