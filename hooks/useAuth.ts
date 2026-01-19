/**
 * Authentication Hooks
 * Provides React hooks for authentication state and operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  onAuthStateChanged,
  signIn,
  signUp,
  signOut,
  sendPasswordResetEmail,
  validateEmail,
  getCurrentUser,
  signInWithGoogle,
  signInWithApple,
  AuthResult,
  RegistrationData
} from '../services/authService';
import {
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reload
} from 'firebase/auth';
import { User, Role } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  // Auth operations
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegistrationData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<AuthResult>;
  loginWithApple: () => Promise<AuthResult>;
  
  // Password operations
  resetPassword: (email: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  
  // Email verification
  sendVerificationEmail: () => Promise<AuthResult>;
  refreshEmailVerification: () => Promise<void>;
  
  // Session management
  refreshSession: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  
  // Utilities
  clearError: () => void;
  updateUserProfile: (user: User) => void;
}

export interface SessionInfo {
  isValid: boolean;
  expiresAt: Date | null;
  lastActivity: Date | null;
  token: string | null;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
const SESSION_KEY = 'eventease_session';
const LAST_ACTIVITY_KEY = 'eventease_last_activity';

/**
 * Get session info from localStorage
 */
const getStoredSession = (): { lastActivity: number } | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Update last activity timestamp
 */
const updateLastActivity = () => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      lastActivity: Date.now()
    }));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear session data
 */
const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Check if session has timed out
 */
const isSessionExpired = (): boolean => {
  const session = getStoredSession();
  if (!session) return false; // No session tracking = no timeout
  
  const elapsed = Date.now() - session.lastActivity;
  return elapsed > SESSION_TIMEOUT;
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useAuthState - Core authentication state hook
 * 
 * Manages authentication state with Firebase Auth
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    firebaseUser: null,
    isLoading: true,
    isAuthenticated: false,
    isEmailVerified: false,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      const firebaseUser = getCurrentUser();
      
      setState({
        user,
        firebaseUser,
        isLoading: false,
        isAuthenticated: !!user,
        isEmailVerified: firebaseUser?.emailVerified ?? false,
        error: null
      });

      // Update session activity
      if (user) {
        updateLastActivity();
      } else {
        clearSession();
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
}

/**
 * useAuth - Full authentication hook with all operations
 */
export function useAuthOperations(
  user: User | null,
  setUser: (user: User | null) => void
): Omit<UseAuthReturn, keyof AuthState> {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setError(null);
    const result = await signIn(email, password);
    
    if (result.success && result.user) {
      updateLastActivity();
      // Redirect to intended page or role-based dashboard
      const from = (location.state as any)?.from?.pathname;
      const defaultPath = result.user.role === 'admin' ? '/admin/dashboard' : '/student/home';
      navigate(from || defaultPath, { replace: true });
    } else {
      setError(result.error || 'Login failed');
    }
    
    return result;
  }, [navigate, location]);

  // Register new user
  const register = useCallback(async (data: RegistrationData): Promise<AuthResult> => {
    setError(null);
    const result = await signUp(data);
    
    if (result.success && result.user) {
      updateLastActivity();
      // Send verification email
      const firebaseUser = getCurrentUser();
      if (firebaseUser && !firebaseUser.emailVerified) {
        try {
          await sendEmailVerification(firebaseUser);
        } catch (e) {
          console.warn('[Auth] Failed to send verification email:', e);
        }
      }
      
      // Redirect based on role
      const defaultPath = result.user.role === 'admin' ? '/admin/dashboard' : '/student/home';
      navigate(defaultPath, { replace: true });
    } else {
      setError(result.error || 'Registration failed');
    }
    
    return result;
  }, [navigate]);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    await signOut();
    clearSession();
    navigate('/login', { replace: true });
  }, [navigate]);

  // Google login
  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setError(null);
    const result = await signInWithGoogle();
    
    if (result.success && result.user) {
      updateLastActivity();
      const defaultPath = result.user.role === 'admin' ? '/admin/dashboard' : '/student/home';
      navigate(defaultPath, { replace: true });
    } else {
      setError(result.error || 'Google login failed');
    }
    
    return result;
  }, [navigate]);

  // Apple login
  const loginWithApple = useCallback(async (): Promise<AuthResult> => {
    setError(null);
    const result = await signInWithApple();
    
    if (result.success && result.user) {
      updateLastActivity();
      const defaultPath = result.user.role === 'admin' ? '/admin/dashboard' : '/student/home';
      navigate(defaultPath, { replace: true });
    } else {
      setError(result.error || 'Apple login failed');
    }
    
    return result;
  }, [navigate]);

  // Reset password
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    setError(null);
    const result = await sendPasswordResetEmail(email);
    
    if (!result.success) {
      setError(result.error || 'Failed to send reset email');
    }
    
    return result;
  }, []);

  // Change password
  const changePassword = useCallback(async (
    currentPassword: string, 
    newPassword: string
  ): Promise<AuthResult> => {
    setError(null);
    const firebaseUser = getCurrentUser();
    
    if (!firebaseUser || !firebaseUser.email) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Update password
      await updatePassword(firebaseUser, newPassword);
      
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Change password error:', error);
      
      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in before changing your password';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Send verification email
  const sendVerificationEmail = useCallback(async (): Promise<AuthResult> => {
    const firebaseUser = getCurrentUser();
    
    if (!firebaseUser) {
      return { success: false, error: 'Not authenticated' };
    }

    if (firebaseUser.emailVerified) {
      return { success: true };
    }

    try {
      await sendEmailVerification(firebaseUser);
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Send verification email error:', error);
      
      let errorMessage = 'Failed to send verification email';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait before trying again.';
      }
      
      return { success: false, error: errorMessage };
    }
  }, []);

  // Refresh email verification status
  const refreshEmailVerification = useCallback(async (): Promise<void> => {
    const firebaseUser = getCurrentUser();
    if (firebaseUser) {
      await reload(firebaseUser);
    }
  }, []);

  // Refresh session / token
  const refreshSession = useCallback(async (): Promise<void> => {
    const firebaseUser = getCurrentUser();
    if (firebaseUser) {
      await firebaseUser.getIdToken(true);
      updateLastActivity();
    }
  }, []);

  // Get ID token
  const getIdToken = useCallback(async (): Promise<string | null> => {
    const firebaseUser = getCurrentUser();
    if (firebaseUser) {
      return firebaseUser.getIdToken();
    }
    return null;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update user profile in state
  const updateUserProfile = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, [setUser]);

  return {
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithApple,
    resetPassword,
    changePassword,
    sendVerificationEmail,
    refreshEmailVerification,
    refreshSession,
    getIdToken,
    clearError,
    updateUserProfile
  };
}

/**
 * useSessionMonitor - Monitor session activity and handle timeouts
 */
export function useSessionMonitor(onSessionExpired?: () => void) {
  const { user } = useAuthState();
  
  useEffect(() => {
    if (!user) return;

    // Set up activity listeners
    const handleActivity = () => {
      updateLastActivity();
    };

    // Track user activity
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('mousemove', handleActivity);

    // Check for session expiry periodically
    const checkInterval = setInterval(() => {
      if (isSessionExpired()) {
        onSessionExpired?.();
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      clearInterval(checkInterval);
    };
  }, [user, onSessionExpired]);
}

/**
 * useEmailVerification - Hook for email verification flow
 */
export function useEmailVerification() {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check verification status
  const checkVerification = useCallback(async () => {
    setIsChecking(true);
    const firebaseUser = getCurrentUser();
    
    if (firebaseUser) {
      await reload(firebaseUser);
      setIsVerified(firebaseUser.emailVerified);
    }
    
    setIsChecking(false);
  }, []);

  // Send verification email
  const sendVerification = useCallback(async () => {
    setIsSending(true);
    setError(null);
    
    const firebaseUser = getCurrentUser();
    
    if (!firebaseUser) {
      setError('Not authenticated');
      setIsSending(false);
      return false;
    }

    try {
      await sendEmailVerification(firebaseUser);
      setIsSending(false);
      return true;
    } catch (e: any) {
      setError(e.code === 'auth/too-many-requests' 
        ? 'Too many requests. Please wait.' 
        : 'Failed to send email');
      setIsSending(false);
      return false;
    }
  }, []);

  // Initial check
  useEffect(() => {
    const firebaseUser = getCurrentUser();
    if (firebaseUser) {
      setIsVerified(firebaseUser.emailVerified);
    }
  }, []);

  return {
    isVerified,
    isChecking,
    isSending,
    error,
    checkVerification,
    sendVerification
  };
}

/**
 * usePasswordStrength - Validate password strength
 */
export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const result = {
      score: 0,
      feedback: [] as string[],
      isStrong: false
    };

    if (!password) return result;

    // Length check
    if (password.length >= 8) result.score++;
    else result.feedback.push('At least 8 characters');

    if (password.length >= 12) result.score++;

    // Lowercase check
    if (/[a-z]/.test(password)) result.score++;
    else result.feedback.push('Add lowercase letters');

    // Uppercase check
    if (/[A-Z]/.test(password)) result.score++;
    else result.feedback.push('Add uppercase letters');

    // Number check
    if (/[0-9]/.test(password)) result.score++;
    else result.feedback.push('Add numbers');

    // Special character check
    if (/[^a-zA-Z0-9]/.test(password)) result.score++;
    else result.feedback.push('Add special characters');

    result.isStrong = result.score >= 4;

    return result;
  }, [password]);
}

export default useAuthState;
