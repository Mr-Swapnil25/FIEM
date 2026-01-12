import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { backend } from '../../services/mockBackend';
import { Event, EventStatus } from '../../types';

type FilterType = 'all' | 'published' | 'drafts' | 'past' | 'upcoming';

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
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

  const handleDelete = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      await backend.deleteEvent(eventId);
      setEvents(events.filter(ev => ev.id !== eventId));
    }
    setMenuOpen(null);
  };

  const handleEdit = (eventId: string) => {
    navigate(`/admin/edit-event/${eventId}`);
    setMenuOpen(null);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase());
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    
    if (!matchesSearch) return false;
    
    switch (filter) {
      case 'published':
        return event.status === 'published' && eventDate >= now;
      case 'drafts':
        return event.status === 'draft';
      case 'past':
        return eventDate < now;
      case 'upcoming':
        return eventDate >= now;
      default:
        return true;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate().toString().padStart(2, '0'),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  const getEventStatus = (event: Event): { status: string; isPast: boolean } => {
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    const isPast = eventDate < now;
    
    if (isPast) return { status: 'past', isPast: true };
    if (event.status === 'draft') return { status: 'draft', isPast: false };
    return { status: 'published', isPast: false };
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'published':
        return {
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
          dateBlock: 'bg-primary/10 dark:bg-primary/20 text-primary'
        };
      case 'draft':
        return {
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
          dateBlock: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500'
        };
      case 'past':
        return {
          badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/50',
          dateBlock: 'bg-slate-100 dark:bg-slate-700/30 text-slate-500'
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/50',
          dateBlock: 'bg-slate-100 dark:bg-slate-700/30 text-slate-500'
        };
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Events' },
    { key: 'published', label: 'Published' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'past', label: 'Past' },
    { key: 'upcoming', label: 'Upcoming' },
  ];

  return (
    <div className="relative min-h-screen bg-[#101622] font-display text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-5 pb-2 shrink-0 z-10 bg-[#101622]">
        <h1 className="text-2xl font-bold tracking-tight text-white">Events</h1>
        <button 
          onClick={() => navigate('/admin/create-event')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="px-5 py-2 shrink-0 z-10 bg-[#101622]">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '20px' }}>search</span>
          </div>
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full p-3 pl-10 text-sm text-white border border-transparent rounded-xl bg-[#1c2433] placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
            placeholder="Search by event name..."
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-5 py-3 shrink-0 overflow-x-auto flex gap-3 z-10 bg-[#101622] border-b border-slate-800/50" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'text-white bg-primary shadow-md shadow-primary/20'
                : 'text-slate-300 bg-[#1c2433] hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-32" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">event_busy</span>
            <p className="text-sm">No events found</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const { month, day, time } = formatDate(event.eventDate);
            const { status, isPast } = getEventStatus(event);
            const styles = getStatusStyles(status);
            
            return (
              <div 
                key={event.id}
                onClick={() => navigate(`/admin/edit-event/${event.id}`)}
                className={`group relative flex gap-4 bg-[#1c2433] p-3 rounded-xl shadow-sm border border-slate-800/50 hover:border-primary/50 transition-all cursor-pointer ${
                  isPast ? 'opacity-75 hover:opacity-100' : ''
                }`}
              >
                {/* Date Block */}
                <div className={`shrink-0 w-[60px] h-[60px] flex flex-col items-center justify-center rounded-lg ${styles.dateBlock}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{month}</span>
                  <span className="text-xl font-bold leading-none">{day}</span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-base font-semibold truncate pr-2 ${isPast ? 'text-slate-300' : 'text-white'}`}>
                      {event.title}
                    </h3>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === event.id ? null : event.id);
                      }}
                      className="shrink-0 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {time} • {event.venue}
                  </p>
                  <div className="mt-2 flex">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${styles.badge}`}>
                      {status}
                    </span>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {menuOpen === event.id && (
                  <div 
                    className="absolute right-3 top-12 z-50 bg-[#1c2433] border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => handleEdit(event.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(event.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Click outside to close menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(null)}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full z-50">
        {/* Gradient fade */}
        <div className="h-8 w-full bg-gradient-to-b from-transparent to-[#101622] pointer-events-none"></div>
        <div className="bg-[#151c2b] border-t border-slate-800 pb-6 pt-2">
          <div className="flex justify-around items-center px-4">
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
                location.pathname === '/admin/dashboard' ? 'text-primary' : 'text-slate-400 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">dashboard</span>
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
  );
}
