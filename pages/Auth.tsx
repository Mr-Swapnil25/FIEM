import React, { useState } from 'react';
import { useAuth } from '../App';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, role);
      } else {
        await register({ email, name, role });
      }
    } catch (err) {
      // alert handled in App.tsx
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type: 'student' | 'admin') => {
    setIsLogin(true);
    setRole(type);
    if (type === 'admin') {
      setEmail('admin@college.edu');
      setPassword('admin123');
    } else {
      setEmail('student@college.edu');
      setPassword('student123');
    }
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

          {/* Demo Credentials */}
          {isLogin && (
            <div className="bg-surface/50 border border-slate-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Demo Credentials
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => fillDemo('student')}
                  className="bg-surface border border-slate-600 text-slate-300 text-xs py-2 rounded-lg font-medium hover:bg-slate-700 hover:border-primary/50 transition"
                >
                  Student Demo
                </button>
                <button 
                  type="button"
                  onClick={() => fillDemo('admin')}
                  className="bg-surface border border-slate-600 text-slate-300 text-xs py-2 rounded-lg font-medium hover:bg-slate-700 hover:border-primary/50 transition"
                >
                  Admin Demo
                </button>
              </div>
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
                  placeholder="College Email (@university.edu)"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="block w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-700 bg-surface/50 text-white placeholder-slate-400 focus:border-primary focus:ring-primary/20 focus:ring-4 transition-all text-sm font-medium shadow-sm outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary text-[20px] transition-colors">lock</span>
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Password' : 'Create Password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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
            </div>

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
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full p-4 rounded-xl border border-dashed border-slate-600 bg-surface/30 group-hover:bg-primary/5 group-hover:border-primary/50 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-slate-700 shadow-sm flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[22px]">id_card</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-200 group-hover:text-primary transition-colors">Upload College ID</span>
                        <span className="text-xs text-slate-400 font-medium">Tap to browse files</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary -rotate-45 transition-colors">arrow_forward</span>
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
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 bg-surface/50 hover:bg-slate-700 transition-colors shadow-sm"
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
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 bg-surface/50 hover:bg-slate-700 transition-colors shadow-sm"
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