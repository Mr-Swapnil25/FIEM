import { describe, it, expect } from 'vitest';
import {
    getFileExtension,
    generateUniqueFilename,
    validateFileSize,
    validateFileType,
    dataURLToBlob,
    extractPathFromUrl,
    ALLOWED_IMAGE_TYPES,
    MAX_FILE_SIZES,
} from './helpers';

describe('Storage Helpers', () => {
    describe('getFileExtension', () => {
        it('should extract extension from filename', () => {
            expect(getFileExtension('photo.jpg')).toBe('jpg');
            expect(getFileExtension('document.PDF')).toBe('pdf');
            expect(getFileExtension('image.JPEG')).toBe('jpeg');
        });

        it('should return filename when no dot present', () => {
            // When no dot, split('.').pop() returns the whole string
            expect(getFileExtension('noext')).toBe('noext');
        });

        it('should handle multiple dots', () => {
            expect(getFileExtension('file.backup.jpg')).toBe('jpg');
        });
    });

    describe('generateUniqueFilename', () => {
        it('should generate unique filename with timestamp', () => {
            const filename1 = generateUniqueFilename('photo.jpg');
            const filename2 = generateUniqueFilename('photo.jpg');

            expect(filename1).not.toBe(filename2);
            expect(filename1).toMatch(/^photo_\d+_[a-z0-9]+\.jpg$/);
        });

        it('should sanitize special characters', () => {
            const filename = generateUniqueFilename('my photo (1).jpg');

            expect(filename).toMatch(/^my_photo__1__\d+_[a-z0-9]+\.jpg$/);
        });
    });

    describe('validateFileSize', () => {
        it('should return true for files under max size', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            Object.defineProperty(file, 'size', { value: 1024 * 1024 });

            expect(validateFileSize(file, MAX_FILE_SIZES.AVATAR)).toBe(true);
        });

        it('should return false for files over max size', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 });

            expect(validateFileSize(file, MAX_FILE_SIZES.AVATAR)).toBe(false);
        });
    });

    describe('validateFileType', () => {
        it('should return true for allowed types', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

            expect(validateFileType(file, ALLOWED_IMAGE_TYPES)).toBe(true);
        });

        it('should return false for disallowed types', () => {
            const file = new File([''], 'test.txt', { type: 'text/plain' });

            expect(validateFileType(file, ALLOWED_IMAGE_TYPES)).toBe(false);
        });
    });

    describe('extractPathFromUrl', () => {
        it('should extract path from Firebase Storage URL', () => {
            const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Fuser123%2Favatar.jpg?alt=media';

            expect(extractPathFromUrl(url)).toBe('avatars/user123/avatar.jpg');
        });

        it('should return original path if not a Firebase URL', () => {
            const path = 'avatars/user123/avatar.jpg';

            expect(extractPathFromUrl(path)).toBe(path);
        });
    });

    describe('dataURLToBlob', () => {
        it('should convert data URL to Blob', () => {
            const dataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const blob = dataURLToBlob(dataURL);

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('image/png');
        });
    });
});
