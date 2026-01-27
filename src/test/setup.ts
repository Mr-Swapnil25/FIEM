import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Firebase
vi.mock('../services/firebase', () => ({
    storage: {},
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    uploadBytesResumable: vi.fn(),
    getDownloadURL: vi.fn(),
    deleteObject: vi.fn(),
    listAll: vi.fn(),
    getMetadata: vi.fn(),
    STORAGE_PATHS: {
        USER_AVATARS: 'avatars',
        EVENT_IMAGES: 'events',
    },
    db: {},
    app: {},
}));
