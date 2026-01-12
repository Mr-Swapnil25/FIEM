import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Event } from '../../types';
import { useAuth } from '../../App';

export default function BookingConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const event = state?.event as Event;

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-zinc-500 text-[48px] mb-4">error</span>
          <p className="text-zinc-400">No booking data found.</p>
          <button 
            onClick={() => navigate('/student/home')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-semibold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const ticketId = `ETK${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}XYZ`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(event.eventDate);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    
    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue)}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket for ${event.title}`,
          text: `I'm attending ${event.title}! Ticket ID: ${ticketId}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(`I'm attending ${event.title}! Ticket ID: ${ticketId}`);
      alert('Ticket info copied to clipboard!');
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-hidden bg-backgroundLight dark:bg-background font-display text-slate-900 dark:text-white antialiased">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-20 right-[-50px] w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none z-0 opacity-60"></div>
      <div className="absolute bottom-40 left-[-50px] w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none z-0 opacity-60"></div>

      {/* Header */}
      <div className="relative z-10 flex items-center p-4 pb-2 justify-between">
        <div className="flex size-12 shrink-0 items-center justify-start"></div>
        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-wide flex-1 text-center">Ticket</h2>
        <div className="flex w-12 items-center justify-end">
          <button 
            onClick={() => navigate('/student/home')}
            className="text-primary hover:text-primaryDark font-semibold text-base leading-normal shrink-0 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Success Section */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-6 pb-2">
        {/* Success Icon with Animation */}
        <div className="relative mb-4 group">
          {/* Ping Animation */}
          <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping opacity-20"></div>
          
          {/* Check Icon */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white shadow-xl shadow-primary/30 ring-4 ring-white dark:ring-background transform transition-transform duration-500 hover:scale-110">
            <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          </div>
          
          {/* Confetti Dots */}
          <div className="absolute -top-1 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
          <div className="absolute -bottom-1 -left-2 w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="absolute top-2 -left-3 w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '500ms' }}></div>
        </div>

        <h1 className="text-slate-900 dark:text-white text-3xl font-extrabold text-center tracking-tight mb-2">You're All Set!</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-center max-w-xs mx-auto">
          Order confirmed. We've sent the receipt to <span className="text-slate-800 dark:text-slate-200">{user?.email || 'your email'}</span>
        </p>
      </div>

      {/* Ticket Card */}
      <div className="relative z-10 flex-1 px-5 py-6 w-full max-w-md mx-auto flex flex-col justify-start">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-surface/80 backdrop-blur-md border border-slate-200 dark:border-white/10 flex flex-col">
          
          {/* Ticket Top Section */}
          <div className="p-6 pb-0 bg-gradient-to-b from-white to-slate-50 dark:from-white/5 dark:to-transparent relative">
            {/* Branding */}
            <div className="flex justify-between items-start mb-5 opacity-70">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">EventEase</span>
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">Admission</span>
            </div>

            {/* Event Title */}
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-6">{event.title}</h3>

            {/* Event Details Grid */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatDate(event.eventDate)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatTime(event.eventDate)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{event.venue}</p>
                </div>
              </div>
            </div>

            {/* Attendee Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 mb-6">
              <div 
                className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-white dark:border-slate-600 shadow-sm shrink-0 bg-primary/20 flex items-center justify-center"
                style={{ backgroundImage: user?.avatarUrl ? `url("${user.avatarUrl}")` : 'none' }}
              >
                {!user?.avatarUrl && (
                  <span className="text-primary font-bold text-sm">{user?.name?.charAt(0) || 'A'}</span>
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Attendee</p>
                <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{user?.name || 'Guest'}</p>
              </div>
            </div>
          </div>

          {/* Tear Line Separator */}
          <div className="relative flex items-center h-8 w-full bg-slate-50 dark:bg-transparent">
            <div className="absolute left-0 -ml-3 w-6 h-6 rounded-full bg-backgroundLight dark:bg-background z-10"></div>
            <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-slate-600 mx-4"></div>
            <div className="absolute right-0 -mr-3 w-6 h-6 rounded-full bg-backgroundLight dark:bg-background z-10"></div>
          </div>

          {/* QR Code Section */}
          <div className="p-6 pt-2 pb-8 bg-slate-50 dark:bg-black/20 flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col justify-center gap-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket ID</p>
              <p className="font-mono text-lg font-medium tracking-widest text-slate-700 dark:text-slate-200">{ticketId}</p>
              <p className="text-[10px] text-slate-400 mt-1">Scan this code at the entrance</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
              <QRCodeSVG value={`TICKET:${ticketId}`} size={80} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 w-full p-6 pt-2 pb-8 flex flex-col gap-3 mt-auto max-w-md mx-auto">
        <button 
          onClick={handleAddToCalendar}
          className="group flex w-full items-center justify-center gap-3 rounded-xl bg-primary hover:bg-primaryDark text-white px-6 py-4 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined group-hover:scale-110 transition-transform">calendar_add_on</span>
          <span className="text-base font-bold tracking-wide">Add to Calendar</span>
        </button>
        <button 
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-white px-6 py-4 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">ios_share</span>
          <span className="text-base font-bold tracking-wide">Share Ticket</span>
        </button>
      </div>
    </div>
  );
}
