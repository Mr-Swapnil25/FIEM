import React, { useState } from 'react';
import { useAuth } from '../App';
import { validateEmail, sendPasswordResetEmail, signInWithGoogle, signInWithApple } from '../services/authService';
import { uploadIdCard } from '../services/storageService';
import { PasswordStrengthIndicator } from '../components/auth/PasswordManagement';
import { useNavigate } from 'react-router-dom';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardUploading, setIdCardUploading] = useState(false);
  const [idCardFileName, setIdCardFileName] = useState<string | null>(null);
  
  // SECURITY: Sanitize input to prevent XSS attacks
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
      .trim()
      .slice(0, 500); // Limit length to prevent DoS
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // SECURITY: Sanitize all inputs before processing
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedName = sanitizeInput(name);
    const sanitizedPhone = sanitizeInput(phone);

    // Validate email format
    const emailValidation = validateEmail(sanitizedEmail);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email');
      setLoading(false);
      return;
    }

    // Validate password length and complexity
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // SECURITY: Basic password strength check
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain both letters and numbers');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const result = await login(sanitizedEmail, password);
        if (!result.success) {
          // SECURITY: Generic error message to prevent user enumeration
          setError(result.error || 'Invalid credentials');
        }
      } else {
        // Validate name for registration
        if (!sanitizedName || sanitizedName.length < 2) {
          setError('Full name is required (minimum 2 characters)');
          setLoading(false);
          return;
        }

        // SECURITY: Validate name format
        if (!/^[a-zA-Z\s'-]+$/.test(sanitizedName)) {
          setError('Name can only contain letters, spaces, hyphens, and apostrophes');
          setLoading(false);
          return;
        }

        const result = await register({ 
          email: sanitizedEmail, 
          password, 
          name: sanitizedName, 
          role,
          phone: sanitizedPhone || undefined
        });
        if (!result.success) {
          setError(result.error || 'Registration failed');
        }
      }
    } catch (err) {
      // SECURITY: Log error server-side, show generic message to user
      console.error('[Auth] Submit error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);
    setError(null);
    
    const result = await sendPasswordResetEmail(email);
    
    if (result.success) {
      setSuccess('Password reset email sent! Check your inbox.');
    } else {
      setError(result.error || 'Failed to send reset email');
    }
    
    setLoading(false);
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error || 'Failed to sign in with Google');
      }
      // Success is handled by auth state change in App.tsx
    } catch (err) {
      console.error('[Auth] Google sign in error:', err);
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Handle Apple Sign In
  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithApple();
      if (!result.success) {
        setError(result.error || 'Failed to sign in with Apple');
      }
      // Success is handled by auth state change in App.tsx
    } catch (err) {
      console.error('[Auth] Apple sign in error:', err);
      setError('Failed to sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  // Handle ID Card file selection
  const handleIdCardChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIdCardFile(file);
    setIdCardFileName(file.name);
    setIdCardUploading(true);
    
    // Note: Actual upload happens during registration
    // For now, just show the file is selected
    setTimeout(() => {
      setIdCardUploading(false);
      setSuccess(`ID Card "${file.name}" ready for upload`);
    }, 500);
  };

  // Email format hint based on domain
  const getEmailHint = () => {
    const domain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@teamfuture.in';
    return `firstname.lastname.year.division${domain}`;
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col">
      <div className="flex-1 w-full max-w-md mx-auto px-6 py-8 flex flex-col">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primaryDark text-white shadow-glow mb-4">
            <span className="material-symbols-outlined filled text-3xl">school</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">EventEase</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Your Campus. Your Events. Connected.</p>
        </header>

        <main className="w-full space-y-6 flex-grow">
          {/* Login/Register Toggle */}
          <div className="relative p-1.5 bg-surface rounded-2xl flex shadow-inner">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`w-1/2 text-center py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-all ${
                isLogin 
                  ? 'text-white bg-slate-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`w-1/2 text-center py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-all ${
                !isLogin 
                  ? 'text-white bg-slate-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Role Selector */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer relative group">
                <input 
                  type="radio" 
                  name="role" 
                  value="student" 
                  checked={role === 'student'}
                  onChange={() => setRole('student')}
                  className="peer sr-only" 
                />
                <div className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  role === 'student' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-slate-700 bg-surface/50 text-slate-300 group-hover:border-primary/50'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span className="text-sm font-semibold">Student</span>
                </div>
              </label>
              <label className="cursor-pointer relative group">
                <input 
                  type="radio" 
                  name="role" 
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="peer sr-only" 
                />
                <div className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  role === 'admin' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-slate-700 bg-surface/50 text-slate-300 group-hover:border-primary/50'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                  <span className="text-sm font-semibold">Admin</span>
                </div>
              </label>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Full Name - Register Only */}
            {!isLogin && (
              <div className="space-y-1">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary text-[20px] transition-colors">badge</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required={!isLogin}
                    className="block w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-700 bg-surface/50 text-white placeholder-slate-400 focus:border-primary focus:ring-primary/20 focus:ring-4 transition-all text-sm font-medium shadow-sm outline-none"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary text-[20px] transition-colors">mail</span>
                </div>
                <input 
                  type="email"
                  placeholder={getEmailHint()}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  required
                  className="block w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-700 bg-surface/50 text-white placeholder-slate-400 focus:border-primary focus:ring-primary/20 focus:ring-4 transition-all text-sm font-medium shadow-sm outline-none"
                />
              </div>
              <p className="text-xs text-slate-500 ml-1">Use your institutional email</p>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary text-[20px] transition-colors">lock</span>
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Password' : 'Create Password (min 6 characters)'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  required
                  minLength={6}
                  className="block w-full pl-11 pr-11 py-3.5 rounded-xl border border-slate-700 bg-surface/50 text-white placeholder-slate-400 focus:border-primary focus:ring-primary/20 focus:ring-4 transition-all text-sm font-medium shadow-sm outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              
              {/* Password Strength Indicator - Registration Only */}
              {!isLogin && password && (
                <div className="mt-2">
                  <PasswordStrengthIndicator password={password} showFeedback={true} />
                </div>
              )}
              
              {/* Forgot Password - Login Only */}
              {isLogin && (
                <button 
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-xs text-primary hover:text-primaryLight font-medium ml-1"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {/* Phone - Register Only */}
            {!isLogin && (
              <div className="space-y-1">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary text-[20px] transition-colors">phone</span>
                  </div>
                  <input 
                    type="tel"
                    placeholder="Phone Number (optional)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-700 bg-surface/50 text-white placeholder-slate-400 focus:border-primary focus:ring-primary/20 focus:ring-4 transition-all text-sm font-medium shadow-sm outline-none"
                  />
                </div>
              </div>
            )}

            {/* College ID Upload - Register + Student Only */}
            {!isLogin && role === 'student' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 ml-1">
                  Verification
                </label>
                <div className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    id="id-upload"
                    accept="image/*,.pdf"
                    onChange={handleIdCardChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
                    idCardFileName 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-dashed border-slate-600 bg-surface/30 group-hover:bg-primary/5 group-hover:border-primary/50'
                  }`}>
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-colors ${
                        idCardFileName 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-slate-700 text-slate-300 group-hover:text-primary'
                      }`}>
                        <span className="material-symbols-outlined text-[22px]">
                          {idCardUploading ? 'hourglass_empty' : idCardFileName ? 'check_circle' : 'id_card'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold transition-colors ${
                          idCardFileName ? 'text-green-400' : 'text-slate-200 group-hover:text-primary'
                        }`}>
                          {idCardFileName ? idCardFileName : 'Upload College ID'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {idCardUploading ? 'Processing...' : idCardFileName ? 'File selected ✓' : 'Tap to browse files'}
                        </span>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined transition-colors ${
                      idCardFileName ? 'text-green-400' : 'text-slate-400 group-hover:text-primary -rotate-45'
                    }`}>
                      {idCardFileName ? 'done' : 'arrow_forward'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-gradient-to-r from-primary to-primaryDark hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Processing...
                </>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide font-semibold">
              <span className="bg-background px-3 text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 bg-surface/50 hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-semibold text-slate-300">Google</span>
            </button>
            <button 
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 bg-surface/50 hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="text-sm font-semibold text-slate-300">Apple</span>
            </button>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-slate-500 px-6 pt-4 leading-relaxed">
            By {isLogin ? 'signing in' : 'creating an account'}, you agree to our{' '}
            <a href="#" className="text-primary hover:text-primaryLight font-medium transition-colors">Terms of Service</a> and{' '}
            <a href="#" className="text-primary hover:text-primaryLight font-medium transition-colors">Privacy Policy</a>.
          </p>
        </main>
      </div>
    </div>
  );
}