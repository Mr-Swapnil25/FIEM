/**
 * Protected Route Components
 * Implements route guards with role-based access control
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';
import { Role } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required roles to access this route. If empty, any authenticated user can access */
  allowedRoles?: Role[];
  /** Redirect path if not authenticated */
  authRedirect?: string;
  /** Redirect path if authenticated but wrong role */
  roleRedirect?: string;
  /** Whether email verification is required */
  requireVerified?: boolean;
  /** Loading component to show while checking auth */
  loadingComponent?: React.ReactNode;
}

interface AuthGuardResult {
  allowed: boolean;
  reason: 'authenticated' | 'not-authenticated' | 'wrong-role' | 'not-verified' | 'loading';
  redirect?: string;
}

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const DefaultLoadingComponent = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="text-slate-400 text-sm">Verifying access...</p>
    </div>
  </div>
);

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

/**
 * ProtectedRoute - Route guard component
 * 
 * Usage:
 * <ProtectedRoute allowedRoles={['admin']}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  authRedirect = '/login',
  roleRedirect,
  requireVerified = false,
  loadingComponent
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth state
  if (isLoading) {
    return <>{loadingComponent || <DefaultLoadingComponent />}</>;
  }

  // Check if user is authenticated
  if (!user) {
    // Save the attempted URL for redirect after login
    return <Navigate to={authRedirect} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // User is authenticated but doesn't have the required role
    const defaultRoleRedirect = user.role === 'admin' ? '/admin/dashboard' : '/student/home';
    return <Navigate to={roleRedirect || defaultRoleRedirect} replace />;
  }

  // Check email verification (if required)
  // Note: This would need to be implemented in the auth context
  // if (requireVerified && !user.emailVerified) {
  //   return <Navigate to="/verify-email" replace />;
  // }

  // All checks passed, render children
  return <>{children}</>;
};

// ============================================================================
// ROLE-SPECIFIC ROUTE COMPONENTS
// ============================================================================

/**
 * AdminRoute - Only allows admin users
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute 
    allowedRoles={['admin']} 
    roleRedirect="/student/home"
  >
    {children}
  </ProtectedRoute>
);

/**
 * StudentRoute - Only allows student users
 */
export const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute 
    allowedRoles={['student']} 
    roleRedirect="/admin/dashboard"
  >
    {children}
  </ProtectedRoute>
);

/**
 * PublicOnlyRoute - Only allows unauthenticated users (e.g., login page)
 */
export const PublicOnlyRoute: React.FC<{ 
  children: React.ReactNode;
  redirectTo?: string;
}> = ({ children, redirectTo }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DefaultLoadingComponent />;
  }

  if (user) {
    const defaultRedirect = user.role === 'admin' ? '/admin/dashboard' : '/student/home';
    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  return <>{children}</>;
};

// ============================================================================
// HOOKS FOR PROGRAMMATIC ACCESS
// ============================================================================

/**
 * useAuthGuard - Hook to check auth status programmatically
 * 
 * Usage:
 * const { isAllowed, reason } = useAuthGuard(['admin']);
 */
export const useAuthGuard = (allowedRoles: Role[] = []): AuthGuardResult => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return { allowed: false, reason: 'loading' };
  }

  if (!user) {
    return { allowed: false, reason: 'not-authenticated', redirect: '/login' };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const defaultRedirect = user.role === 'admin' ? '/admin/dashboard' : '/student/home';
    return { allowed: false, reason: 'wrong-role', redirect: defaultRedirect };
  }

  return { allowed: true, reason: 'authenticated' };
};

/**
 * useRequireAuth - Hook that redirects if not authenticated
 * 
 * Usage:
 * useRequireAuth(); // In a component that requires auth
 */
export const useRequireAuth = (allowedRoles: Role[] = []) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/login');

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setShouldRedirect(true);
        setRedirectTo('/login');
      } else if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        setShouldRedirect(true);
        setRedirectTo(user.role === 'admin' ? '/admin/dashboard' : '/student/home');
      }
    }
  }, [user, isLoading, allowedRoles]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasAccess: user ? (allowedRoles.length === 0 || allowedRoles.includes(user.role)) : false,
    shouldRedirect,
    redirectTo,
    from: location.pathname
  };
};

/**
 * useRole - Hook to check user role
 */
export const useRole = () => {
  const { user } = useAuth();
  
  return {
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    hasRole: (role: Role) => user?.role === role,
    hasAnyRole: (roles: Role[]) => user ? roles.includes(user.role) : false
  };
};

// ============================================================================
// ROLE-BASED UI COMPONENTS
// ============================================================================

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
}

/**
 * RoleGate - Conditionally render content based on role
 * 
 * Usage:
 * <RoleGate allowedRoles={['admin']}>
 *   <AdminOnlyButton />
 * </RoleGate>
 */
export const RoleGate: React.FC<RoleGateProps> = ({ 
  children, 
  allowedRoles, 
  fallback = null 
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * AdminOnly - Only render for admin users
 */
export const AdminOnly: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ children, fallback }) => (
  <RoleGate allowedRoles={['admin']} fallback={fallback}>
    {children}
  </RoleGate>
);

/**
 * StudentOnly - Only render for student users
 */
export const StudentOnly: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ children, fallback }) => (
  <RoleGate allowedRoles={['student']} fallback={fallback}>
    {children}
  </RoleGate>
);

export default ProtectedRoute;
