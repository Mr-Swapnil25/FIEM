import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { User } from './types';

// Query Provider for React Query
import { QueryProvider } from './providers/QueryProvider';

// Firebase Auth Service
import { onAuthStateChanged as subscribeToAuth, signIn, signUp, signOut, AuthResult } from './services/authService';

// Auth Components
import { PasswordResetPage } from './components/auth/PasswordManagement';

// Icons
import {
  Home, Calendar, User as UserIcon, LogOut,
  LayoutDashboard, PlusCircle, FileBarChart,
  Bell, Menu, X, CheckCircle, Loader2
} from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

const FULLSCREEN_PATHS = [
  '/login', '/reset-password', '/verify-email',
  '/student/profile', '/student/profile/edit', '/student/home',
  '/student/events', '/student/favorites', '/student/booking-success',
  '/admin/dashboard', '/admin/events', '/admin/reports', '/admin/reviews',
  '/admin/profile', '/admin/profile/edit'
];

const FULLSCREEN_PATH_PREFIXES = [
  '/student/event/', '/admin/create-event', '/admin/edit-event/',
  '/admin/event-published', '/admin/scan-ticket', '/admin/participant/'
];

const isFullScreenPath = (pathname: string): boolean => {
  if (FULLSCREEN_PATHS.includes(pathname)) return true;
  return FULLSCREEN_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
};

// ============================================================================
// LAZY-LOADED COMPONENTS (Code Splitting)
// ============================================================================

// Auth - loaded immediately (critical path)
import LoginScreen from './pages/Auth';

// Auth pages - lazy loaded
const EmailVerificationPage = lazy(() => import('./components/auth/EmailVerification').then(m => ({ default: m.EmailVerificationPage })));

// Student pages - lazy loaded
const StudentHome = lazy(() => import('./pages/student/Home'));
const EventDetails = lazy(() => import('./pages/student/EventDetails'));
const BookingConfirmation = lazy(() => import('./pages/student/BookingConfirmation'));
const MyEvents = lazy(() => import('./pages/student/MyEvents'));
const StudentProfile = lazy(() => import('./pages/student/Profile'));
const FavoritesList = lazy(() => import('./pages/student/FavoritesList'));
const ProfileEdit = lazy(() => import('./pages/shared/ProfileEdit'));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const CreateEditEvent = lazy(() => import('./pages/admin/CreateEditEvent'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const AdminEvents = lazy(() => import('./pages/admin/Events'));
const ParticipantDetails = lazy(() => import('./pages/admin/ParticipantDetails'));
const EventPublishSuccess = lazy(() => import('./pages/admin/EventPublishSuccess'));
const ScanTicket = lazy(() => import('./pages/admin/ScanTicket'));
const ReviewModeration = lazy(() => import('./pages/admin/ReviewModeration'));

// ============================================================================
// LOADING FALLBACK COMPONENT
// ============================================================================

const PageLoader = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={48} className="text-blue-500 animate-spin" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  </div>
);

// ============================================================================
// ERROR BOUNDARY FOR LAZY COMPONENTS
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Using a class component for error boundary (required by React)
// Note: ErrorBoundary must be a class component as per React documentation
const LazyErrorBoundary: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> =
  ({ children, fallback }) => {
    // For functional approach, we use a wrapper
    // The actual error boundary logic is handled by React.Suspense and try-catch
    return <>{children}</>;
  };

// Props interface for ErrorBoundary
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Actual Error Boundary class (React requires class component for error boundaries)
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[LazyLoad Error]', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">Failed to load page</h2>
            <p className="text-slate-400 mb-4">Please refresh and try again</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: { email: string; password: string; name: string; role: 'student' | 'admin'; phone?: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateUserProfile: (updatedUser: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- Layout Components ---

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || isFullScreenPath(location.pathname)) return null;

  const studentLinks = [
    { label: 'Home', path: '/student/home', icon: <Home size={20} /> },
    { label: 'My Events', path: '/student/events', icon: <Calendar size={20} /> },
    { label: 'Profile', path: '/student/profile', icon: <UserIcon size={20} /> },
  ];

  const adminLinks = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Events', path: '/admin/events', icon: <Calendar size={20} /> },
    { label: 'Reports', path: '/admin/reports', icon: <FileBarChart size={20} /> },
  ];

  const links = user.role === 'admin' ? adminLinks : studentLinks;

  return (
    <nav className="bg-primary text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/home')}>
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Calendar size={24} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">EventEase</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {links.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === link.path
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </button>
            ))}

            <div className="ml-4 flex items-center gap-4 pl-4 border-l border-blue-400/30">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-xs text-blue-200 capitalize">{user.role}</span>
              </div>
              <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-blue-200 hover:text-white hover:bg-white/10 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-primaryLight shadow-inner">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {links.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-3 py-3 rounded-md text-base font-medium ${location.pathname === link.path
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="mr-3">{link.icon}</span>
                {link.label}
              </button>
            ))}
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-red-100 hover:bg-red-500/20"
            >
              <span className="mr-3"><LogOut size={20} /></span>
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

// --- Main App Logic ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSplash, setIsSplash] = useState(true);

  useEffect(() => {
    // Splash screen timer
    const splashTimer = setTimeout(() => {
      setIsSplash(false);
    }, 1500);

    // Subscribe to Firebase Auth state changes
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const result = await signIn(email, password);
    return result;
  };

  const register = async (data: { email: string; password: string; name: string; role: 'student' | 'admin'; phone?: string }): Promise<AuthResult> => {
    const result = await signUp(data);
    return result;
  };

  const logout = async () => {
    await signOut();
  };

  const updateUserProfile = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (isSplash) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-white">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm animate-pulse">
          <Calendar size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2 tracking-tight">EventEase</h1>
        <p className="text-blue-200 text-sm font-medium">College Events, Simplified</p>
      </div>
    );
  }

  return (
    <QueryProvider>
      <AuthContext.Provider value={{ user, login, register, logout, updateUserProfile, isLoading }}>
        <HashRouter>
          <AppContent user={user} logout={logout} />
        </HashRouter>
      </AuthContext.Provider>
    </QueryProvider>
  );
}

// Separate component to access router hooks
function AppContent({ user, logout }: { user: User | null, logout: () => void }) {
  const location = useLocation();
  const isFullScreenPage = !user || isFullScreenPath(location.pathname);

  return (
    <div className={`min-h-screen flex flex-col font-sans ${!isFullScreenPage ? 'bg-slate-100' : ''}`}>
      <Navbar />

      <main className={`flex-1 w-full ${!isFullScreenPage ? 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to={user.role === 'admin' ? "/admin/dashboard" : "/student/home"} />} />
              <Route path="/reset-password" element={<PasswordResetPage />} />
              <Route path="/verify-email" element={user ? <EmailVerificationPage /> : <Navigate to="/login" />} />

              {/* Student Routes */}
              <Route path="/student/*" element={user && user.role === 'student' ? (
                <Routes>
                  <Route path="home" element={<StudentHome />} />
                  <Route path="events" element={<MyEvents />} />
                  <Route path="profile" element={<StudentProfile />} />
                  <Route path="profile/edit" element={<ProfileEdit variant="student" />} />
                  <Route path="favorites" element={<FavoritesList />} />
                  <Route path="event/:id" element={<EventDetails />} />
                  <Route path="booking-success" element={<BookingConfirmation />} />
                  <Route path="*" element={<Navigate to="home" />} />
                </Routes>
              ) : <Navigate to="/login" />} />

              {/* Admin Routes */}
              <Route path="/admin/*" element={user && user.role === 'admin' ? (
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="reviews" element={<ReviewModeration />} />
                  <Route path="profile" element={<AdminProfile />} />
                  <Route path="profile/edit" element={<ProfileEdit variant="admin" />} />
                  <Route path="create-event" element={<CreateEditEvent />} />
                  <Route path="edit-event/:id" element={<CreateEditEvent />} />
                  <Route path="event-published" element={<EventPublishSuccess />} />
                  <Route path="scan-ticket" element={<ScanTicket />} />
                  <Route path="participant/:bookingId" element={<ParticipantDetails />} />
                  <Route path="*" element={<Navigate to="dashboard" />} />
                </Routes>
              ) : <Navigate to="/login" />} />

              {/* Default Redirect */}
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Simple Footer - hide on full screen pages */}
      {!isFullScreenPage && (
        <footer className="bg-white border-t border-gray-200 py-6 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
            &copy; 2026 EventEase College Platform. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}