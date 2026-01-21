/// <reference types="vite/client" />

/**
 * Vite Environment Variables Type Definitions
 * All environment variables must be prefixed with VITE_ to be exposed to client code
 * 
 * Last updated: 2026-01-16 (Environment Variables Audit)
 */
interface ImportMetaEnv {
  // ============================================
  // Firebase Core Configuration
  // ============================================
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;

  // QR Code Security
  readonly VITE_QR_SECRET_KEY?: string;
  readonly VITE_APP_CHECK_KEY?: string;

  // ============================================
  // Firestore Configuration
  // ============================================
  readonly VITE_FIRESTORE_PERSISTENCE: string;

  // ============================================
  // Email Domain Restriction
  // ============================================
  readonly VITE_ALLOWED_EMAIL_DOMAIN: string;

  // ============================================
  // Development / Emulator Settings
  // ============================================
  readonly VITE_USE_EMULATOR: string;
  readonly VITE_EMULATOR_AUTH_PORT: string;
  readonly VITE_EMULATOR_FIRESTORE_PORT: string;
  readonly VITE_EMULATOR_STORAGE_PORT: string;
  readonly VITE_EMULATOR_FUNCTIONS_PORT: string;

  // ============================================
  // Feature Flags
  // ============================================
  readonly VITE_ENABLE_GOOGLE_SIGNIN: string;
  readonly VITE_ENABLE_APPLE_SIGNIN: string;
  readonly VITE_ENABLE_QR_TICKETS: string;
  readonly VITE_ENABLE_REVIEWS: string;
  readonly VITE_ENABLE_PAYMENTS: string;

  // ============================================
  // Logging & Debugging
  // ============================================
  readonly VITE_DEBUG_FIREBASE: string;
  readonly VITE_DEBUG_DATACONNECT: string;

  // ============================================
  // Vite Built-in Variables
  // ============================================
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
