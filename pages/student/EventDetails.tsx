import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend } from '../../services/mockBackend';
import { Event } from '../../types';
import { useAuth } from '../../App';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;
      
      const [eventData, userBookings] = await Promise.all([
        backend.getEventById(id),
        backend.getUserBookings(user.id)
      ]);

      setEvent(eventData || null);
      
      // Check if user already booked this event
      const hasBooked = userBookings.some(b => b.eventId === id && b.status !== 'cancelled');
      setIsBooked(hasBooked);

      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleBook = async () => {
    if (!event || !user) return;
    if (isBooked) {
      navigate('/student/events'); // Go to My Events
      return;
    }

    setBookingLoading(true);
    try {
      await backend.createBooking(user.id, event.id);
      navigate('/student/booking-success', { state: { event } });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    const startDate = new Date(event.eventDate);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    
    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue)}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const handleGetDirections = () => {
    if (!event) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`;
    window.open(mapsUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const startTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    // Assume 2 hour event
    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000);
    const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${startTime} - ${endTime}`;
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px]">progress_activity</span>
      </div>
    );
  }

  const progress = ((event.totalSlots - event.availableSlots) / event.totalSlots) * 100;
  const spotsLeft = event.availableSlots;

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col min-h-screen bg-white dark:bg-background overflow-hidden shadow-2xl font-display">
      {/* Hero Header with Image */}
      <header className="relative w-full h-[45vh] min-h-[400px] shrink-0">
        {/* Background Image */}
        <div className="absolute inset-0 bg-zinc-900">
          <div 
            className="w-full h-full bg-center bg-cover transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url("${event.imageUrl}")` }}
          ></div>
        </div>
        
        {/* Top Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent h-32 pointer-events-none"></div>
        
        {/* Bottom Gradient */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/90 to-transparent h-[60%] pointer-events-none"></div>
        
        {/* Navigation */}
        <nav className="absolute top-0 left-0 w-full p-5 pt-6 flex justify-between items-center z-20">
          <button 
            onClick={() => navigate(-1)}
            className="group flex items-center justify-center size-10 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 shadow-lg transition-all active:scale-95 hover:bg-white/20"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsFavorite(!isFavorite)}
              className="group flex items-center justify-center size-10 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 shadow-lg transition-all active:scale-95 hover:bg-white/20"
            >
              <span 
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0", color: isFavorite ? '#ef4444' : 'white' }}
              >
                favorite
              </span>
            </button>
            <button 
              onClick={handleShare}
              className="group flex items-center justify-center size-10 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 shadow-lg transition-all active:scale-95 hover:bg-white/20"
            >
              <span className="material-symbols-outlined text-[22px]">share</span>
            </button>
          </div>
        </nav>

        {/* Event Title Overlay */}
        <div className="absolute bottom-0 left-0 w-full px-6 pb-8 z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/90 backdrop-blur text-white text-[10px] font-bold tracking-widest uppercase shadow-lg shadow-primary/20">
              {event.category}
            </span>
            {event.price === 0 && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur text-white text-[10px] font-bold tracking-widest uppercase shadow-lg">
                FREE
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm">
            {event.title}
          </h1>
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
            <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
            <span>Hosted by EventEase</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col px-6 pb-32 -mt-4 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Availability Card */}
          <div className="bg-white dark:bg-surface p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm flex flex-col gap-1.5 transition-colors">
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">group</span>
              <span>Availability</span>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{spotsLeft}</span>
              <span className="text-sm text-zinc-500 mb-1 font-medium">/ {event.totalSlots} Left</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(19,91,236,0.5)]" 
                style={{ width: `${100 - progress}%` }}
              ></div>
            </div>
          </div>

          {/* Price Card */}
          <div className="bg-white dark:bg-surface p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Entry Fee</span>
            </div>
            <div className="flex items-center gap-2 mt-auto">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                {event.price === 0 ? 'Free' : `$${event.price}`}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wide ${
                event.availableSlots > 0 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
              }`}>
                {event.availableSlots > 0 ? 'Open' : 'Full'}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 font-medium">
              {event.availableSlots > 0 ? 'Registration required' : 'No slots available'}
            </div>
          </div>
        </div>

        {/* Date & Location Info */}
        <div className="space-y-6 mb-8">
          {/* Date */}
          <div className="group flex gap-5 items-start">
            <div className="shrink-0 size-12 rounded-2xl bg-zinc-50 dark:bg-surface flex items-center justify-center text-primary border border-zinc-100 dark:border-zinc-800 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
            <div className="pt-0.5">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white leading-tight mb-1">
                {formatDate(event.eventDate)}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">
                {formatTime(event.eventDate)}
              </p>
              <button 
                onClick={handleAddToCalendar}
                className="mt-1.5 text-primary text-xs font-semibold hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                Add to Calendar <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="group flex gap-5 items-start">
            <div className="shrink-0 size-12 rounded-2xl bg-zinc-50 dark:bg-surface flex items-center justify-center text-primary border border-zinc-100 dark:border-zinc-800 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-outlined">location_on</span>
            </div>
            <div className="pt-0.5">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white leading-tight mb-1">
                {event.venue}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">
                College Campus
              </p>
              <button 
                onClick={handleGetDirections}
                className="mt-1.5 text-primary text-xs font-semibold hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                Get Directions <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent mb-8"></div>

        {/* About Section */}
        <section>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            About this event
          </h3>
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <p className="text-zinc-600 dark:text-zinc-300 text-[15px] font-light leading-7 tracking-wide">
              {event.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-8">
            <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700/50">
              #{event.category}
            </span>
            <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700/50">
              #Campus
            </span>
            <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700/50">
              #Students
            </span>
          </div>
        </section>
      </main>

      {/* Fixed Footer CTA */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-md mx-auto p-6 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-background dark:via-background/95 dark:to-transparent pt-12 pointer-events-auto">
          <button 
            onClick={handleBook}
            disabled={(event.availableSlots <= 0 && !isBooked) || bookingLoading || event.status !== 'published'}
            className={`group w-full relative flex items-center justify-between rounded-2xl h-[60px] px-2 text-white shadow-glow transition-all duration-300 active:scale-[0.98] overflow-hidden ${
              isBooked 
                ? 'bg-emerald-500 hover:shadow-[0_0_35px_rgba(16,185,129,0.7)]' 
                : event.availableSlots > 0 
                  ? 'bg-primary hover:shadow-[0_0_35px_rgba(19,91,236,0.7)]' 
                  : 'bg-zinc-400 cursor-not-allowed shadow-none'
            }`}
          >
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            {/* Price Info */}
            <div className="flex-1 flex flex-col items-start pl-4 z-10">
              <span className="text-xs font-medium text-blue-200 uppercase tracking-wide">
                {isBooked ? 'Already Booked' : 'Total Price'}
              </span>
              <span className="text-lg font-bold leading-none">
                {event.price === 0 ? 'Free' : `$${event.price}`}
              </span>
            </div>
            
            {/* Action Button */}
            <div className="flex items-center gap-2 bg-white/10 px-5 py-2.5 rounded-xl backdrop-blur-sm mr-2 z-10 transition-colors group-hover:bg-white/20">
              {bookingLoading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="text-base font-bold tracking-wide">
                    {isBooked ? 'View Ticket' : event.availableSlots > 0 ? 'Book Slot' : 'Sold Out'}
                  </span>
                  <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                    {isBooked ? 'confirmation_number' : 'arrow_forward'}
                  </span>
                </>
              )}
            </div>
          </button>
        </div>
      </footer>
    </div>
  );
}