/// <reference types="vite/client" />

/**
 * Vite Environment Variables Type Definitions
 * All environment variables must be prefixed with VITE_ to be exposed to client code
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_ALLOWED_EMAIL_DOMAIN: string;
  readonly VITE_DATACONNECT_LOCATION: string;
  readonly VITE_DATACONNECT_SERVICE_ID: string;
  readonly VITE_USE_EMULATOR: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
