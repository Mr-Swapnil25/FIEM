import React, { useState, useEffect } from 'react';
import { backend } from '../../services/mockBackend';
import { Event, Booking } from '../../types';
import { Download, Search, CheckCircle, Users, Calendar, FileText, Filter } from 'lucide-react';

export default function Reports() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [participants, setParticipants] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    backend.getEvents().then(data => {
      setEvents(data);
      if(data.length > 0) setSelectedEventId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if(selectedEventId) {
      setLoading(true);
      backend.getEventParticipants(selectedEventId).then(data => {
        setParticipants(data);
        setLoading(false);
      });
    }
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  
  const filteredParticipants = participants.filter(p => 
    p.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Attendees</h1>
          <p className="text-gray-500 text-sm">View and export participant data for your events</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primaryLight transition shadow-sm">
          <Download size={18} className="mr-2" /> Export All Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Event Selector Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm flex items-center">
                <Calendar size={16} className="mr-2 text-gray-400" /> Select Event
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {events.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEventId(e.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${
                    selectedEventId === e.id 
                      ? 'bg-primary/5 border-l-4 border-l-primary' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className={`font-medium text-sm truncate ${selectedEventId === e.id ? 'text-primary' : 'text-gray-800'}`}>
                    {e.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(e.eventDate).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats Cards */}
          {selectedEvent && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-50 rounded-lg mr-4">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase">Total Registrations</p>
                    <p className="text-2xl font-bold text-gray-900">{participants.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-green-50 rounded-lg mr-4">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase">Confirmed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {participants.filter(p => p.status === 'confirmed').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-50 rounded-lg mr-4">
                    <FileText size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase">Available Slots</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedEvent.availableSlots}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Participants Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-gray-800">Participants List</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search participants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                  />
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                  <Download size={18} />
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading participants...</p>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Users size={40} className="mx-auto mb-4 opacity-30" />
                <p>{searchTerm ? 'No matching participants found.' : 'No registrations yet.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Participant</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ticket ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Booked At</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParticipants.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mr-3">
                              {p.userName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{p.userName}</p>
                              <p className="text-xs text-gray-500">{p.userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-600">{p.ticketId}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(p.bookedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                            p.status === 'confirmed' 
                              ? 'bg-green-100 text-green-700' 
                              : p.status === 'checked_in'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {p.status === 'confirmed' && <CheckCircle size={12} className="mr-1" />}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {p.amountPaid === 0 ? 'Free' : `$${p.amountPaid}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
