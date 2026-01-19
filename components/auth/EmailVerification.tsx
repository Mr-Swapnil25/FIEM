/**
 * Email Verification Component
 * Handles email verification flow and UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmailVerification } from '../../hooks/useAuth';
import { getCurrentUser } from '../../services/authService';

// ============================================================================
// EMAIL VERIFICATION PAGE
// ============================================================================

interface EmailVerificationProps {
  /** Called when verification is complete */
  onVerified?: () => void;
  /** Called when user wants to skip (if allowed) */
  onSkip?: () => void;
  /** Whether to allow skipping verification */
  allowSkip?: boolean;
  /** Custom redirect after verification */
  redirectTo?: string;
}

export const EmailVerificationPage: React.FC<EmailVerificationProps> = ({
  onVerified,
  onSkip,
  allowSkip = false,
  redirectTo
}) => {
  const navigate = useNavigate();
  const { 
    isVerified, 
    isChecking, 
    isSending, 
    error, 
    checkVerification, 
    sendVerification 
  } = useEmailVerification();
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState<string | null>(null);

  // Get current user email
  useEffect(() => {
    const user = getCurrentUser();
    if (user?.email) {
      setEmail(user.email);
    }
  }, []);

  // Check verification status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkVerification();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [checkVerification]);

  // Handle verification success
  useEffect(() => {
    if (isVerified) {
      onVerified?.();
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      }
    }
  }, [isVerified, onVerified, navigate, redirectTo]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    const success = await sendVerification();
    if (success) {
      setResendCooldown(60); // 60 second cooldown
    }
  };

  const handleRefresh = async () => {
    await checkVerification();
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="material-symbols-outlined text-green-400 text-4xl">verified</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
          <p className="text-slate-400">Your email has been successfully verified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 backdrop-blur-sm">
          {/* Icon */}
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-primary text-4xl">mail</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Verify Your Email
          </h2>
          
          {/* Description */}
          <p className="text-slate-400 text-center mb-6">
            We've sent a verification email to<br />
            <span className="text-white font-medium">{email || 'your email address'}</span>
          </p>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-medium text-white mb-2">Next Steps:</h4>
            <ol className="text-sm text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                Check your email inbox (and spam folder)
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                Click the verification link in the email
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                Return here - the page will update automatically
              </li>
            </ol>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {/* Resend Button */}
            <button
              onClick={handleResend}
              disabled={isSending || resendCooldown > 0}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">send</span>
                  Resend Verification Email
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isChecking}
              className="w-full py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  Checking...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">refresh</span>
                  I've Verified My Email
                </>
              )}
            </button>

            {/* Skip Button */}
            {allowSkip && onSkip && (
              <button
                onClick={onSkip}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Need help?{' '}
          <a href="mailto:support@teamfuture.in" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// VERIFICATION BANNER (for showing in dashboard)
// ============================================================================

interface VerificationBannerProps {
  onResend?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  onResend,
  onDismiss,
  className = ''
}) => {
  const { isVerified, isSending, sendVerification } = useEmailVerification();
  const [dismissed, setDismissed] = useState(false);
  const [resent, setResent] = useState(false);

  // Don't show if verified or dismissed
  if (isVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    const success = await sendVerification();
    if (success) {
      setResent(true);
      onResend?.();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-400 text-xl shrink-0 mt-0.5">
          warning
        </span>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-amber-400 font-medium mb-1">
            Verify Your Email
          </h4>
          <p className="text-sm text-slate-400">
            Please verify your email address to access all features.
            {resent && (
              <span className="text-green-400 ml-2">
                ✓ Verification email sent!
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResend}
            disabled={isSending || resent}
            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-sm font-medium rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            {isSending ? 'Sending...' : resent ? 'Sent!' : 'Resend'}
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VERIFICATION BADGE (small indicator)
// ============================================================================

interface VerificationBadgeProps {
  showUnverified?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  showUnverified = true,
  className = ''
}) => {
  const { isVerified } = useEmailVerification();

  if (isVerified) {
    return (
      <span 
        className={`inline-flex items-center gap-1 text-green-400 ${className}`}
        title="Email verified"
      >
        <span className="material-symbols-outlined text-sm">verified</span>
      </span>
    );
  }

  if (showUnverified) {
    return (
      <span 
        className={`inline-flex items-center gap-1 text-amber-400 ${className}`}
        title="Email not verified"
      >
        <span className="material-symbols-outlined text-sm">warning</span>
      </span>
    );
  }

  return null;
};

export default EmailVerificationPage;
