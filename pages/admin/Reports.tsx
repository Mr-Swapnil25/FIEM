import React, { useState, useEffect, useRef } from 'react';
import { getEvents, getEventParticipants, getAdminStats, subscribeToEvents } from '../../services/backend';
import { Event, Booking } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { exportReport, ExportFormat } from '../../services/exportReports';

export default function Reports() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [participants, setParticipants] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    getEvents().then(data => {
      setEvents(data);
      if(data.length > 0) setSelectedEventId(data[0].id);
    }).catch(error => {
      console.error('Error fetching events:', error);
    });
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToEvents((updatedEvents) => {
      setEvents(updatedEvents);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if(selectedEventId) {
      setLoading(true);
      getEventParticipants(selectedEventId).then(data => {
        setParticipants(data);
        setLoading(false);
      }).catch(error => {
        console.error('Error fetching participants:', error);
        setLoading(false);
      });
    }
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  
  const filteredParticipants = participants.filter(p => 
    p.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: participants.length,
    confirmed: participants.filter(p => p.status === 'confirmed').length,
    checkedIn: participants.filter(p => p.status === 'checked_in').length,
  };

  const handleExport = async (format: ExportFormat) => {
    if (!selectedEvent) return;
    
    setIsExporting(true);
    setShowExportMenu(false);
    
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      exportReport(format, {
        participants: filteredParticipants,
        event: selectedEvent,
        stats,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-white tracking-wide">Reports</h1>
          
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!selectedEvent || participants.length === 0 || isExporting}
              className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined ${isExporting ? 'animate-spin' : ''}`}>
                {isExporting ? 'progress_activity' : 'download'}
              </span>
            </button>
            
            {/* Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1f2e] rounded-xl border border-white/10 shadow-xl shadow-black/50 overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Export Format</p>
                </div>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">table_chart</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">CSV</p>
                    <p className="text-[10px] text-slate-500">Spreadsheet compatible</p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-red-400 text-[20px]">picture_as_pdf</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">PDF</p>
                    <p className="text-[10px] text-slate-500">Professional report</p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-green-400 text-[20px]">grid_on</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Excel</p>
                    <p className="text-[10px] text-slate-500">Multi-sheet workbook</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Event Selector */}
        <div className="px-5 py-4">
          <button 
            onClick={() => setShowEventSelector(!showEventSelector)}
            className="w-full flex items-center justify-between p-4 bg-[#151921] rounded-xl border border-white/5 hover:border-indigo-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-indigo-400">event</span>
              <div className="text-left">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Selected Event</p>
                <p className="text-sm font-semibold text-white truncate max-w-[200px]">
                  {selectedEvent?.title || 'Select an event'}
                </p>
              </div>
            </div>
            <span className={`material-symbols-outlined text-slate-400 transition-transform ${showEventSelector ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {/* Event Dropdown */}
          {showEventSelector && (
            <div className="mt-2 bg-[#151921] rounded-xl border border-white/5 overflow-hidden max-h-64 overflow-y-auto">
              {events.map(e => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEventId(e.id);
                    setShowEventSelector(false);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 transition flex items-center justify-between ${
                    selectedEventId === e.id 
                      ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div>
                    <p className={`font-medium text-sm truncate ${selectedEventId === e.id ? 'text-indigo-400' : 'text-white'}`}>
                      {e.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(e.eventDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedEventId === e.id && (
                    <span className="material-symbols-outlined text-indigo-400 text-[20px]">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {selectedEvent && (
          <div className="grid grid-cols-3 gap-3 px-5 mb-4">
            <div className="bg-[#151921] p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-400 text-[18px]">group</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{participants.length}</p>
            </div>
            <div className="bg-[#151921] p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Confirmed</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {participants.filter(p => p.status === 'confirmed').length}
              </p>
            </div>
            <div className="bg-[#151921] p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-amber-400 text-[18px]">event_seat</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Slots</span>
              </div>
              <p className="text-2xl font-bold text-white">{selectedEvent.availableSlots}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-5 mb-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#151921] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Participants List */}
        <div className="px-5 flex-1">
          <div className="bg-[#151921] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Participants</h3>
              <span className="text-xs text-slate-500">{filteredParticipants.length} found</span>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined animate-spin text-indigo-400 text-[32px]">progress_activity</span>
                <p className="text-slate-500 mt-4 text-sm">Loading participants...</p>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-slate-500 text-[32px]">group_off</span>
                </div>
                <p className="text-slate-500 text-sm">
                  {searchTerm ? 'No matching participants found.' : 'No registrations yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredParticipants.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => navigate(`/admin/participant/${p.id}`)}
                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0">
                      {p.userName?.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{p.userName}</p>
                      <p className="text-xs text-slate-500 truncate">{p.userEmail}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-slate-500">{p.ticketId}</span>
                        <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          p.status === 'confirmed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : p.status === 'checked_in'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Arrow */}
                    <div className="flex items-center gap-3">
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-white">
                          {p.amountPaid === 0 ? 'Free' : `$${p.amountPaid}`}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(p.bookedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">chevron_right</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <span className="material-symbols-outlined text-[24px]">dashboard</span>
                <span className="text-[10px] font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => navigate('/admin/events')}
                className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${
                  location.pathname === '/admin/events' ? 'text-primary' : 'text-slate-400 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">event</span>
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
                <span 
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: location.pathname === '/admin/reports' ? "'FILL' 1" : "'FILL' 0" }}
                >group</span>
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