/**
 * ScanTicket Page
 * 
 * Ticket scanning page for event check-in.
 * Uses extracted hooks and components for clean separation of concerns.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';
import { useEventParticipants } from '../../hooks';
import { useQRScanner } from '../../hooks/useQRScanner';
import { useCheckInLogic } from '../../hooks/useCheckInLogic';
import { CheckInSuccess } from '../../components/admin/CheckInSuccess';
import { TicketError } from '../../components/admin/TicketError';
import { ManualEntryModal } from '../../components/admin/ManualEntryModal';

export default function ScanTicket() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  const [flashOn, setFlashOn] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const scanLineRef = useRef<HTMLDivElement>(null);

  const eventId = (location.state as { eventId?: string })?.eventId;
  const { data: eventParticipants = [] } = useEventParticipants(eventId || 'e1');

  const {
    processing,
    error,
    ticketError,
    checkedInData,
    handleQRScan,
    handleManualEntry,
    handleCheckIn,
    resetState,
    clearErrors
  } = useCheckInLogic({
    currentUserId: currentUser?.id,
    eventId
  });

  const { stopCamera } = useQRScanner({
    containerId: 'qr-scanner-container',
    onScan: async (data) => {
      await stopCamera();
      await handleQRScan(data);
    },
    autoStart: true
  });

  // Animate scan line
  useEffect(() => {
    if (checkedInData) return;

    const interval = setInterval(() => {
      if (scanLineRef.current) {
        const current = parseFloat(scanLineRef.current.style.top || '10%');
        const next = current >= 85 ? 10 : current + 2;
        scanLineRef.current.style.top = `${next}%`;
      }
    }, 30);

    return () => clearInterval(interval);
  }, [checkedInData]);

  // Demo scan simulation
  const simulateScan = async () => {
    if (processing) return;

    const confirmedBookings = eventParticipants.filter(b => b.status === 'confirmed');
    if (confirmedBookings.length > 0) {
      const randomBooking = confirmedBookings[Math.floor(Math.random() * confirmedBookings.length)];
      await handleCheckIn(randomBooking.id);
    }
  };

  const handleDone = () => resetState();
  const handleScanNext = () => resetState();

  const handleErrorDismiss = () => clearErrors();
  const handleErrorTryAgain = () => clearErrors();
  const handleErrorManualEntry = () => {
    clearErrors();
    setShowManualEntry(true);
  };

  const handleManualSubmit = async (ticketId: string) => {
    await handleManualEntry(ticketId);
    if (!ticketError && !error) {
      setShowManualEntry(false);
    }
  };

  return (
    <div className="font-display bg-[#101622] text-white h-screen w-full relative overflow-hidden flex flex-col">
      {/* Camera Viewfinder Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(16, 22, 34, 0.3), rgba(16, 22, 34, 0.5)), url('https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?w=800&h=1200&fit=crop')`,
            filter: 'brightness(0.7)'
          }}
        />
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 pt-12 z-30 w-full bg-gradient-to-b from-black/60 to-transparent">
          <div className="w-12 h-12" />
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight drop-shadow-md">
            Scan Ticket
          </h2>
          <div className="flex w-12 items-center justify-end">
            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border border-white/10 transition-colors ${flashOn ? 'bg-[#135bec] text-white' : 'bg-white/10 text-white hover:bg-[#135bec]'}`}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {flashOn ? 'flash_on' : 'flash_off'}
              </span>
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full">
          <div
            id="qr-scanner-container"
            onClick={simulateScan}
            className="relative w-72 h-72 rounded-3xl z-20 flex items-center justify-center cursor-pointer"
            style={{ boxShadow: '0 0 0 4000px rgba(16, 22, 34, 0.85)' }}
          >
            {/* Corner Indicators */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[5px] border-l-[5px] border-[#135bec] rounded-tl-2xl -mt-[2px] -ml-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[5px] border-r-[5px] border-[#135bec] rounded-tr-2xl -mt-[2px] -mr-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[5px] border-l-[5px] border-[#135bec] rounded-bl-2xl -mb-[2px] -ml-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[5px] border-r-[5px] border-[#135bec] rounded-br-2xl -mb-[2px] -mr-[2px] drop-shadow-[0_0_8px_rgba(19,91,236,0.6)]" />

            {/* Laser Scan Line */}
            <div
              ref={scanLineRef}
              className="absolute w-[90%] h-[2px] bg-gradient-to-r from-transparent via-[#135bec] to-transparent shadow-[0_0_15px_rgba(19,91,236,1)] opacity-90 transition-all"
              style={{ top: '10%' }}
            />

            {/* Inner Guide */}
            <div className="absolute inset-4 border border-white/20 rounded-xl opacity-50" />

            {/* Processing Indicator */}
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl">
                <span className="material-symbols-outlined text-[48px] text-[#135bec] animate-spin">
                  progress_activity
                </span>
              </div>
            )}

            {/* Tap hint */}
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
          <button onClick={() => setShowManualEntry(true)} className="w-full text-center group">
            <p className="text-[#92a4c9] text-sm font-medium leading-normal group-hover:text-white transition-colors underline underline-offset-4 decoration-white/20">
              Trouble scanning? Enter ID manually.
            </p>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[#232f48] hover:bg-[#2c3b59] active:bg-[#1d273b] border border-white/5 text-white text-base font-bold leading-normal tracking-[0.015em] transition-all shadow-lg"
          >
            <span className="truncate">Cancel</span>
          </button>

          <div className="h-2" />
        </div>
      </div>

      {/* Modals */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={handleManualSubmit}
        processing={processing}
        error={error}
      />

      {checkedInData && (
        <CheckInSuccess
          data={checkedInData}
          onDone={handleDone}
          onScanNext={handleScanNext}
        />
      )}

      {ticketError && (
        <TicketError
          error={ticketError}
          onDismiss={handleErrorDismiss}
          onTryAgain={handleErrorTryAgain}
          onManualEntry={handleErrorManualEntry}
        />
      )}
    </div>
  );
}
