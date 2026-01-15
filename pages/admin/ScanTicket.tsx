import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getParticipantDetails, findBookingByTicketId } from '../../services/backend';
import { User, Booking, Event } from '../../types';
import { useAuth } from '../../App';
import { useCheckInParticipant, useEventParticipants } from '../../hooks';

interface CheckedInData {
  booking: Booking;
  user: User;
  event: Event;
}

// Error types for detailed error handling
type ErrorType = 'already_checked_in' | 'cancelled' | 'waitlist' | 'not_found' | 'wrong_event' | 'invalid_format' | 'expired' | 'generic';

interface TicketError {
  type: ErrorType;
  title: string;
  message: string;
  reason: string;
  previousScan?: string;
  eventMatch?: string;
  userName?: string;
}

export default function ScanTicket() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth(); // Get the authenticated admin user
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<TicketError | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualId, setManualId] = useState('');
  const [checkedInData, setCheckedInData] = useState<CheckedInData | null>(null);
  const [processing, setProcessing] = useState(false);
  const scanLineRef = useRef<HTMLDivElement>(null);

  // Get eventId from location state if provided
  const eventId = (location.state as any)?.eventId;

  // React Query hooks
  const checkInMutation = useCheckInParticipant();
  const { data: eventParticipants = [] } = useEventParticipants(eventId || 'e1');

  // Helper function to create detailed error
  const createTicketError = (
    type: ErrorType, 
    details?: { userName?: string; checkedInAt?: string; eventTitle?: string }
  ): TicketError => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    switch (type) {
      case 'already_checked_in':
        return {
          type,
          title: 'Already Checked In',
          message: `${details?.userName || 'This participant'} has already been checked in.`,
          reason: 'Duplicate Entry',
          previousScan: details?.checkedInAt || `Today at ${timeString}`,
          eventMatch: 'Valid',
          userName: details?.userName
        };
      case 'cancelled':
        return {
          type,
          title: 'Booking Cancelled',
          message: 'This booking has been cancelled and is no longer valid.',
          reason: 'Cancelled Booking',
          eventMatch: 'N/A'
        };
      case 'waitlist':
        return {
          type,
          title: 'Waitlist Only',
          message: 'This participant is on the waitlist and has not been confirmed.',
          reason: 'Not Confirmed',
          eventMatch: 'Pending'
        };
      case 'not_found':
        return {
          type,
          title: 'Ticket Not Found',
          message: 'This ticket does not exist in our system.',
          reason: 'Invalid Ticket ID',
          eventMatch: 'Not Found'
        };
      case 'wrong_event':
        return {
          type,
          title: 'Wrong Event',
          message: 'This ticket is for a different event.',
          reason: 'Event Mismatch',
          eventMatch: details?.eventTitle || 'Wrong Session ID'
        };
      case 'invalid_format':
        return {
          type,
          title: 'Invalid Format',
          message: 'The ticket ID format is not valid.',
          reason: 'Malformed ID',
          eventMatch: 'N/A'
        };
      case 'expired':
        return {
          type,
          title: 'Ticket Expired',
          message: 'This event has already ended.',
          reason: 'Event Completed',
          eventMatch: 'Expired'
        };
      default:
        return {
          type: 'generic',
          title: 'Invalid Ticket',
          message: 'This ticket is not valid for the current session.',
          reason: 'Unknown Error',
          eventMatch: 'Error'
        };
    }
  };

  // Animate scan line
  useEffect(() => {
    if (!scanning || checkedInData) return;
    
    const interval = setInterval(() => {
      if (scanLineRef.current) {
        const current = parseFloat(scanLineRef.current.style.top || '10%');
        const next = current >= 85 ? 10 : current + 2;
        scanLineRef.current.style.top = `${next}%`;
      }
    }, 30);

    return () => clearInterval(interval);
  }, [scanning, checkedInData]);

  // Simulate QR code detection (in a real app, you'd use a camera library)
  const simulateScan = async () => {
    if (processing) return;
    
    setProcessing(true);
    setError(null);
    setTicketError(null);
    
    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Use React Query cached data for participants
      const confirmedBookings = eventParticipants.filter(b => b.status === 'confirmed');
      
      if (confirmedBookings.length === 0) {
        // If no pending check-ins, simulate an error scenario
        const checkedInBookings = eventParticipants.filter(b => b.status === 'checked_in');
        if (checkedInBookings.length > 0) {
          // Show already checked in error
          const randomCheckedIn = checkedInBookings[Math.floor(Math.random() * checkedInBookings.length)];
          setTicketError(createTicketError('already_checked_in', {
            userName: randomCheckedIn.userName || 'Participant',
            checkedInAt: randomCheckedIn.checkedInAt 
              ? new Date(randomCheckedIn.checkedInAt).toLocaleString('en-US', { 
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
                })
              : undefined
          }));
          setProcessing(false);
          return;
        }
        throw new Error('No pending check-ins found');
      }
      
      // Pick a random booking
      const randomBooking = confirmedBookings[Math.floor(Math.random() * confirmedBookings.length)];
      
      // Check in the participant
      await handleCheckIn(randomBooking.id);
    } catch (err) {
      setError((err as Error).message);
      setProcessing(false);
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    // SECURITY: Validate booking ID format
    if (!bookingId || typeof bookingId !== 'string') {
      setTicketError(createTicketError('invalid_format'));
      return;
    }

    // SECURITY: Sanitize booking ID to prevent injection
    const sanitizedBookingId = bookingId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedBookingId !== bookingId.trim()) {
      setTicketError(createTicketError('invalid_format'));
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setTicketError(null);
      
      // Get participant details first
      const { booking, user, event } = await getParticipantDetails(sanitizedBookingId);
      
      // Validate all required data exists
      if (!booking || !user || !event) {
        setTicketError(createTicketError('not_found'));
        setProcessing(false);
        return;
      }
      
      // Check if ticket is for the correct event (if eventId is specified)
      if (eventId && booking.eventId !== eventId) {
        setTicketError(createTicketError('wrong_event', { eventTitle: event.title }));
        setProcessing(false);
        return;
      }
      
      // Check booking status with proper null check
      const status = booking.status?.toLowerCase();
      if (status === 'checked_in') {
        setTicketError(createTicketError('already_checked_in', {
          userName: user.name,
          checkedInAt: booking.checkedInAt 
            ? new Date(booking.checkedInAt).toLocaleString('en-US', { 
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
              })
            : undefined
        }));
        setProcessing(false);
        return;
      }
      
      if (status === 'cancelled') {
        setTicketError(createTicketError('cancelled'));
        setProcessing(false);
        return;
      }

      if (status === 'waitlist') {
        setTicketError(createTicketError('waitlist'));
        setProcessing(false);
        return;
      }
      
      // Check if event has already ended
      const eventDate = new Date(event.eventDate);
      const now = new Date();
      const eventEndTime = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // Assume 4 hour event
      if (now > eventEndTime) {
        setTicketError(createTicketError('expired'));
        setProcessing(false);
        return;
      }
      
      // SECURITY: Validate current user exists
      if (!currentUser?.id) {
        setError('Authentication required - please log in again');
        setProcessing(false);
        return;
      }
      
      // Perform check-in with required parameters (bookingId, staffUserId, method)
      await checkInMutation.mutateAsync({
        bookingId: sanitizedBookingId,
        checkedInBy: currentUser.id,
        method: 'qr_scan'
      });
      
      // Update booking status locally for display
      const checkedInBooking: Booking = {
        ...booking,
        status: 'checked_in' as const
      };
      
      // Show success modal
      setCheckedInData({
        booking: checkedInBooking,
        user,
        event
      });
      setScanning(false);
    } catch (err) {
      const error = err as Error;
      console.error('[ScanTicket] Check-in error:', error);
      
      // Parse error message to show appropriate modal
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('already checked in') || errorMsg.includes('duplicate')) {
        setTicketError(createTicketError('already_checked_in'));
      } else if (errorMsg.includes('cancelled')) {
        setTicketError(createTicketError('cancelled'));
      } else if (errorMsg.includes('waitlist')) {
        setTicketError(createTicketError('waitlist'));
      } else if (errorMsg.includes('not found') || errorMsg.includes('invalid')) {
        setTicketError(createTicketError('not_found'));
      } else {
        setError(error.message || 'Check-in failed');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualId.trim()) {
      setError('Please enter a ticket ID');
      return;
    }
    
    setProcessing(true);
    setError(null);
    setTicketError(null);
    
    try {
      // Search for booking by ticket ID
      const result = await findBookingByTicketId(manualId.trim());
      
      if (!result) {
        setShowManualEntry(false);
        setManualId('');
        setTicketError(createTicketError('not_found'));
        setProcessing(false);
        return;
      }
      
      await handleCheckIn(result.id);
      setShowManualEntry(false);
      setManualId('');
    } catch (err) {
      setError((err as Error).message);
      setProcessing(false);
    }
  };

  const handleDone = () => {
    setCheckedInData(null);
    setScanning(true);
    setError(null);
    setTicketError(null);
  };

  const handleScanNext = () => {
    setCheckedInData(null);
    setScanning(true);
    setError(null);
    setTicketError(null);
  };

  const handleErrorDismiss = () => {
    setTicketError(null);
    setError(null);
  };

  const handleErrorTryAgain = () => {
    setTicketError(null);
    setError(null);
    // Reset for next scan
  };

  const handleErrorManualEntry = () => {
    setTicketError(null);
    setError(null);
    setShowManualEntry(true);
  };

  return (
    <div className="font-display bg-[#101622] text-white h-screen w-full relative overflow-hidden flex flex-col">
      {/* Camera Viewfinder Background - Simulated */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(16, 22, 34, 0.3), rgba(16, 22, 34, 0.5)), url('https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?w=800&h=1200&fit=crop')`,
            filter: 'brightness(0.7)'
          }}
        />
      </div>

      {/* UI Overlay Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 pt-12 z-30 w-full bg-gradient-to-b from-black/60 to-transparent">
          <div className="w-12 h-12"></div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight drop-shadow-md">
            Scan Ticket
          </h2>
          <div className="flex w-12 items-center justify-end">
            <button 
              onClick={() => setFlashOn(!flashOn)}
              className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border border-white/10 transition-colors ${
                flashOn ? 'bg-[#135bec] text-white' : 'bg-white/10 text-white hover:bg-[#135bec]'
              }`}
            >
              <span 
                className="material-symbols-outlined text-xl" 
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {flashOn ? 'flash_on' : 'flash_off'}
              </span>
            </button>
          </div>
        </div>

        {/* Central Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full">
          {/* Scanner Frame */}
          <div 
            onClick={simulateScan}
            className="relative w-72 h-72 rounded-3xl z-20 flex items-center justify-center cursor-pointer"
            style={{ boxShadow: '0 0 0 4000px rgba(16, 22, 34, 0.85)' }}
          >
            {/* Corner Indicators */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[5px] border-l-[5px] border-[#135bec] rounded-tl-2xl -mt-[2px] -ml-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[5px] border-r-[5px] border-[#135bec] rounded-tr-2xl -mt-[2px] -mr-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[5px] border-l-[5px] border-[#135bec] rounded-bl-2xl -mb-[2px] -ml-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[5px] border-r-[5px] border-[#135bec] rounded-br-2xl -mb-[2px] -mr-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]"></div>

            {/* Laser Scan Line */}
            <div 
              ref={scanLineRef}
              className="absolute w-[90%] h-[2px] bg-gradient-to-r from-transparent via-[#135bec] to-transparent shadow-[0_0_15px_rgba(19,91,236,1)] opacity-90 transition-all"
              style={{ top: '10%' }}
            ></div>

            {/* Inner Guide */}
            <div className="absolute inset-4 border border-white/20 rounded-xl opacity-50"></div>

            {/* Processing Indicator */}
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl">
                <span className="material-symbols-outlined text-[48px] text-[#135bec] animate-spin">
                  progress_activity
                </span>
              </div>
            )}

            {/* Tap to scan hint */}
            {!processing && (
              <p className="text-white/60 text-sm font-medium">Tap to simulate scan</p>
            )}
          </div>

          {/* Instruction Text */}
          <div className="absolute mt-[24rem] z-30 px-6 w-full flex justify-center">
            <div className="bg-black/40 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/10 max-w-xs">
              <p className="text-white text-base font-medium leading-snug text-center drop-shadow-sm">
                {error ? (
                  <span className="text-red-400">{error}</span>
                ) : (
                  'Align the QR code within the frame to check-in participant.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full px-6 pb-8 pt-4 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-5">
          {/* Manual Entry Link */}
          <button 
            onClick={() => setShowManualEntry(true)}
            className="w-full text-center group"
          >
            <p className="text-[#92a4c9] text-sm font-medium leading-normal group-hover:text-white transition-colors underline underline-offset-4 decoration-white/20">
              Trouble scanning? Enter ID manually.
            </p>
          </button>

          {/* Cancel Button */}
          <button 
            onClick={() => navigate(-1)}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[#232f48] hover:bg-[#2c3b59] active:bg-[#1d273b] border border-white/5 text-white text-base font-bold leading-normal tracking-[0.015em] transition-all shadow-lg"
          >
            <span className="truncate">Cancel</span>
          </button>

          <div className="h-2"></div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-[#111722]/80 backdrop-blur-md"
            onClick={() => setShowManualEntry(false)}
          />
          <div className="relative w-full max-w-sm bg-[#192233]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Enter Ticket ID</h3>
            
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value.toUpperCase())}
              placeholder="e.g. EVT-9982-XJ"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-slate-500 text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
            />

            {error && (
              <p className="text-red-400 text-sm text-center mt-3">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowManualEntry(false);
                  setError(null);
                  setManualId('');
                }}
                className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEntry}
                disabled={processing}
                className="flex-1 h-12 rounded-xl bg-[#135bec] text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {processing ? 'Checking...' : 'Check In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {checkedInData && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#111722]/60 backdrop-blur-md" />
          
          {/* Modal Card */}
          <div 
            className="relative w-full max-w-[340px] rounded-[32px] p-8 flex flex-col items-center text-center overflow-hidden"
            style={{
              background: 'rgba(25, 34, 51, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Decorative Top Gradient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#135bec]/20 blur-[80px] rounded-full pointer-events-none"></div>

            {/* Success Icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-green-500 blur-xl opacity-20 animate-pulse"></div>
              <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-green-500/10 ring-1 ring-inset ring-green-400/30">
                <span 
                  className="material-symbols-outlined text-[40px] text-green-400"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
                >
                  check_circle
                </span>
              </div>
            </div>

            {/* Status Headline */}
            <h3 className="text-green-400 font-semibold text-sm tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
              Access Granted
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
            </h3>

            {/* Student Avatar */}
            <div className="mb-4 relative group">
              <div className="absolute inset-0 rounded-full bg-[#135bec] blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative h-28 w-28 p-1 rounded-full border-2 border-[#135bec] bg-[#192233]">
                <div 
                  className="h-full w-full rounded-full overflow-hidden bg-slate-700 bg-center bg-cover"
                  style={{ 
                    backgroundImage: checkedInData.user.avatarUrl 
                      ? `url('${checkedInData.user.avatarUrl}')` 
                      : 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)'
                  }}
                >
                  {!checkedInData.user.avatarUrl && (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                      {checkedInData.user.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              {/* Verified Badge */}
              <div className="absolute bottom-1 right-1 h-8 w-8 bg-[#101622] rounded-full flex items-center justify-center border-2 border-[#192233]">
                <div className="h-6 w-6 bg-[#135bec] rounded-full flex items-center justify-center text-white">
                  <span 
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </div>
              </div>
            </div>

            {/* Name & Info */}
            <div className="space-y-1 mb-8">
              <h2 className="text-white text-[28px] font-bold leading-tight tracking-tight">
                {checkedInData.user.name}
              </h2>
              <p className="text-[#92a4c9] text-sm font-medium">
                ID: #{checkedInData.user.rollNo?.split('-').pop() || '00000'} • Class of 2025
              </p>
              <p className="text-xs text-[#92a4c9]/60 font-medium uppercase tracking-wider pt-2">
                {checkedInData.user.department || 'Student'}
              </p>
            </div>

            {/* Action Button */}
            <button 
              onClick={handleDone}
              className="group relative w-full overflow-hidden rounded-xl bg-[#135bec] h-[52px] flex items-center justify-center transition-all hover:bg-blue-600 active:scale-[0.98] shadow-lg shadow-blue-900/20"
            >
              <span className="relative z-10 text-white text-base font-bold tracking-wide">Done</span>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
            </button>
          </div>

          {/* Footer Text */}
          <button 
            onClick={handleScanNext}
            className="mt-8 text-sm text-slate-500 font-medium opacity-60 hover:opacity-100 transition-opacity"
          >
            Tap to scan next student
          </button>
        </div>
      )}

      {/* Invalid Ticket Error Modal */}
      {ticketError && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={handleErrorDismiss}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
          
          {/* Simulated Scanner Background (visible through blur) */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start text-white/40">
              <span className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10">Live Scanner</span>
            </div>
            {/* Scanner Frame (dimmed) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-64 h-64 border-2 border-white rounded-2xl relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-sm"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-sm"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-sm"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-sm"></div>
              </div>
            </div>
          </div>

          {/* The Modal Card */}
          <div 
            className="relative w-full max-w-sm rounded-2xl p-8 shadow-2xl overflow-hidden animate-fade-in-up"
            style={{
              background: 'rgba(34, 16, 16, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative Top Shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            {/* Red Glow Effect */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/20 blur-[80px] rounded-full pointer-events-none"></div>

            {/* Content Wrapper */}
            <div className="flex flex-col items-center text-center relative z-10">
              
              {/* Icon Container with Glow */}
              <div className="relative mb-6">
                {/* Pulsing Glow Effect */}
                <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30 transform scale-150"></div>
                <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                
                {/* Main Icon Circle */}
                <div 
                  className="relative w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <span 
                    className="material-symbols-outlined text-red-500 text-5xl drop-shadow-md"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
                  >
                    {ticketError.type === 'already_checked_in' ? 'person_off' : 
                     ticketError.type === 'cancelled' ? 'event_busy' :
                     ticketError.type === 'waitlist' ? 'hourglass_top' :
                     ticketError.type === 'wrong_event' ? 'wrong_location' :
                     ticketError.type === 'expired' ? 'schedule' :
                     'gpp_bad'}
                  </span>
                </div>
                
                {/* Small decorative badge */}
                <div 
                  className="absolute bottom-0 right-0 rounded-full p-1.5 shadow-lg"
                  style={{
                    background: 'rgba(34, 16, 16, 1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <span 
                    className="material-symbols-outlined text-white text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    priority_high
                  </span>
                </div>
              </div>

              {/* Typography */}
              <h2 className="text-white font-bold text-2xl tracking-tight mb-2">
                {ticketError.title}
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-1 px-2">
                {ticketError.message}
              </p>
              <p className="text-white/50 text-xs mb-6">
                Reason: {ticketError.reason}
              </p>

              {/* Data/Details Card */}
              <div 
                className="w-full rounded-lg p-4 mb-8 text-left"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                {/* Previous Scan Info */}
                {ticketError.previousScan && (
                  <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <span 
                        className="material-symbols-outlined text-white/40 text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        history
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Previous Scan</p>
                      <p className="text-sm text-white font-medium">{ticketError.previousScan}</p>
                    </div>
                  </div>
                )}
                
                {/* Event Match Info */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <span 
                      className="material-symbols-outlined text-white/40 text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      event_busy
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Status</p>
                    <p className={`text-sm font-medium ${
                      ticketError.eventMatch === 'Valid' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {ticketError.eventMatch}
                    </p>
                  </div>
                </div>

                {/* User Name if available */}
                {ticketError.userName && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <span 
                        className="material-symbols-outlined text-white/40 text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        person
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Participant</p>
                      <p className="text-sm text-white font-medium">{ticketError.userName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="w-full space-y-3">
                <button 
                  onClick={handleErrorTryAgain}
                  className="w-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
                  style={{ boxShadow: '0 10px 30px -10px rgba(239, 68, 68, 0.4)' }}
                >
                  <span 
                    className="material-symbols-outlined text-xl group-hover:rotate-180 transition-transform duration-500"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    refresh
                  </span>
                  Try Again
                </button>
                
                <button 
                  onClick={handleErrorManualEntry}
                  className="w-full bg-transparent hover:bg-white/5 active:bg-white/10 text-white border border-white/20 font-medium py-4 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span 
                    className="material-symbols-outlined text-xl text-white/60"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    keyboard
                  </span>
                  Manual Entry
                </button>
              </div>
            </div>
          </div>

          {/* Dismiss hint */}
          <div className="absolute bottom-10 text-white/40 text-xs font-medium uppercase tracking-widest animate-pulse pointer-events-none">
            Tap background to dismiss
          </div>
        </div>
      )}
    </div>
  );
}
