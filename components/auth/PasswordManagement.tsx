/**
 * Password Management Components
 * Components for password change, forgot password, and reset flows
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePasswordStrength } from '../../hooks/useAuth';
import { sendPasswordResetEmail, validateEmail } from '../../services/authService';
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
  getAuth
} from 'firebase/auth';

// ============================================================================
// PASSWORD STRENGTH INDICATOR
// ============================================================================

interface PasswordStrengthProps {
  password: string;
  showFeedback?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthProps> = ({ 
  password, 
  showFeedback = true 
}) => {
  const strength = usePasswordStrength(password);
  
  const getColor = () => {
    if (strength.score <= 1) return 'bg-red-500';
    if (strength.score <= 2) return 'bg-orange-500';
    if (strength.score <= 3) return 'bg-yellow-500';
    if (strength.score <= 4) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getLabel = () => {
    if (strength.score <= 1) return 'Weak';
    if (strength.score <= 2) return 'Fair';
    if (strength.score <= 3) return 'Good';
    if (strength.score <= 4) return 'Strong';
    return 'Very Strong';
  };

  if (!password) return null;

  return (
    <div className="mt-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor()} transition-all duration-300`}
            style={{ width: `${(strength.score / 6) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${strength.isStrong ? 'text-green-400' : 'text-slate-400'}`}>
          {getLabel()}
        </span>
      </div>
      
      {/* Feedback */}
      {showFeedback && strength.feedback.length > 0 && (
        <ul className="text-xs text-slate-500 space-y-0.5">
          {strength.feedback.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">circle</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ============================================================================
// FORGOT PASSWORD FORM
// ============================================================================

interface ForgotPasswordFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ 
  onBack, 
  onSuccess 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error || 'Invalid email');
      return;
    }

    setLoading(true);
    
    const result = await sendPasswordResetEmail(email);
    
    setLoading(false);
    
    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to send reset email');
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-green-400 text-3xl">mark_email_read</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
        <p className="text-slate-400 mb-6">
          We've sent a password reset link to<br />
          <span className="text-white font-medium">{email}</span>
        </p>
        <p className="text-sm text-slate-500 mb-6">
          Didn't receive the email? Check your spam folder or try again.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="text-primary hover:text-primaryLight font-medium"
          >
            ← Back to Login
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Forgot Password?</h3>
        <p className="text-slate-400 text-sm">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@teamfuture.in"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          required
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
            Sending...
          </span>
        ) : (
          'Send Reset Link'
        )}
      </button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Login
        </button>
      )}
    </form>
  );
};

// ============================================================================
// RESET PASSWORD FORM (for password reset link)
// ============================================================================

interface ResetPasswordFormProps {
  oobCode: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  oobCode,
  onSuccess,
  onError
}) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const strength = usePasswordStrength(password);

  // Verify the reset code on mount
  React.useEffect(() => {
    const verifyCode = async () => {
      try {
        const auth = getAuth();
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(verifiedEmail);
        setVerifying(false);
      } catch (err: any) {
        setError('This password reset link is invalid or has expired.');
        setVerifying(false);
        onError?.('Invalid or expired link');
      }
    };
    
    verifyCode();
  }, [oobCode, onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!strength.isStrong) {
      setError('Please choose a stronger password');
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('[Auth] Reset password error:', err);
      
      let errorMessage = 'Failed to reset password';
      if (err.code === 'auth/expired-action-code') {
        errorMessage = 'This reset link has expired. Please request a new one.';
      } else if (err.code === 'auth/invalid-action-code') {
        errorMessage = 'This reset link is invalid.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Verifying reset link...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Password Reset!</h3>
        <p className="text-slate-400 mb-6">
          Your password has been successfully reset.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryDark transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Invalid Link</h3>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryDark transition-colors"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
        <p className="text-slate-400 text-sm">
          Create a new password for<br />
          <span className="text-white font-medium">{email}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          New Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors pr-12"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <span className="material-symbols-outlined text-xl">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
        <PasswordStrengthIndicator password={password} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Confirm Password
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          required
          disabled={loading}
        />
        {confirmPassword && password !== confirmPassword && (
          <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !strength.isStrong || password !== confirmPassword}
        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
            Resetting...
          </span>
        ) : (
          'Reset Password'
        )}
      </button>
    </form>
  );
};

// ============================================================================
// CHANGE PASSWORD FORM (for authenticated users)
// ============================================================================

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = usePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (!strength.isStrong) {
      setError('Please choose a stronger password');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error('Not authenticated');
      }

      // Re-authenticate
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('[Auth] Change password error:', err);
      
      let errorMessage = 'Failed to change password';
      if (err.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      } else if (err.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in before changing your password';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Password Changed!</h3>
        <p className="text-slate-400 text-sm">
          Your password has been successfully updated.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Current Password
        </label>
        <input
          type={showPasswords ? 'text' : 'password'}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          New Password
        </label>
        <input
          type={showPasswords ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          required
          disabled={loading}
        />
        <PasswordStrengthIndicator password={newPassword} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Confirm New Password
        </label>
        <input
          type={showPasswords ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          required
          disabled={loading}
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-primary focus:ring-primary"
        />
        <span className="text-sm text-slate-400">Show passwords</span>
      </label>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !strength.isStrong || newPassword !== confirmPassword}
          className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Updating...
            </span>
          ) : (
            'Change Password'
          )}
        </button>
      </div>
    </form>
  );
};

// ============================================================================
// PASSWORD RESET PAGE
// ============================================================================

export const PasswordResetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const navigate = useNavigate();

  if (!oobCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-slate-800/50 rounded-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Invalid Link</h3>
            <p className="text-slate-400 mb-6">
              This password reset link is invalid or missing required parameters.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryDark transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-slate-800/50 rounded-2xl p-8 max-w-md w-full border border-slate-700">
        <ResetPasswordForm oobCode={oobCode} />
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
