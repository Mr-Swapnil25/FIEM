import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { User } from './types';
import { backend } from './services/mockBackend';

// Icons
import { 
  Home, Calendar, User as UserIcon, LogOut, 
  LayoutDashboard, PlusCircle, FileBarChart, 
  Bell, Menu, X, CheckCircle
} from 'lucide-react';

// Components
import LoginScreen from './pages/Auth';
import StudentHome from './pages/student/Home';
import EventDetails from './pages/student/EventDetails';
import BookingConfirmation from './pages/student/BookingConfirmation';
import MyEvents from './pages/student/MyEvents';
import StudentProfile from './pages/student/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import CreateEditEvent from './pages/admin/CreateEditEvent';
import Reports from './pages/admin/Reports';
import AdminProfile from './pages/admin/Profile';
import AdminEvents from './pages/admin/Events';
import ParticipantDetails from './pages/admin/ParticipantDetails';
import EventPublishSuccess from './pages/admin/EventPublishSuccess';
import ScanTicket from './pages/admin/ScanTicket';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (email: string, role: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
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

  // Hide navbar on login and profile pages
  if (!user || location.pathname === '/login' || location.pathname === '/student/profile' || location.pathname === '/student/home' || location.pathname === '/student/events' || location.pathname === '/student/booking-success' || location.pathname.startsWith('/student/event/') || location.pathname === '/admin/dashboard' || location.pathname === '/admin/events' || location.pathname === '/admin/reports' || location.pathname === '/admin/profile' || location.pathname.startsWith('/admin/create-event') || location.pathname.startsWith('/admin/edit-event/') || location.pathname.startsWith('/admin/event-published') || location.pathname.startsWith('/admin/scan-ticket') || location.pathname.startsWith('/admin/participant/')) return null;

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
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.path 
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
                className={`flex items-center w-full px-3 py-3 rounded-md text-base font-medium ${
                  location.pathname === link.path 
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
    // Check for persisted session
    const storedUser = localStorage.getItem('eventease_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Splash screen timer
    const timer = setTimeout(() => {
      setIsSplash(false);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, role: string) => {
    try {
      // Allow simulation of login without strict password for demo
      const loggedUser = await backend.login(email);
      if (loggedUser.role !== role) throw new Error(`User is not a ${role}`);
      setUser(loggedUser);
      localStorage.setItem('eventease_session', JSON.stringify(loggedUser));
    } catch (e) {
      alert((e as Error).message);
      throw e;
    }
  };

  const register = async (data: any) => {
    try {
      const newUser = await backend.register(data);
      setUser(newUser);
      localStorage.setItem('eventease_session', JSON.stringify(newUser));
    } catch (e) {
      alert((e as Error).message);
      throw e;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eventease_session');
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
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      <HashRouter>
        <AppContent user={user} logout={logout} />
      </HashRouter>
    </AuthContext.Provider>
  );
}

// Separate component to access router hooks
function AppContent({ user, logout }: { user: User | null, logout: () => void }) {
  const location = useLocation();
  
  // Check if current page needs full-screen layout (no navbar/footer/padding)
  const isFullScreenPage = !user || 
    location.pathname === '/login' || 
    location.pathname === '/student/profile' ||
    location.pathname === '/student/home' ||
    location.pathname === '/student/events' ||
    location.pathname === '/student/booking-success' ||
    location.pathname.startsWith('/student/event/') ||
    location.pathname === '/admin/dashboard' ||
    location.pathname === '/admin/events' ||
    location.pathname === '/admin/reports' ||
    location.pathname === '/admin/profile' ||
    location.pathname.startsWith('/admin/create-event') ||
    location.pathname.startsWith('/admin/edit-event/') ||
    location.pathname.startsWith('/admin/event-published') ||
    location.pathname.startsWith('/admin/scan-ticket') ||
    location.pathname.startsWith('/admin/participant/');

  return (
    <div className={`min-h-screen flex flex-col font-sans ${!isFullScreenPage ? 'bg-slate-100' : ''}`}>
      <Navbar />
      
      <main className={`flex-1 w-full ${!isFullScreenPage ? 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8' : ''}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to={user.role === 'admin' ? "/admin/dashboard" : "/student/home"} />} />
          
          {/* Student Routes */}
          <Route path="/student/*" element={user && user.role === 'student' ? (
            <Routes>
              <Route path="home" element={<StudentHome />} />
              <Route path="events" element={<MyEvents />} />
              <Route path="profile" element={<StudentProfile />} />
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
              <Route path="profile" element={<AdminProfile />} />
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
      </main>
      
      {/* Simple Footer - hide on full screen pages */}
      {!isFullScreenPage && (
        <footer className="bg-white border-t border-gray-200 py-6 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
            &copy; 2024 EventEase College Platform. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}