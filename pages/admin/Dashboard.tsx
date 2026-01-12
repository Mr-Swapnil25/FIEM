import React, { useEffect, useState } from 'react';
import { backend } from '../../services/mockBackend';
import { Event, EventStatus } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'drafts'>('upcoming');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const allEvents = await backend.getEvents();
      setEvents(allEvents);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const handleDelete = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this event?')) {
      await backend.deleteEvent(eventId);
      setEvents(events.filter(ev => ev.id !== eventId));
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase());
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    
    if (filter === 'upcoming') {
      return matchesSearch && event.status === 'published' && eventDate >= now;
    } else if (filter === 'past') {
      return matchesSearch && eventDate < now;
    } else {
      return matchesSearch && event.status === 'draft';
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day}, ${monthDay} • ${time}`;
  };

  const getStatusBadge = (status: EventStatus, eventDate: string) => {
    const isPast = new Date(eventDate) < new Date();
    
    if (isPast) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
          Completed
        </span>
      );
    }
    
    if (status === 'published') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
          Published
        </span>
      );
    } else if (status === 'draft') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 shadow-[0_0_5px_rgba(245,158,11,0.8)]"></span>
          Draft
        </span>
      );
    } else if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></span>
          Cancelled
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative min-h-screen bg-[#0B0E14] text-slate-200 font-display antialiased">
      {/* Background Gradient Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen pb-[120px]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5">
          <button className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-lg font-bold text-white tracking-wide">Admin Dashboard</h1>
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-5 py-3 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
              <input 
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#151921] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="px-5 mt-6 mb-2">
          <div className="flex p-1.5 rounded-full bg-[#151921] border border-white/5 shadow-inner relative z-0">
            <label className="flex-1 cursor-pointer relative z-10">
              <input 
                checked={filter === 'upcoming'} 
                onChange={() => setFilter('upcoming')}
                className="peer sr-only" 
                name="event-filter" 
                type="radio" 
                value="upcoming"
              />
              <div className="flex items-center justify-center py-2.5 text-sm font-medium rounded-full text-slate-400 peer-checked:text-white peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-blue-600 peer-checked:shadow-lg peer-checked:shadow-indigo-500/20 transition-all duration-300">
                Upcoming
              </div>
            </label>
            <label className="flex-1 cursor-pointer relative z-10">
              <input 
                checked={filter === 'past'} 
                onChange={() => setFilter('past')}
                className="peer sr-only" 
                name="event-filter" 
                type="radio" 
                value="past"
              />
              <div className="flex items-center justify-center py-2.5 text-sm font-medium rounded-full text-slate-400 peer-checked:text-white peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-blue-600 peer-checked:shadow-lg peer-checked:shadow-indigo-500/20 transition-all duration-300">
                Past
              </div>
            </label>
            <label className="flex-1 cursor-pointer relative z-10">
              <input 
                checked={filter === 'drafts'} 
                onChange={() => setFilter('drafts')}
                className="peer sr-only" 
                name="event-filter" 
                type="radio" 
                value="drafts"
              />
              <div className="flex items-center justify-center py-2.5 text-sm font-medium rounded-full text-slate-400 peer-checked:text-white peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-blue-600 peer-checked:shadow-lg peer-checked:shadow-indigo-500/20 transition-all duration-300">
                Drafts
              </div>
            </label>
          </div>
        </div>

        {/* Events List */}
        <div className="flex flex-col gap-5 px-5 py-4">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-[#151921] rounded-2xl p-4 border border-white/5 animate-pulse">
                <div className="flex gap-4 mb-4">
                  <div className="w-24 h-24 rounded-xl bg-slate-700"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    <div className="h-6 bg-slate-700 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-[#151921] flex items-center justify-center mb-4 border border-white/5">
                <span className="material-symbols-outlined text-slate-500 text-[40px]">event_busy</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No events found</h3>
              <p className="text-slate-400 mb-6">
                {filter === 'upcoming' && "No upcoming events scheduled."}
                {filter === 'past' && "No past events to show."}
                {filter === 'drafts' && "No draft events saved."}
              </p>
              <button 
                onClick={() => navigate('/admin/create-event')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-full font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Event
              </button>
            </div>
          ) : (
            filteredEvents.map(event => (
              <div 
                key={event.id}
                className="group relative bg-[#151921] rounded-2xl p-4 border border-white/5 shadow-lg shadow-black/20 overflow-hidden transition-transform active:scale-[0.99]"
              >
                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                {/* Event Content */}
                <div className="flex gap-4 mb-4">
                  {/* Event Image */}
                  <div 
                    className="w-24 h-24 rounded-xl bg-cover bg-center shadow-md shrink-0 ring-1 ring-white/10"
                    style={{ backgroundImage: `url("${event.imageUrl}")` }}
                  ></div>
                  
                  {/* Event Info */}
                  <div className="flex flex-col justify-between flex-1 py-0.5">
                    <div>
                      <h3 className="text-base font-semibold text-white leading-tight mb-1">{event.title}</h3>
                      <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-medium mb-2">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        <span>{formatDate(event.eventDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      {getStatusBadge(event.status, event.eventDate)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button 
                    onClick={(e) => handleDelete(event.id, e)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-400 bg-white/5 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/edit-event/${event.id}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 hover:shadow-indigo-500/30 border border-indigo-500/50 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 w-full z-50">
          {/* Gradient fade */}
          <div className="h-8 w-full bg-gradient-to-b from-transparent to-[#0B0E14] pointer-events-none"></div>
          <div className="bg-[#151c2b] border-t border-slate-800 pb-6 pt-2">
            <div className="flex justify-around items-center px-4">
              <button 
                onClick={() => navigate('/admin/dashboard')}
                className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
                  location.pathname === '/admin/dashboard' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
              >
                <span 
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: location.pathname === '/admin/dashboard' ? "'FILL' 1" : "'FILL' 0" }}
                >dashboard</span>
                <span className="text-[10px] font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => navigate('/admin/events')}
                className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
                  location.pathname === '/admin/events' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
              >
                <span 
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: location.pathname === '/admin/events' ? "'FILL' 1" : "'FILL' 0" }}
                >event</span>
                <span className="text-[10px] font-medium">Events</span>
              </button>
              
              {/* Center QR Scan Button */}
              <button 
                onClick={() => navigate('/admin/scan-ticket')}
                className="flex flex-col items-center gap-1 min-w-[64px] -mt-8 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border-4 border-[#151c2b] hover:scale-105 active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-[26px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
                </div>
                <span className="text-[10px] font-medium text-primary">Scan</span>
              </button>
              
              <button 
                onClick={() => navigate('/admin/reports')}
                className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
                  location.pathname === '/admin/reports' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">group</span>
                <span className="text-[10px] font-medium">Attendees</span>
              </button>
              <button 
                onClick={() => navigate('/admin/profile')}
                className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
                  location.pathname === '/admin/profile' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">settings</span>
                <span className="text-[10px] font-medium">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}