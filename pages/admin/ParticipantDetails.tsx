import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { backend } from '../../services/mockBackend';
import { Booking, Event, User } from '../../types';

interface ParticipantData {
  booking: Booking;
  user: User | null;
  event: Event | null;
}

export default function ParticipantDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [data, setData] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return;
      try {
        setLoading(true);
        const participantData = await backend.getParticipantDetails(bookingId);
        setData(participantData);
      } catch (error) {
        console.error('Error fetching participant details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bookingId]);

  const handleCheckIn = async () => {
    if (!data || !bookingId) return;
    try {
      setCheckingIn(true);
      await backend.checkInParticipant(bookingId);
      // Refresh data after check-in
      const updatedData = await backend.getParticipantDetails(bookingId);
      setData(updatedData);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleContact = () => {
    if (data?.user?.email) {
      window.location.href = `mailto:${data.user.email}`;
    }
  };

  const handleCancelBooking = async () => {
    if (!data || !bookingId) return;
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await backend.cancelBooking(bookingId);
      navigate(-1);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/20',
          dotColor: 'bg-green-500',
          label: 'PAID'
        };
      case 'checked_in':
        return {
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/20',
          dotColor: 'bg-blue-500',
          label: 'CHECKED IN'
        };
      case 'cancelled':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/20',
          dotColor: 'bg-red-500',
          label: 'CANCELLED'
        };
      default:
        return {
          bg: 'bg-slate-500/20',
          text: 'text-slate-400',
          border: 'border-slate-500/20',
          dotColor: 'bg-slate-500',
          label: status.toUpperCase()
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#0B0E14] font-display text-white antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <span className="material-symbols-outlined animate-spin text-indigo-400 text-[48px]">progress_activity</span>
          <p className="mt-4 text-slate-400">Loading participant details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relative min-h-screen bg-[#0B0E14] font-display text-white antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <span className="material-symbols-outlined text-slate-500 text-[48px]">error</span>
          <p className="mt-4 text-slate-400">Participant not found</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-indigo-500 text-white rounded-xl font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { booking, user, event } = data;
  const statusBadge = getStatusBadge(booking.status);

  return (
    <div className="relative min-h-screen bg-[#0B0E14] font-display text-white antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Gradient Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto">
        
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5">
          <button 
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight text-center flex-1">Participant Details</h2>
          <div className="relative">
            <button 
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
            
            {/* More Options Dropdown */}
            {showMoreOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreOptions(false)}></div>
                <div className="absolute right-0 top-12 bg-[#151921] rounded-xl shadow-xl border border-white/10 overflow-hidden z-50 min-w-[180px]">
                  <button 
                    onClick={() => {
                      setShowMoreOptions(false);
                      handleCancelBooking();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                    Cancel Booking
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 flex flex-col gap-6 p-5 pb-48">
          
          {/* Profile Section */}
          <section className="flex flex-col items-center gap-4 mt-2">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full opacity-75 blur group-hover:opacity-100 transition duration-200"></div>
              <div 
                className="relative bg-center bg-no-repeat bg-cover rounded-full h-32 w-32 border-4 border-[#0B0E14] shadow-xl flex items-center justify-center bg-indigo-500/20"
                style={user?.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")` } : {}}
              >
                {!user?.avatarUrl && (
                  <span className="text-4xl font-bold text-indigo-400">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              {booking.status === 'checked_in' && (
                <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-[#0B0E14] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {user?.name || 'Unknown User'}
              </h1>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <span>{user?.rollNo || 'N/A'}</span>
                <span className="size-1 rounded-full bg-slate-600"></span>
                <span>{user?.department || 'N/A'}</span>
              </div>
              <p className="text-slate-500 text-xs mt-1 font-normal">{user?.email}</p>
            </div>
          </section>

          {/* Ticket & Status Card */}
          <section className="bg-[#151921] rounded-2xl overflow-hidden shadow-lg border border-white/5">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Ticket Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text} text-xs font-bold border ${statusBadge.border} w-fit`}>
                  <span className={`size-1.5 rounded-full ${statusBadge.dotColor} ${booking.status === 'confirmed' ? 'animate-pulse' : ''}`}></span>
                  {statusBadge.label}
                </span>
              </div>
              {/* QR Code Visual */}
              <div className="size-12 bg-white p-1 rounded-lg shadow-sm">
                <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-600 text-[24px]">qr_code_2</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/5">
              <div className="flex flex-col gap-1 p-4">
                <p className="text-slate-400 text-xs font-medium">Ticket ID</p>
                <p className="text-white text-sm font-semibold tracking-wide font-mono">{booking.ticketId}</p>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <p className="text-slate-400 text-xs font-medium">Ticket Type</p>
                <p className="text-indigo-400 text-sm font-semibold">
                  {booking.amountPaid === 0 ? 'Free Pass' : booking.amountPaid >= 50 ? 'VIP Access' : 'Standard'}
                </p>
              </div>
              <div className="flex flex-col gap-1 p-4 border-t border-white/5">
                <p className="text-slate-400 text-xs font-medium">Purchase Date</p>
                <p className="text-white text-sm font-medium">{formatDate(booking.bookedAt)}</p>
              </div>
              <div className="flex flex-col gap-1 p-4 border-t border-white/5">
                <p className="text-slate-400 text-xs font-medium">Amount Paid</p>
                <p className="text-white text-sm font-medium">
                  {booking.amountPaid === 0 ? 'Free' : `$${booking.amountPaid.toFixed(2)}`}
                </p>
              </div>
            </div>
          </section>

          {/* Event Info Card */}
          {event && (
            <section className="bg-[#151921] rounded-2xl overflow-hidden shadow-lg border border-white/5">
              <div className="p-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Event Details</h3>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="size-14 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-indigo-400 text-[28px]">event</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-base">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-outlined text-slate-500 text-[16px]">calendar_today</span>
                      <span className="text-slate-400 text-xs">{formatDate(event.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-outlined text-slate-500 text-[16px]">location_on</span>
                      <span className="text-slate-400 text-xs">{event.venue}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Activity Log */}
          <section>
            <h3 className="text-sm font-bold text-white mb-3 px-1">Recent Activity</h3>
            <div className="flex flex-col gap-3">
              {booking.status === 'checked_in' && booking.checkedInAt && (
                <div className="flex items-center gap-3 p-3 bg-[#151921] rounded-xl border border-white/5 shadow-sm">
                  <div className="size-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">event_available</span>
                  </div>
                  <div className="flex flex-col flex-1">
                    <p className="text-sm font-medium text-white">Event Check-in</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(booking.checkedInAt)}, {formatTime(booking.checkedInAt)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-[#151921] rounded-xl border border-white/5 shadow-sm">
                <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
                <div className="flex flex-col flex-1">
                  <p className="text-sm font-medium text-white">Ticket Purchased</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(booking.bookedAt)}, {formatTime(booking.bookedAt)}
                  </p>
                </div>
              </div>
              {booking.status === 'cancelled' && (
                <div className="flex items-center gap-3 p-3 bg-[#151921] rounded-xl border border-white/5 shadow-sm opacity-60">
                  <div className="size-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                  </div>
                  <div className="flex flex-col flex-1">
                    <p className="text-sm font-medium text-white">Booking Cancelled</p>
                    <p className="text-xs text-slate-500">Status updated</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0B0E14] border-t border-white/5 z-40">
          {/* Gradient fade */}
          <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-[#0B0E14] to-transparent pointer-events-none"></div>
          <div className="p-4 pb-6">
            <div className="flex flex-col gap-3 w-full">
              {/* Primary Action */}
              {booking.status === 'confirmed' && (
                <button 
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-indigo-500 hover:bg-indigo-600 text-white gap-3 px-6 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {checkingIn ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                      <span className="text-lg font-bold tracking-wide">Checking in...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                      <span className="text-lg font-bold tracking-wide">Check-in Participant</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-xl"></div>
                </button>
              )}
              
              {booking.status === 'checked_in' && (
                <div className="flex w-full items-center justify-center rounded-xl h-14 bg-emerald-500/20 text-emerald-400 gap-3 px-6 border border-emerald-500/30">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                  <span className="text-lg font-bold tracking-wide">Already Checked In</span>
                </div>
              )}

              {booking.status === 'cancelled' && (
                <div className="flex w-full items-center justify-center rounded-xl h-14 bg-red-500/20 text-red-400 gap-3 px-6 border border-red-500/30">
                  <span className="material-symbols-outlined text-[24px]">block</span>
                  <span className="text-lg font-bold tracking-wide">Booking Cancelled</span>
                </div>
              )}

              {/* Secondary Action */}
              <button 
                onClick={handleContact}
                className="flex w-full cursor-pointer items-center justify-center rounded-xl h-12 bg-transparent border border-white/10 text-slate-300 hover:bg-white/5 gap-2 px-6 text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[20px]">mail</span>
                <span>Contact Student</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
