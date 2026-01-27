/**
 * Generic File Storage Service
 * 
 * Generic file operations (delete, metadata, list).
 */

import {
    storage,
    ref,
    getDownloadURL,
    deleteObject,
    listAll,
    getMetadata
} from '../firebase';
import { FileMetadata } from './types';

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
