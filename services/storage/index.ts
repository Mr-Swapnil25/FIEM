/**
 * Storage Service - Modular Re-export Index
 * 
 * Re-exports all domain-specific storage modules for backward compatibility.
 */

// Types
export type {
    UploadProgress,
    UploadResult,
    FileMetadata,
    UploadOptions
} from './types';

// Helpers
export {
    MAX_FILE_SIZES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES,
    dataURLToBlob,
    fileToDataUrl,
    compressImage,
    validateFileSize,
    validateFileType
} from './helpers';

// Avatar Service
export {
    uploadUserAvatar,
    getUserAvatarURL,
    deleteUserAvatar,
    deleteUserAvatarByUrl
} from './avatarService';

// Event Image Service
export {
    uploadEventImage,
    uploadEventImageCompressed,
    deleteEventImage
} from './eventImageService';

// ID Card Service
export {
    uploadIdCard,
    getUserIdCards
} from './idCardService';

// Ticket Service
export {
    uploadTicket,
    getTicketURL
} from './ticketService';

// File Service
export {
    deleteFile,
    getFileMetadata,
    getFileDownloadURL,
    listFiles
} from './fileService';

console.log('[Storage] Modular service initialized');
