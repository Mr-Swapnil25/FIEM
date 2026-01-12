import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Event } from '../../types';

interface LocationState {
  event: Event;
}

// Confetti particle component
const ConfettiParticle = ({ style }: { style: React.CSSProperties }) => (
  <div 
    className="absolute pointer-events-none opacity-60 animate-pulse"
    style={style}
  />
);

export default function EventPublishSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  
  // Get event data from navigation state
  const state = location.state as LocationState | null;
  const event = state?.event;

  useEffect(() => {
    // Trigger mount animation
    setMounted(true);
    
    // If no event data, redirect to dashboard
    if (!event) {
      navigate('/admin/dashboard');
    }
  }, [event, navigate]);

  // Format date for display
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric'
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return `${date.toLocaleDateString('en-US', options)} • ${date.toLocaleTimeString('en-US', timeOptions)}`;
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Cultural': 'bg-purple-500/20 border-purple-500/10 text-purple-400',
      'Technical': 'bg-blue-500/20 border-blue-500/10 text-blue-400',
      'Sports': 'bg-green-500/20 border-green-500/10 text-green-400',
      'Workshop': 'bg-indigo-500/20 border-indigo-500/10 text-indigo-400',
      'Seminar': 'bg-amber-500/20 border-amber-500/10 text-amber-400',
      'Other': 'bg-slate-500/20 border-slate-500/10 text-slate-400'
    };
    return colors[category] || colors['Other'];
  };

  if (!event) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full bg-[#0B1019] font-display text-slate-100 antialiased overflow-hidden">
      {/* Background Gradient Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main glow */}
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/10 to-emerald-500/5 rounded-full blur-[100px] transition-all duration-1000 ${
            mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        />
        
        {/* Confetti particles */}
        <ConfettiParticle style={{ top: '15%', left: '10%', width: '12px', height: '12px', backgroundColor: '#4f8bff', borderRadius: '50%', opacity: 0.4 }} />
        <ConfettiParticle style={{ top: '10%', right: '20%', width: '8px', height: '20px', backgroundColor: '#facc15', transform: 'rotate(45deg)', borderRadius: '2px', opacity: 0.6 }} />
        <ConfettiParticle style={{ bottom: '25%', left: '8%', width: '16px', height: '16px', backgroundColor: 'rgba(79, 139, 255, 0.4)', transform: 'rotate(12deg)', borderRadius: '4px', border: '1px solid rgba(79, 139, 255, 0.3)' }} />
        <ConfettiParticle style={{ top: '30%', right: '10%', width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '50%', opacity: 0.3 }} />
        <ConfettiParticle style={{ bottom: '15%', right: '15%', width: '12px', height: '24px', backgroundColor: 'rgba(16, 185, 129, 0.4)', transform: 'rotate(-12deg)', borderRadius: '2px' }} />
        <ConfettiParticle style={{ top: '40%', left: '5%', width: '8px', height: '8px', backgroundColor: '#ec4899', borderRadius: '50%', opacity: 0.5 }} />
        <ConfettiParticle style={{ top: '20%', left: '25%', width: '6px', height: '6px', backgroundColor: '#a855f7', borderRadius: '50%', opacity: 0.4 }} />
        <ConfettiParticle style={{ bottom: '30%', right: '8%', width: '10px', height: '10px', backgroundColor: '#06b6d4', borderRadius: '50%', opacity: 0.35 }} />
      </div>

      {/* Main Content */}
      <div className={`relative z-10 min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-700 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">
          
          {/* Success Icon */}
          <div className={`mb-10 relative group cursor-default transition-all duration-500 delay-200 ${
            mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}>
            {/* Glow effects */}
            <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl transform scale-110"></div>
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl transform scale-150"></div>
            
            {/* Icon container */}
            <div 
              className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-[#1c2635] to-black border border-white/10"
              style={{ boxShadow: '0 0 60px rgba(16, 185, 129, 0.35)' }}
            >
              <span 
                className="material-symbols-outlined text-6xl text-emerald-500"
                style={{ 
                  fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24",
                  filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.4))'
                }}
              >
                check_circle
              </span>
            </div>
            
            {/* Outer ring */}
            <div className="absolute -inset-3 border border-emerald-500/10 rounded-full"></div>
          </div>

          {/* Success Message */}
          <div className={`text-center space-y-3 mb-12 transition-all duration-500 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
              Event Published<br/>Successfully!
            </h1>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
              Your event is now live on the student feed and ready for bookings.
            </p>
          </div>

          {/* Event Card Preview */}
          <div className={`w-full bg-[#151c28]/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3 mb-8 flex gap-4 items-center transition-all duration-500 delay-400 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.3)' }}
          >
            {/* Event Image */}
            <div 
              className="h-16 w-16 rounded-xl bg-cover bg-center shadow-inner shrink-0 relative overflow-hidden group"
              style={{ 
                backgroundImage: event.imageUrl 
                  ? `url("${event.imageUrl}")` 
                  : 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
              }}
            >
              <div className="absolute inset-0 bg-black/20"></div>
              {!event.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-400 text-xl">event</span>
                </div>
              )}
            </div>
            
            {/* Event Details */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between mb-1">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${getCategoryColor(event.category)}`}>
                  {event.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-white truncate leading-tight mb-1">
                {event.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span 
                  className="material-symbols-outlined text-[14px] text-slate-500"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
                >
                  event
                </span>
                <span>{formatEventDate(event.eventDate)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`w-full space-y-3.5 transition-all duration-500 delay-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            {/* View Event Button */}
            <button 
              onClick={() => navigate(`/admin/edit-event/${event.id}`)}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              <span 
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
              >
                visibility
              </span>
              View Event
            </button>
            
            {/* Go to Dashboard Button */}
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="w-full h-14 bg-[#1c2436] hover:bg-[#232d42] text-slate-300 hover:text-white border border-white/5 font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              <span 
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
              >
                dashboard
              </span>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Keyframes for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
