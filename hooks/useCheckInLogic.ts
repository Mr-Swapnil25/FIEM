/**
 * useCheckInLogic Hook
 * 
 * Encapsulates ticket check-in business logic.
 * Handles validation, status checks, and check-in mutation.
 */

import { useState, useCallback } from 'react';
import { getParticipantDetails, findBookingByTicketId } from '../services/backend';
import { validateQRCode } from '../services/qrCodeService';
import { useCheckInParticipant } from '../hooks';
import { User, Booking, Event } from '../types';
import { createTicketError } from '../utils/ticketErrors';
import { TicketErrorData } from '../components/admin/TicketError';

export interface CheckedInData {
    booking: Booking;
    user: User;
    event: Event;
}

interface UseCheckInLogicOptions {
    currentUserId: string | undefined;
    eventId?: string;
}

interface UseCheckInLogicReturn {
    processing: boolean;
    error: string | null;
    ticketError: TicketErrorData | null;
    checkedInData: CheckedInData | null;
    handleQRScan: (qrData: string) => Promise<void>;
    handleManualEntry: (ticketId: string) => Promise<void>;
    handleCheckIn: (bookingId: string) => Promise<void>;
    resetState: () => void;
    clearErrors: () => void;
}

export function useCheckInLogic({
    currentUserId,
    eventId
}: UseCheckInLogicOptions): UseCheckInLogicReturn {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ticketError, setTicketError] = useState<TicketErrorData | null>(null);
    const [checkedInData, setCheckedInData] = useState<CheckedInData | null>(null);

    const checkInMutation = useCheckInParticipant();

    const clearErrors = useCallback(() => {
        setError(null);
        setTicketError(null);
    }, []);

    const resetState = useCallback(() => {
        setCheckedInData(null);
        setError(null);
        setTicketError(null);
    }, []);

    const handleCheckIn = useCallback(async (bookingId: string) => {
        // Validate booking ID format
        if (!bookingId || typeof bookingId !== 'string') {
            setTicketError(createTicketError('invalid_format'));
            return;
        }

        // Sanitize booking ID
        const sanitizedBookingId = bookingId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        if (sanitizedBookingId !== bookingId.trim()) {
            setTicketError(createTicketError('invalid_format'));
            return;
        }

        try {
            setProcessing(true);
            clearErrors();

            const { booking, user, event } = await getParticipantDetails(sanitizedBookingId);

            if (!booking || !user || !event) {
                setTicketError(createTicketError('not_found'));
                return;
            }

            // Check event match
            if (eventId && booking.eventId !== eventId) {
                setTicketError(createTicketError('wrong_event', { eventTitle: event.title }));
                return;
            }

            // Check booking status
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
                return;
            }

            if (status === 'cancelled') {
                setTicketError(createTicketError('cancelled'));
                return;
            }

            if (status === 'waitlist') {
                setTicketError(createTicketError('waitlist'));
                return;
            }

            // Check if event ended
            const eventDate = new Date(event.eventDate);
            const eventEndTime = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
            if (new Date() > eventEndTime) {
                setTicketError(createTicketError('expired'));
                return;
            }

            // Validate auth
            if (!currentUserId) {
                setError('Authentication required - please log in again');
                return;
            }

            // Perform check-in
            await checkInMutation.mutateAsync({
                bookingId: sanitizedBookingId,
                checkedInBy: currentUserId,
                method: 'qr_scan'
            });

            setCheckedInData({
                booking: { ...booking, status: 'checked_in' as const },
                user,
                event
            });
        } catch (err) {
            const error = err as Error;
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
    }, [currentUserId, eventId, checkInMutation, clearErrors]);

    const handleQRScan = useCallback(async (qrData: string) => {
        setProcessing(true);
        clearErrors();

        try {
            const validation = await validateQRCode(qrData);

            if (!validation.valid) {
                if (validation.error?.includes('expired')) {
                    setTicketError(createTicketError('expired'));
                } else if (validation.error?.includes('signature')) {
                    setTicketError(createTicketError('invalid_format'));
                } else {
                    setError(validation.error || 'Invalid QR code');
                }
                return;
            }

            const booking = await findBookingByTicketId(validation.data!.ticketId);

            if (!booking) {
                setTicketError(createTicketError('not_found'));
                return;
            }

            await handleCheckIn(booking.id);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setProcessing(false);
        }
    }, [handleCheckIn, clearErrors]);

    const handleManualEntry = useCallback(async (ticketId: string) => {
        if (!ticketId.trim()) {
            setError('Please enter a ticket ID');
            return;
        }

        setProcessing(true);
        clearErrors();

        try {
            const result = await findBookingByTicketId(ticketId.trim());

            if (!result) {
                setTicketError(createTicketError('not_found'));
                return;
            }

            await handleCheckIn(result.id);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setProcessing(false);
        }
    }, [handleCheckIn, clearErrors]);

    return {
        processing,
        error,
        ticketError,
        checkedInData,
        handleQRScan,
        handleManualEntry,
        handleCheckIn,
        resetState,
        clearErrors
    };
}

export default useCheckInLogic;
