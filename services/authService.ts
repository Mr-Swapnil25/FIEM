/**
 * Firebase Authentication Service
 * Handles user authentication with institutional email validation
 * Uses Firebase Firestore for user profiles (migrated from DataConnect)
 * Email format: firstname.lastname.year.division@teamfuture.in
 */

import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile,
  FirebaseUser,
  isValidInstitutionalEmail,
  parseInstitutionalEmail,
  COLLECTIONS,
  GoogleAuthProvider,
  signInWithPopup
} from './firebase';
import { 
  getAuth,
  OAuthProvider
} from 'firebase/auth';
import { 
  getUserById as dcGetUserById, 
  getUserByEmail as dcGetUserByEmail,
  createUser as dcCreateUser,
  updateUser as dcUpdateUser
} from './backend';
import { User, Role } from '../types';

// Re-export types
export type UserRole = Role;

// ==================== TYPES ====================

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}

// Type guard for Firebase Auth errors
interface FirebaseAuthError {
  code: string;
  message: string;
}

function isFirebaseAuthError(error: unknown): error is FirebaseAuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as FirebaseAuthError).code === 'string' &&
    typeof (error as FirebaseAuthError).message === 'string'
  );
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (isFirebaseAuthError(error)) {
    return error.message || defaultMessage;
  }
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  return defaultMessage;
}

// ==================== AUTH STATE ====================

/**
 * Subscribe to authentication state changes
 * Uses Data Connect to fetch user profile from Cloud SQL
 */
export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Get user profile from Cloud SQL via Data Connect using email
        // (Schema uses auto-generated UUIDs, not Firebase UIDs)
        const userProfile = await dcGetUserByEmail(firebaseUser.email || '');
        
        if (userProfile) {
          // Return user profile with Firebase UID as the id for app consistency
          callback({ ...userProfile, id: firebaseUser.uid });
        } else {
          // User exists in Auth but not in database - create profile
          const emailParts = parseInstitutionalEmail(firebaseUser.email || '');
          const defaultName = emailParts 
            ? `${emailParts.firstName} ${emailParts.lastName}`
            : firebaseUser.displayName || 'User';
          
          const newUser: Omit<User, 'id'> = {
            email: firebaseUser.email || '',
            name: defaultName,
            role: 'student',
            department: emailParts?.department,
            createdAt: new Date().toISOString()
          };
          
          // Create user in Cloud SQL via Data Connect
          const createdUser = await dcCreateUser(firebaseUser.uid, newUser);
          callback(createdUser);
        }
      } catch (error) {
        console.error('[Auth] Error getting user profile:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Get current user profile from Cloud SQL
 */
export const getCurrentUserProfile = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || !firebaseUser.email) return null;
  
  try {
    const profile = await dcGetUserByEmail(firebaseUser.email);
    if (profile) {
      // Return with Firebase UID for app consistency
      return { ...profile, id: firebaseUser.uid };
    }
    return null;
  } catch (error) {
    console.error('[Auth] Error getting current user profile:', error);
    return null;
  }
};

// ==================== SIGN UP ====================

/**
 * Register a new user with institutional email
 * Creates user in Firebase Auth and Cloud SQL via Data Connect
 */
export const signUp = async (data: RegistrationData): Promise<AuthResult> => {
  try {
    // Validate institutional email
    if (!isValidInstitutionalEmail(data.email)) {
      return {
        success: false,
        error: 'Please use your institutional email (format: firstname.lastname.year.division@teamfuture.in)'
      };
    }
    
    // Create Firebase Auth user
    const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const firebaseUser = credential.user;
    
    // Parse email for additional context
    const emailParts = parseInstitutionalEmail(data.email);
    
    // Update display name in Firebase Auth
    await updateProfile(firebaseUser, { displayName: data.name });
    
    // Create user profile in Cloud SQL via Data Connect
    const userData: Omit<User, 'id'> = {
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      phone: data.phone,
      avatarUrl: data.avatar,
      department: emailParts?.department,
      createdAt: new Date().toISOString()
    };
    
    await dcCreateUser(firebaseUser.uid, userData);
    
    return {
      success: true,
      user: {
        id: firebaseUser.uid,
        ...userData
      }
    };
  } catch (error: unknown) {
    console.error('[Auth] Sign up error:', error);
    
    // Handle Firebase Auth errors
    let errorMessage = 'Failed to create account';
    
    if (isFirebaseAuthError(error)) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled';
          break;
        default:
          errorMessage = error.message || 'Failed to create account';
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// ==================== SIGN IN ====================

/**
 * Sign in with email and password
 * Fetches user profile from Cloud SQL via Data Connect
 */
// SECURITY: Simple rate limiting tracker (in production, use server-side rate limiting)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  // SECURITY: Check rate limiting
  const attempts = loginAttempts.get(normalizedEmail);
  const now = Date.now();
  
  if (attempts) {
    if (now - attempts.lastAttempt < LOCKOUT_DURATION && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const remainingTime = Math.ceil((LOCKOUT_DURATION - (now - attempts.lastAttempt)) / 60000);
      return {
        success: false,
        error: `Too many login attempts. Please try again in ${remainingTime} minutes.`
      };
    }
    // Reset if lockout period has passed
    if (now - attempts.lastAttempt >= LOCKOUT_DURATION) {
      loginAttempts.delete(normalizedEmail);
    }
  }

  try {
    // Validate institutional email
    const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@teamfuture.in';
    
    if (!normalizedEmail.endsWith(allowedDomain)) {
      return {
        success: false,
        error: `Please use your institutional email (${allowedDomain})`
      };
    }
    
    // Sign in with Firebase Auth
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const firebaseUser = credential.user;
    
    // Get user profile from Cloud SQL using email (schema uses auto-generated UUIDs)
    let userProfile = await dcGetUserByEmail(normalizedEmail);
    
    if (!userProfile) {
      // Create profile if doesn't exist
      const emailParts = parseInstitutionalEmail(normalizedEmail);
      const defaultName = emailParts
        ? `${emailParts.firstName} ${emailParts.lastName}`
        : firebaseUser.displayName || 'User';
      
      const newUserData: Omit<User, 'id'> = {
        email: normalizedEmail,
        name: defaultName,
        role: 'student',
        department: emailParts?.department,
        createdAt: new Date().toISOString()
      };
      
      userProfile = await dcCreateUser(firebaseUser.uid, newUserData);
    }
    
    // Return user profile with Firebase UID as the id for app consistency
    return {
      success: true,
      user: { ...userProfile, id: firebaseUser.uid }
    };
  } catch (error: unknown) {
    console.error('[Auth] Sign in error:', error);
    
    let errorMessage = 'Failed to sign in';
    
    if (isFirebaseAuthError(error)) {
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in';
      }
    }
    
    // SECURITY: Track failed login attempts
    const currentAttempts = loginAttempts.get(normalizedEmail);
    loginAttempts.set(normalizedEmail, {
      count: (currentAttempts?.count || 0) + 1,
      lastAttempt: Date.now()
    });
    
    return { success: false, error: errorMessage };
  }
};

// ==================== GOOGLE SIGN IN ====================

/**
 * Sign in with Google
 * Validates that the Google account uses institutional email
 */
export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const provider = new GoogleAuthProvider();
    // Request email scope
    provider.addScope('email');
    provider.addScope('profile');
    
    // Force account selection
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    
    // Validate institutional email
    const email = firebaseUser.email?.toLowerCase() || '';
    const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@teamfuture.in';
    
    if (!email.endsWith(allowedDomain)) {
      // Sign out if not institutional email
      await firebaseSignOut(auth);
      return {
        success: false,
        error: `Please use your institutional Google account (${allowedDomain})`
      };
    }
    
    // Check if user exists in database
    let userProfile = await dcGetUserByEmail(email);
    
    if (!userProfile) {
      // Create user profile
      const emailParts = parseInstitutionalEmail(email);
      const defaultName = firebaseUser.displayName || 
        (emailParts ? `${emailParts.firstName} ${emailParts.lastName}` : 'User');
      
      const newUserData: Omit<User, 'id'> = {
        email,
        name: defaultName,
        role: 'student',
        avatarUrl: firebaseUser.photoURL || undefined,
        department: emailParts?.department,
        createdAt: new Date().toISOString()
      };
      
      userProfile = await dcCreateUser(firebaseUser.uid, newUserData);
    }
    
    return {
      success: true,
      user: { ...userProfile, id: firebaseUser.uid }
    };
  } catch (error: unknown) {
    console.error('[Auth] Google sign in error:', error);
    
    let errorMessage = 'Failed to sign in with Google';
    
    if (isFirebaseAuthError(error)) {
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign in cancelled';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked. Please allow popups for this site.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in with Google';
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// ==================== APPLE SIGN IN ====================

/**
 * Sign in with Apple
 * Validates that the Apple account uses institutional email
 */
export const signInWithApple = async (): Promise<AuthResult> => {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    
    // Apple may hide the real email, check what we got
    const email = firebaseUser.email?.toLowerCase() || '';
    const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@teamfuture.in';
    
    // For Apple, the email might be a private relay email
    // We should check if it's a valid institutional email
    if (email && !email.endsWith(allowedDomain) && !email.includes('privaterelay.appleid.com')) {
      await firebaseSignOut(auth);
      return {
        success: false,
        error: `Please use your institutional Apple ID (${allowedDomain})`
      };
    }
    
    // If it's a private relay email, we'll allow it but note the limitation
    const isPrivateRelay = email.includes('privaterelay.appleid.com');
    
    // Check if user exists
    let userProfile = await dcGetUserByEmail(email);
    
    if (!userProfile) {
      // Create user profile
      const defaultName = firebaseUser.displayName || 'Apple User';
      
      const newUserData: Omit<User, 'id'> = {
        email,
        name: defaultName,
        role: 'student',
        avatarUrl: firebaseUser.photoURL || undefined,
        createdAt: new Date().toISOString()
      };
      
      userProfile = await dcCreateUser(firebaseUser.uid, newUserData);
    }
    
    // Add warning if using private relay
    if (isPrivateRelay) {
      console.warn('[Auth] User signed in with Apple private relay email');
    }
    
    return {
      success: true,
      user: { ...userProfile, id: firebaseUser.uid }
    };
  } catch (error: unknown) {
    console.error('[Auth] Apple sign in error:', error);
    
    let errorMessage = 'Failed to sign in with Apple';
    
    if (isFirebaseAuthError(error)) {
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign in cancelled';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked. Please allow popups for this site.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in with Apple';
      }
    }
    
    return { success: false, error: errorMessage };
  }
};
// ==================== SIGN OUT ====================

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('[Auth] Sign out error:', error);
    throw error;
  }
};

// ==================== PASSWORD RESET ====================

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string): Promise<AuthResult> => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: unknown) {
    console.error('[Auth] Password reset error:', error);
    
    let errorMessage = 'Failed to send reset email';
    
    if (isFirebaseAuthError(error)) {
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = error.message || 'Failed to send reset email';
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// ==================== PROFILE MANAGEMENT ====================

/**
 * Update user profile
 * Updates both Firebase Auth and Cloud SQL via Data Connect
 */
export const updateUserProfile = async (data: Partial<User>): Promise<AuthResult> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    // Update Firebase Auth display name if name changed
    if (data.name) {
      await updateProfile(firebaseUser, { displayName: data.name });
    }
    
    // Update profile in Cloud SQL via Data Connect
    await dcUpdateUser(firebaseUser.uid, data);
    
    // Get updated profile
    const updatedProfile = await dcGetUserById(firebaseUser.uid);
    
    return { success: true, user: updatedProfile || undefined };
  } catch (error: unknown) {
    console.error('[Auth] Update profile error:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to update profile') };
  }
};

// ==================== UTILITIES ====================

/**
 * Check if email is valid institutional format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@teamfuture.in';
  
  if (!email.toLowerCase().endsWith(allowedDomain)) {
    return { valid: false, error: `Please use your institutional email (${allowedDomain})` };
  }
  
  if (!isValidInstitutionalEmail(email)) {
    return { valid: false, error: 'Invalid email format. Use: firstname.lastname.year.division@teamfuture.in' };
  }
  
  return { valid: true };
};

/**
 * Get user role from Cloud SQL
 */
export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const user = await dcGetUserById(userId);
    return user?.role || null;
  } catch (error) {
    console.error('[Auth] Error getting user role:', error);
    return null;
  }
};

// Export auth instance for direct access if needed
export { auth };
