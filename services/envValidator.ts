/**
 * Environment Configuration Validator
 * 
 * Validates all required environment variables at application startup
 * Provides clear error messages and graceful degradation
 */

// ============================================================================
// ENVIRONMENT VARIABLE DEFINITIONS
// ============================================================================

interface EnvConfig {
  key: string;
  required: boolean;
  default?: string;
  validator?: (value: string) => boolean;
  description: string;
  sensitive?: boolean;
}

const ENV_SCHEMA: EnvConfig[] = [
  // Firebase Core (REQUIRED)
  {
    key: 'VITE_FIREBASE_API_KEY',
    required: true,
    description: 'Firebase Web API Key',
    sensitive: true,
    validator: (v) => v.length > 20 && v.startsWith('AIza')
  },
  {
    key: 'VITE_FIREBASE_AUTH_DOMAIN',
    required: true,
    description: 'Firebase Auth Domain',
    validator: (v) => v.includes('.firebaseapp.com')
  },
  {
    key: 'VITE_FIREBASE_PROJECT_ID',
    required: true,
    description: 'Firebase Project ID',
    validator: (v) => v.length > 3 && /^[a-z0-9-]+$/.test(v)
  },
  {
    key: 'VITE_FIREBASE_STORAGE_BUCKET',
    required: true,
    description: 'Firebase Storage Bucket',
    validator: (v) => v.includes('.appspot.com') || v.includes('.firebasestorage.app')
  },
  {
    key: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    required: true,
    description: 'Firebase Messaging Sender ID',
    validator: (v) => /^\d+$/.test(v) && v.length > 5
  },
  {
    key: 'VITE_FIREBASE_APP_ID',
    required: true,
    description: 'Firebase App ID',
    validator: (v) => v.includes(':web:')
  },
  
  // Firebase Optional
  {
    key: 'VITE_FIREBASE_MEASUREMENT_ID',
    required: false,
    description: 'Firebase Analytics Measurement ID',
    validator: (v) => v.startsWith('G-')
  },
  
  // Data Connect
  {
    key: 'VITE_DATACONNECT_LOCATION',
    required: false,
    default: 'asia-south1',
    description: 'Data Connect Service Location',
    validator: (v) => /^[a-z]+-[a-z]+\d*$/.test(v)
  },
  {
    key: 'VITE_DATACONNECT_SERVICE_ID',
    required: false,
    default: 'fiem-project',
    description: 'Data Connect Service ID'
  },
  
  // Application Config
  {
    key: 'VITE_ALLOWED_EMAIL_DOMAIN',
    required: false,
    default: '@teamfuture.in',
    description: 'Allowed Email Domain for Registration',
    validator: (v) => v.startsWith('@') && v.includes('.')
  },
  
  // Development
  {
    key: 'VITE_USE_EMULATOR',
    required: false,
    default: 'false',
    description: 'Use Firebase Emulators',
    validator: (v) => v === 'true' || v === 'false'
  }
];

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationError {
  key: string;
  message: string;
  required: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  config: Record<string, string>;
}

// ============================================================================
// ENVIRONMENT VALIDATOR
// ============================================================================

/**
 * Validates all environment variables against the schema
 */
export function validateEnvironment(): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const config: Record<string, string> = {};
  
  for (const envConfig of ENV_SCHEMA) {
    const value = import.meta.env[envConfig.key] as string | undefined;
    const effectiveValue = value || envConfig.default;
    
    // Check if required variable is missing
    if (envConfig.required && !effectiveValue) {
      errors.push({
        key: envConfig.key,
        message: `Missing required environment variable: ${envConfig.description}`,
        required: true
      });
      continue;
    }
    
    // Check if optional variable is missing (warning only)
    if (!envConfig.required && !effectiveValue) {
      warnings.push({
        key: envConfig.key,
        message: `Optional environment variable not set: ${envConfig.description}. Using default: ${envConfig.default || 'none'}`,
        required: false
      });
    }
    
    // Validate format if validator provided
    if (effectiveValue && envConfig.validator && !envConfig.validator(effectiveValue)) {
      const errorItem = {
        key: envConfig.key,
        message: `Invalid format for ${envConfig.key}: ${envConfig.description}`,
        required: envConfig.required
      };
      
      if (envConfig.required) {
        errors.push(errorItem);
      } else {
        warnings.push(errorItem);
      }
    }
    
    // Store validated value
    if (effectiveValue) {
      config[envConfig.key] = effectiveValue;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * Get a validated environment variable
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (value) return value;
  if (defaultValue !== undefined) return defaultValue;
  
  // Find in schema for better error message
  const schema = ENV_SCHEMA.find(e => e.key === key);
  if (schema?.default) return schema.default;
  
  console.warn(`[Env] Missing environment variable: ${key}`);
  return '';
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Check if running in production mode
 */
export function isProd(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Check if emulators should be used
 */
export function useEmulator(): boolean {
  return isDev() && getEnv('VITE_USE_EMULATOR', 'false') === 'true';
}

// ============================================================================
// STARTUP VALIDATION
// ============================================================================

let validationRan = false;
let cachedResult: ValidationResult | null = null;

/**
 * Run validation once at startup
 * Call this from your main entry point (index.tsx or App.tsx)
 */
export function runStartupValidation(): ValidationResult {
  if (validationRan && cachedResult) {
    return cachedResult;
  }
  
  const result = validateEnvironment();
  cachedResult = result;
  validationRan = true;
  
  // Log results to console
  if (result.errors.length > 0) {
    console.error('❌ [ENV] Configuration Errors:');
    result.errors.forEach(err => {
      console.error(`   - ${err.key}: ${err.message}`);
    });
  }
  
  if (result.warnings.length > 0 && isDev()) {
    console.warn('⚠️ [ENV] Configuration Warnings:');
    result.warnings.forEach(warn => {
      console.warn(`   - ${warn.key}: ${warn.message}`);
    });
  }
  
  if (result.valid) {
    console.log('✅ [ENV] All required environment variables validated');
  }
  
  return result;
}

/**
 * Get the cached validation result
 */
export function getValidationResult(): ValidationResult | null {
  return cachedResult;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateEnvironment,
  runStartupValidation,
  getValidationResult,
  getEnv,
  isDev,
  isProd,
  useEmulator
};
