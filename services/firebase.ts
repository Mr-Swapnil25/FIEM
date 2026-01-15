/**
 * Firebase Configuration
 * Initializes Firebase app, Auth, Storage, and Data Connect
 * Configured for Cloud SQL PostgreSQL via Firebase Data Connect
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  FirebaseStorage,
  UploadTaskSnapshot,
  UploadMetadata
} from 'firebase/storage';

// Firebase configuration from environment variables
// SECURITY: All credentials MUST come from environment variables
// Never commit hardcoded credentials to version control
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required configuration at startup
const requiredConfigs = ['apiKey', 'authDomain', 'projectId'] as const;
for (const key of requiredConfigs) {
  if (!firebaseConfig[key]) {
    console.error(`[Firebase] Missing required config: VITE_FIREBASE_${key.toUpperCase()}`);
  }
}

// Allowed email domain for registration
export const ALLOWED_EMAIL_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@teamfuture.in';

// Email validation regex for institutional emails
// Format: firstname.lastname.department.batch@teamfuture.in
export const EMAIL_REGEX = /^[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z0-9]+@teamfuture\.in$/;

// Validate if email is from allowed domain
export const isValidInstitutionalEmail = (email: string): boolean => {
  if (!email) return false;
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase());
};

// Parse institutional email to extract user info
export const parseInstitutionalEmail = (email: string): { 
  firstName: string; 
  lastName: string; 
  department: string; 
  batch: string 
} | null => {
  if (!isValidInstitutionalEmail(email)) return null;
  
  const localPart = email.split('@')[0];
  const parts = localPart.split('.');
  
  if (parts.length >= 4) {
    return {
      firstName: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
      lastName: parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase(),
      department: parts[2].toUpperCase(),
      batch: parts[3]
    };
  }
  
  return null;
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

// Check if Firebase is already initialized
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth
auth = getAuth(app);

// Initialize Storage
storage = getStorage(app);

// Initialize Analytics (only in browser and if supported)
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Connect to emulators in development mode
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  console.log('[Firebase] Connected to Auth emulator');
}

// Export Firebase instances
export { 
  app, 
  auth, 
  storage,
  analytics,
  // Auth methods
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  // Storage methods
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
};

// Export types
export type { FirebaseUser, UploadTaskSnapshot, UploadMetadata };

// Storage paths
export const STORAGE_PATHS = {
  EVENT_IMAGES: 'events',
  USER_AVATARS: 'avatars',
  TICKETS: 'tickets'
} as const;

// Collection names (for reference, not used with Data Connect)
export const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  BOOKINGS: 'bookings',
  CATEGORIES: 'categories',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications'
} as const;

// Helper to generate ticket ID
export const generateTicketId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomPart = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `EVT-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
};

// Helper to generate QR code data
export const generateQRCode = (eventId: string, bookingId: string): string => {
  return JSON.stringify({
    type: 'EVENTEASE_TICKET',
    eventId,
    bookingId,
    timestamp: Date.now()
  });
};

// Upload file to Firebase Storage
export const uploadFile = async (
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const storageRef = ref(storage, path);
  
  if (onProgress) {
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } else {
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }
};

// Delete file from Firebase Storage
export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

// Upload event image
export const uploadEventImage = async (
  eventId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const extension = file.name.split('.').pop();
  const path = `${STORAGE_PATHS.EVENT_IMAGES}/${eventId}.${extension}`;
  return uploadFile(path, file, onProgress);
};

// Upload user avatar
export const uploadUserAvatar = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const extension = file.name.split('.').pop();
  const path = `${STORAGE_PATHS.USER_AVATARS}/${userId}.${extension}`;
  return uploadFile(path, file, onProgress);
};

console.log('[Firebase] Initialized successfully for project:', firebaseConfig.projectId);
console.log('[Firebase] Using Cloud SQL via Data Connect');
