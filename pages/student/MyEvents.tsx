import React, { useState, useMemo } from 'react';
import { useAuth } from '../../App';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserBookings, useCancelBooking } from '../../hooks';
import { useRealtimeUserBookings } from '../../hooks/useRealtime';

export default function MyEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // React Query hooks - replaces manual useState/useEffect
  const { data: bookings = [], isLoading: loading, refetch } = useUserBookings(user?.id);
  const cancelBookingMutation = useCancelBooking();
  
  // Enable real-time updates via Firestore
  const { isConnected } = useRealtimeUserBookings(user?.id, { enabled: !!user });

  const filteredBookings = useMemo(() => bookings.filter(booking => {
    if (filter === 'all') return true;
    const isPast = new Date(booking.eventDate!) < new Date();
    return filter === 'upcoming' ? !isPast : isPast;
  }), [bookings, filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate().toString().padStart(2, '0');
    return `${month} ${day}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col pb-28 bg-backgroundLight dark:bg-background font-display text-slate-800 dark:text-slate-100 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-backgroundLight/90 dark:bg-background/90 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="flex items-center justify-between px-5 h-16 max-w-lg mx-auto w-full">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white absolute left-1/2 -translate-x-1/2">My Events</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="sticky top-16 z-30 bg-backgroundLight dark:bg-background pt-4 pb-2 px-5 shadow-sm dark:shadow-none">
        <div className="max-w-lg mx-auto w-full bg-slate-200 dark:bg-[#1c2436] p-1.5 rounded-full flex relative">
          {(['all', 'upcoming', 'past'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 text-center py-2.5 rounded-full text-sm capitalize transition-colors ${
                filter === tab 
                  ? 'font-bold text-white bg-primary shadow-lg shadow-primary/30' 
                  : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <main className="flex-1 px-5 pt-4 space-y-4 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-surface rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-surface flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-[40px]">confirmation_number</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No bookings found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {filter === 'all' 
                ? "You haven't booked any events yet." 
                : `No ${filter} events found.`}
            </p>
            <button 
              onClick={() => navigate('/student/home')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold shadow-lg shadow-primary/25 hover:bg-primaryDark transition-all active:scale-95"
            >
              Browse Events
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        ) : (
          filteredBookings.map(booking => {
            const isPast = new Date(booking.eventDate!) < new Date();
            return (
              <div 
                key={booking.id}
                onClick={() => navigate(`/student/event/${booking.eventId}`)}
                className="group relative flex items-center gap-4 p-4 bg-white dark:bg-surface rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-card dark:shadow-none hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                {/* Event Image */}
                <div className="relative w-20 h-20 shrink-0">
                  <div 
                    className="w-full h-full rounded-xl bg-cover bg-center bg-slate-200 dark:bg-slate-700"
                    style={{ backgroundImage: `url("https://picsum.photos/200/200?random=${booking.eventId}")` }}
                  ></div>
                  {/* Date Badge */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {formatDate(booking.eventDate!)}
                  </div>
                </div>

                {/* Event Info */}
                <div className="flex flex-col justify-center flex-1 gap-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">{booking.eventTitle}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ml-2 shrink-0 ${
                      isPast 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' 
                        : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                    }`}>
                      {isPast ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>{formatTime(booking.eventDate!)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="line-clamp-1">{booking.eventVenue}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-mono">
                    <span className="material-symbols-outlined text-[12px]">qr_code_2</span>
                    <span>{booking.ticketId}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="shrink-0 self-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-surface/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-[72px] max-w-lg mx-auto w-full">
          <button 
            onClick={() => navigate('/student/home')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              location.pathname === '/student/home' ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span 
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: location.pathname === '/student/home' ? "'FILL' 1" : "'FILL' 0" }}
            >
              home
            </span>
            <span className={`text-[10px] ${location.pathname === '/student/home' ? 'font-bold' : 'font-medium'}`}>Home</span>
          </button>
          <button 
            onClick={() => navigate('/student/events')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              location.pathname === '/student/events' ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span 
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: location.pathname === '/student/events' ? "'FILL' 1" : "'FILL' 0" }}
            >
              confirmation_number
            </span>
            <span className={`text-[10px] ${location.pathname === '/student/events' ? 'font-bold' : 'font-medium'}`}>My Events</span>
          </button>
          <button 
            onClick={() => navigate('/student/profile')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              location.pathname === '/student/profile' ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span 
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: location.pathname === '/student/profile' ? "'FILL' 1" : "'FILL' 0" }}
            >
              person
            </span>
            <span className={`text-[10px] ${location.pathname === '/student/profile' ? 'font-bold' : 'font-medium'}`}>Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
