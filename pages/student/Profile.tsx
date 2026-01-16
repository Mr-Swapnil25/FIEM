import React, { useMemo, useState } from 'react';
import { useAuth } from '../../App';
import { useNavigate } from 'react-router-dom';
import { Booking } from '../../types';
import { useUserBookings } from '../../hooks';
import { formatDate, formatTime } from '../../utils/dateFormat';

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // React Query hook for bookings
  const { data: bookings = [], isLoading: loading } = useUserBookings(user?.id);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSettings = () => {
    // Settings functionality - can be expanded
    alert('Settings coming soon!');
  };

  const handleQRCode = () => {
    alert('QR Code feature coming soon!');
  };

  const handleEditProfile = () => {
    navigate('/student/profile/edit');
  };

  if (!user) return null;

  const filteredBookings = useMemo(() => bookings.filter(booking => {
    const isPast = new Date(booking.eventDate!) < new Date();
    return activeTab === 'upcoming' ? !isPast : isPast;
  }), [bookings, activeTab]);

  // formatDate and formatTime imported from utils/dateFormat

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col font-sans overflow-x-hidden pb-6 bg-background text-white">
      {/* Background Gradient */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-[80px] -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 z-10">
        <button 
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/20 transition active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-xs font-semibold tracking-widest uppercase text-slate-400">My Profile</h1>
        <button 
          onClick={handleSettings}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/20 transition active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center px-6 mt-2 relative z-10">
        {/* Avatar with Glow */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-indigo-500 rounded-full opacity-75 blur group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative w-36 h-36 rounded-full p-[4px] bg-background">
            <div 
              className="w-full h-full rounded-full bg-cover bg-center bg-no-repeat shadow-2xl"
              style={{ backgroundImage: `url("${user.avatarUrl || 'https://picsum.photos/200'}")` }}
            ></div>
          </div>
          {/* Verified Badge */}
          <div className="absolute bottom-2 right-2 w-8 h-8 bg-background rounded-full flex items-center justify-center shadow-lg border border-slate-800">
            <span className="material-symbols-outlined text-primary text-[18px] filled">verified</span>
          </div>
        </div>

        {/* User Info */}
        <div className="text-center mt-6 space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-white">{user.name}</h2>
          <p className="text-slate-400 font-medium text-lg">{user.department || 'Computer Science'}</p>
          <div className="inline-flex items-center px-3 py-1 mt-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-xs font-mono tracking-wider text-slate-300 uppercase font-semibold">
              Roll No: {user.rollNo || '20CS1088'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full max-w-sm gap-3 mt-8">
          <button 
            onClick={() => navigate('/student/favorites')}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-red-500/10 border border-red-500/20 shadow-sm hover:bg-red-500/20 transition-all active:scale-[0.98] group"
          >
            <span 
              className="material-symbols-outlined text-red-400 text-[20px] group-hover:scale-110 transition-transform"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
            <span className="font-semibold text-sm text-red-400">Favorites</span>
          </button>
          <button 
            onClick={handleQRCode}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-surface border border-white/10 shadow-sm hover:bg-white/5 transition-all active:scale-[0.98] group"
          >
            <span className="material-symbols-outlined text-white text-[20px] group-hover:scale-110 transition-transform">qr_code_2</span>
            <span className="font-semibold text-sm">QR Code</span>
          </button>
        </div>
        <div className="w-full max-w-sm mt-3">
          <button 
            onClick={handleEditProfile}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-glow text-white border border-transparent hover:brightness-110 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            <span className="font-semibold text-sm">Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-10 w-full max-w-lg mx-auto">
        <div className="flex p-1.5 bg-surface rounded-2xl relative">
          {/* Active Tab Indicator */}
          <div 
            className={`absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] p-1.5 pointer-events-none transition-all duration-300 ${
              activeTab === 'upcoming' ? 'left-1.5' : 'left-[calc(50%+3px)]'
            }`}
          >
            <div className="w-full h-full bg-slate-700 shadow-sm rounded-xl border border-white/5"></div>
          </div>
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`relative z-10 flex-1 h-10 rounded-xl text-sm font-bold transition-colors duration-200 ${
              activeTab === 'upcoming' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`relative z-10 flex-1 h-10 rounded-xl text-sm font-bold transition-colors duration-200 ${
              activeTab === 'past' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-4 px-6 mt-6 pb-28 w-full max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-500 text-[32px]">event_busy</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No {activeTab} events</h3>
            <p className="text-slate-400 text-sm">
              {activeTab === 'upcoming' 
                ? "You don't have any upcoming events booked." 
                : "You don't have any past events."}
            </p>
            {activeTab === 'upcoming' && (
              <button 
                onClick={() => navigate('/student/home')}
                className="mt-4 px-6 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primaryDark transition"
              >
                Browse Events
              </button>
            )}
          </div>
        ) : (
          filteredBookings.map(booking => (
            <div 
              key={booking.id}
              onClick={() => navigate(`/student/event/${booking.eventId}`)}
              className="group relative flex items-center gap-4 p-3 pr-4 rounded-2xl bg-surface border border-white/5 shadow-lg hover:shadow-xl transition-all active:scale-[0.99] overflow-hidden cursor-pointer"
            >
              {/* Hover Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              {/* Event Image */}
              <div className="relative z-10 w-20 h-20 shrink-0">
                <div 
                  className="w-full h-full rounded-xl bg-cover bg-center bg-slate-700"
                  style={{ backgroundImage: `url("https://picsum.photos/200/200?random=${booking.eventId}")` }}
                ></div>
                {/* Date Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                  {formatDate(booking.eventDate!)}
                </div>
              </div>

              {/* Event Info */}
              <div className="flex flex-col justify-center flex-1 relative z-10 gap-1">
                <h3 className="text-base font-bold text-white leading-tight line-clamp-1">{booking.eventTitle}</h3>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>{formatTime(booking.eventDate!)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span>{booking.eventVenue}</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="relative z-10 shrink-0 self-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fixed Logout Button */}
      <div className="fixed bottom-0 w-full left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-20">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[15px] font-bold hover:bg-red-500/20 transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
