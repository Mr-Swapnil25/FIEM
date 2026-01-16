/**
 * Authentication Components Index
 * Export all auth-related components
 */

// Protected Routes & Role-Based Access
export {
  ProtectedRoute,
  AdminRoute,
  StudentRoute,
  PublicOnlyRoute,
  RoleGate,
  AdminOnly,
  StudentOnly,
  useAuthGuard,
  useRequireAuth,
  useRole
} from './ProtectedRoute';

// Password Management
export {
  PasswordStrengthIndicator,
  ForgotPasswordForm,
  ResetPasswordForm,
  ChangePasswordForm,
  PasswordResetPage
} from './PasswordManagement';

// Email Verification
export {
  EmailVerificationPage,
  VerificationBanner,
  VerificationBadge
} from './EmailVerification';
