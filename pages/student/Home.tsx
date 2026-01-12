import React, { useEffect, useState } from 'react';
import { getEvents, getUserBookings, subscribeToEvents } from '../../services/backend';
import { Event, EventStatus, EventCategory, Booking } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';
import { Plus, Users, Calendar, MapPin, RefreshCw } from 'lucide-react';

export default function StudentHome({ isAdmin = false }: { isAdmin?: boolean }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Student Filters
  const [filter, setFilter] = useState<'current' | 'upcoming' | 'past'>('upcoming');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  
  // Admin Filters
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const allEvents = await getEvents();
      setEvents(allEvents);
      if (user) {
        const userBookings = await getUserBookings(user.id);
        setBookings(userBookings);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Initial fetch
    fetchEvents();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToEvents((updatedEvents) => {
      setEvents(updatedEvents);
    });

    return () => unsubscribe();
  }, [user]);

  const bookedEventIds = bookings.map(b => b.eventId);

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                          e.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' ? true : e.category === categoryFilter;
    
    if (isAdmin) {
       const matchesStatus = statusFilter === 'all' ? true : e.status === statusFilter;
       return matchesSearch && matchesStatus && matchesCategory;
    } else {
       const isPublished = e.status === 'published';
       const eventDate = new Date(e.eventDate);
       const now = new Date();
       const oneDay = 24 * 60 * 60 * 1000;
       
       let matchesDate = true;
       if (filter === 'current') {
         // Events happening today or within 24 hours
         matchesDate = Math.abs(eventDate.getTime() - now.getTime()) < oneDay;
       } else if (filter === 'upcoming') {
         matchesDate = eventDate > now;
       } else {
         matchesDate = eventDate < now;
       }
       return matchesSearch && matchesDate && isPublished && matchesCategory;
    }
  });

  const categories: EventCategory[] = ['Cultural', 'Technical', 'Sports', 'Workshop', 'Seminar', 'Other'];
  const statuses: EventStatus[] = ['draft', 'published', 'completed', 'cancelled'];

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  const getRandomAttendees = () => {
    const initials = ['JD', 'AS', 'MK', 'RJ', 'EM', 'TW', 'PL', 'NC'];
    const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-pink-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500'];
    const count = Math.floor(Math.random() * 3) + 2;
    const attendees = [];
    for (let i = 0; i < count; i++) {
      attendees.push({
        initials: initials[Math.floor(Math.random() * initials.length)],
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    return attendees;
  };

  // Admin view uses existing layout
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
            <p className="text-gray-500 text-sm">Create and manage college events</p>
          </div>
          <button 
            onClick={() => navigate('/admin/create-event')}
            className="bg-primary text-white px-4 py-2 rounded-xl shadow-lg hover:bg-primaryLight flex items-center justify-center gap-2 font-medium transition-all"
          >
            <Plus size={18} /> Create Event
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>
            <input 
              type="text" 
              placeholder="Search events by title or category..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primaryLight transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <select 
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primaryLight"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primaryLight"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No events found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters.</p>
            <button onClick={fetchEvents} className="text-primary font-medium flex items-center justify-center mx-auto hover:underline">
              <RefreshCw size={16} className="mr-2" /> Refresh List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredEvents.map(event => (
              <div 
                key={event.id} 
                onClick={() => navigate(`/admin/edit-event/${event.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:translate-y-[-4px] transition-all cursor-pointer group h-full flex flex-col"
              >
                <div className="h-48 w-full bg-gray-200 relative overflow-hidden">
                  <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm uppercase tracking-wide">
                    {event.category}
                  </div>
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${getStatusColor(event.status)}`}>
                    {event.status}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2 line-clamp-2">{event.title}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-500 text-sm">
                      <Calendar size={16} className="mr-2 text-primary/70" />
                      {formatDate(event.eventDate)} • {formatTime(event.eventDate)}
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <MapPin size={16} className="mr-2 text-primary/70" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center">
                      <Users size={14} className="mr-1 text-gray-400" />
                      <span className="font-semibold">{event.totalSlots - event.availableSlots}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span>{event.totalSlots}</span>
                    </div>
                    <div className="font-medium text-green-600">
                      Est. ${((event.totalSlots - event.availableSlots) * event.price).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Student view - new dark theme design
  return (
    <div className="relative min-h-screen w-full flex flex-col pb-28 bg-backgroundLight dark:bg-background font-display text-slate-800 dark:text-slate-100 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-backgroundLight/90 dark:bg-background/90 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="flex items-center justify-between px-5 h-16 max-w-lg mx-auto w-full">
          <div className="flex items-center">
            <button 
              onClick={() => {}}
              className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">menu</span>
            </button>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white absolute left-1/2 -translate-x-1/2">EventEase</h1>
          <div className="flex items-center -mr-2">
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">search</span>
            </button>
            <button 
              onClick={() => setShowFilter(!showFilter)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">filter_list</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-5 pb-4 max-w-lg mx-auto w-full">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input 
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#1c2436] border-none rounded-full py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Category Filter */}
        {showFilter && (
          <div className="px-5 pb-4 max-w-lg mx-auto w-full">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === 'all' 
                    ? 'bg-primary text-white' 
                    : 'bg-slate-100 dark:bg-[#1c2436] text-slate-600 dark:text-slate-300'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 dark:bg-[#1c2436] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-30 bg-backgroundLight dark:bg-background pt-4 pb-2 px-5 shadow-sm dark:shadow-none">
        <div className="max-w-lg mx-auto w-full bg-slate-200 dark:bg-[#1c2436] p-1.5 rounded-full flex relative">
          <button 
            onClick={() => setFilter('current')}
            className={`flex-1 text-center py-2.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'current' 
                ? 'text-white bg-primary shadow-lg shadow-primary/30' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Current
          </button>
          <button 
            onClick={() => setFilter('upcoming')}
            className={`flex-1 text-center py-2.5 rounded-full text-sm transition-colors relative overflow-hidden ${
              filter === 'upcoming' 
                ? 'font-bold text-white bg-primary shadow-lg shadow-primary/30' 
                : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="relative z-10">Upcoming</span>
          </button>
          <button 
            onClick={() => setFilter('past')}
            className={`flex-1 text-center py-2.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'past' 
                ? 'text-white bg-primary shadow-lg shadow-primary/30' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {/* Events List */}
      <main className="flex-1 px-5 pt-4 space-y-6 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="space-y-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-72 bg-slate-200 dark:bg-surface rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-surface flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-[40px]">event_busy</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No events found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Try adjusting your search or filters.</p>
            <button 
              onClick={fetchEvents}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold shadow-lg shadow-primary/25 hover:bg-primaryDark transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              Refresh
            </button>
          </div>
        ) : (
          filteredEvents.map(event => {
            const isBooked = bookedEventIds.includes(event.id);
            const attendees = getRandomAttendees();
            const bookedCount = event.totalSlots - event.availableSlots;
            
            return (
              <article 
                key={event.id}
                onClick={() => navigate(`/student/event/${event.id}`)}
                className="group relative flex flex-col bg-white dark:bg-surface rounded-3xl shadow-card dark:shadow-none border border-slate-100 dark:border-slate-800/60 overflow-hidden transform transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                {/* Event Image */}
                <div className="relative h-48 w-full overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url("${event.imageUrl}")` }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-xs font-semibold text-white tracking-wide uppercase shadow-sm">
                      {event.category}
                    </span>
                  </div>

                  {/* Price Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-lg">
                      {event.price === 0 ? 'FREE' : `$${event.price}`}
                    </span>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-5 flex flex-col gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-primary dark:text-accent text-xs font-bold uppercase tracking-wider mb-1.5">
                      <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                      {formatDate(event.eventDate)} • {formatTime(event.eventDate)}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{event.title}</h3>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    {/* Attendees or Location */}
                    {bookedCount > 0 ? (
                      <div className="flex -space-x-2 overflow-hidden pl-1">
                        {attendees.map((a, i) => (
                          <div 
                            key={i}
                            className={`inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface ${a.color} flex items-center justify-center text-[10px] font-bold text-white`}
                          >
                            {a.initials}
                          </div>
                        ))}
                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          +{bookedCount}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                        {event.venue}
                      </div>
                    )}

                    {/* Action Button */}
                    {isBooked ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/student/event/${event.id}`);
                        }}
                        className="flex items-center justify-center px-6 py-2.5 bg-transparent border border-primary text-primary hover:bg-primary hover:text-white text-sm font-bold rounded-full transition-all active:scale-95 tracking-wide"
                      >
                        View Ticket
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/student/event/${event.id}`);
                        }}
                        className="flex items-center justify-center px-6 py-2.5 bg-primary hover:bg-primaryDark text-white text-sm font-bold rounded-full shadow-lg shadow-primary/25 transition-all active:scale-95 tracking-wide"
                      >
                        Book Slot
                      </button>
                    )}
                  </div>
                </div>
              </article>
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