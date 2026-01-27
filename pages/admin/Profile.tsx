import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Event } from '../../types';
import { useAuth } from '../../App';
import { usePublishedEvents } from '../../hooks';

export default function AdminProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  useEffect(() => {
    // Apply theme on mount and change
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // React Query hook for events
  const { data: events = [] } = usePublishedEvents();

  // Calculate active events count
  const activeEvents = useMemo(() => {
    const now = new Date();
    return events.filter(e => new Date(e.eventDate) >= now && e.status === 'published').length;
  }, [events]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#101622] font-display text-slate-900 dark:text-white antialiased transition-colors duration-300">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-white/80 dark:bg-[#101622]/80 backdrop-blur-md px-4 py-4 pb-2 border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
        <button
          onClick={() => navigate(-1)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Profile &amp; Settings
        </h2>
      </div>

      {/* Main Content */}
      <div className="flex flex-col pb-32">
        {/* Profile Header */}
        <div className="flex flex-col items-center px-4 pt-6 pb-6 w-full">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-primary blur-md opacity-60"></div>
            <div
              className="relative bg-center bg-no-repeat bg-cover rounded-full h-28 w-28 ring-4 ring-[#101622]"
              style={{ backgroundImage: `url("${user?.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User') + '&background=4F46E5&color=fff&size=128'}")` }}
            ></div>
            <button className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 border-4 border-[#101622] flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <h1 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight text-center">
              {user?.name || 'Alex Rivera'}
            </h1>
            <p className="text-[#92a4c9] text-sm font-medium text-center">Senior Coordinator</p>
            <div className="flex items-center gap-1 mt-1 bg-slate-200 dark:bg-white/5 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px] text-primary">school</span>
              <p className="text-slate-600 dark:text-slate-300 text-xs font-normal">Student Affairs</p>
            </div>
          </div>
        </div>

        {/* Profile Stats */}
        <div className="px-4 pb-6 w-full">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1 rounded-xl bg-white dark:bg-[#1C2333] p-4 items-center text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none transition-colors duration-300">
              <div className="bg-primary/10 p-2 rounded-full mb-1">
                <span className="material-symbols-outlined text-primary">event_available</span>
              </div>
              <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">{activeEvents}</p>
              <p className="text-[#92a4c9] text-xs font-medium">Active Events</p>
            </div>
            <div className="flex flex-1 flex-col gap-1 rounded-xl bg-white dark:bg-[#1C2333] p-4 items-center text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none transition-colors duration-300">
              <div className="bg-primary/10 p-2 rounded-full mb-1">
                <span className="material-symbols-outlined text-primary">groups</span>
              </div>
              <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">45</p>
              <p className="text-[#92a4c9] text-xs font-medium">Staff Managed</p>
            </div>
          </div>
        </div>

        {/* Section: Account */}
        <div className="px-4 w-full mb-6">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 ml-2">Account</h3>
          <div className="flex flex-col bg-white dark:bg-[#1C2333] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
            {/* Edit Profile */}
            <button
              onClick={() => navigate('/admin/profile/edit')}
              className="group flex items-center gap-4 px-4 min-h-[60px] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-200 dark:border-white/5"
            >
              <div className="text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-slate-900 dark:text-white text-base font-normal text-left">Edit Profile</p>
              </div>
              <span className="material-symbols-outlined text-gray-600 text-xl group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
            {/* Manage Staff Roles */}
            <button
              onClick={() => alert('Manage Staff Roles feature coming soon!')}
              className="group flex items-center gap-4 px-4 min-h-[60px] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">shield_person</span>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-slate-900 dark:text-white text-base font-normal text-left">Manage Staff Roles</p>
              </div>
              <span className="material-symbols-outlined text-gray-600 text-xl group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Section: Preferences */}
        <div className="px-4 w-full mb-8">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 ml-2">App Preferences</h3>
          <div className="flex flex-col bg-white dark:bg-[#1C2333] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
            {/* Notification Preferences */}
            <button
              onClick={() => alert('Notification Preferences coming soon!')}
              className="group flex items-center gap-4 px-4 min-h-[60px] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-200 dark:border-white/5"
            >
              <div className="text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">notifications</span>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-slate-900 dark:text-white text-base font-normal text-left">Notification Preferences</p>
              </div>
              <span className="material-symbols-outlined text-gray-600 text-xl group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
            {/* App Settings */}
            <button
              onClick={() => alert('App Settings coming soon!')}
              className="group flex items-center gap-4 px-4 min-h-[60px] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-200 dark:border-white/5"
            >
              <div className="text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">settings</span>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-slate-900 dark:text-white text-base font-normal text-left">App Settings</p>
              </div>
              <span className="material-symbols-outlined text-gray-600 text-xl group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
            {/* Dark Mode Toggle */}
            <div className="flex items-center gap-4 px-4 min-h-[60px] bg-white dark:bg-[#1C2333] transition-colors duration-300">
              <div className="text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">dark_mode</span>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-slate-900 dark:text-white text-base font-normal">Dark Mode</p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${darkMode ? 'bg-primary' : 'bg-slate-300 dark:bg-gray-600'}`}
                >
                  <span className={`${darkMode ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Log Out Action */}
        <div className="px-4 w-full">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#1C2333] border border-slate-200 dark:border-white/5 rounded-xl min-h-[56px] px-4 active:scale-[0.98] transition-all hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm dark:shadow-none"
          >
            <span className="material-symbols-outlined text-primary">logout</span>
            <span className="text-primary text-base font-semibold">Log Out</span>
          </button>
          <p className="text-center text-slate-600 text-xs mt-6">Version 2.4.0 • EventEase Inc.</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full z-50">
        {/* Gradient fade */}
        <div className="h-8 w-full bg-gradient-to-b from-transparent to-white/90 dark:to-[#101622] pointer-events-none transition-colors duration-300"></div>
        <div className="bg-white dark:bg-[#151c2b] border-t border-slate-200 dark:border-slate-800 pb-6 pt-2 transition-colors duration-300">
          <div className="flex justify-around items-center px-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${location.pathname === '/admin/dashboard' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
            >
              <span className="material-symbols-outlined text-[24px]">dashboard</span>
              <span className="text-[10px] font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/admin/events')}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${location.pathname === '/admin/events' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
            >
              <span className="material-symbols-outlined text-[24px]">event</span>
              <span className="text-[10px] font-medium">Events</span>
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${location.pathname === '/admin/reports' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
            >
              <span className="material-symbols-outlined text-[24px]">group</span>
              <span className="text-[10px] font-medium">Attendees</span>
            </button>
            <button
              onClick={() => navigate('/admin/profile')}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${location.pathname === '/admin/profile' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: location.pathname === '/admin/profile' ? "'FILL' 1" : "'FILL' 0" }}
              >settings</span>
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}