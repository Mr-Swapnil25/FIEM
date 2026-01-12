/**
 * Firebase Authentication Service
 * Handles user authentication with institutional email validation
 * Uses Firebase Data Connect with Cloud SQL PostgreSQL for user profiles
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
  COLLECTIONS
} from './firebase';
import { 
  getUserById as dcGetUserById, 
  createUser as dcCreateUser,
  updateUser as dcUpdateUser
} from './dataConnectService';
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

// ==================== AUTH STATE ====================

/**
 * Subscribe to authentication state changes
 * Uses Data Connect to fetch user profile from Cloud SQL
 */
export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Get user profile from Cloud SQL via Data Connect
        const userProfile = await dcGetUserById(firebaseUser.uid);
        
        if (userProfile) {
          callback(userProfile);
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
            department: emailParts?.department
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
  if (!firebaseUser) return null;
  
  try {
    return await dcGetUserById(firebaseUser.uid);
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
      department: emailParts?.department
    };
    
    await dcCreateUser(firebaseUser.uid, userData);
    
    return {
      success: true,
      user: {
        id: firebaseUser.uid,
        ...userData
      }
    };
  } catch (error: any) {
    console.error('[Auth] Sign up error:', error);
    
    // Handle Firebase Auth errors
    let errorMessage = 'Failed to create account';
    
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
    
    // Get user profile from Cloud SQL
    let userProfile = await dcGetUserById(firebaseUser.uid);
    
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
        department: emailParts?.department
      };
      
      userProfile = await dcCreateUser(firebaseUser.uid, newUserData);
    }
    
    return {
      success: true,
      user: userProfile
    };
  } catch (error: any) {
    console.error('[Auth] Sign in error:', error);
    
    let errorMessage = 'Failed to sign in';
    
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
    
    // SECURITY: Track failed login attempts
    const currentAttempts = loginAttempts.get(normalizedEmail);
    loginAttempts.set(normalizedEmail, {
      count: (currentAttempts?.count || 0) + 1,
      lastAttempt: Date.now()
    });
    
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
  } catch (error: any) {
    console.error('[Auth] Password reset error:', error);
    
    let errorMessage = 'Failed to send reset email';
    
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
  } catch (error: any) {
    console.error('[Auth] Update profile error:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
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
