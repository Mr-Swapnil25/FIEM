/**
 * useDynamicQR Hook
 * Generates QR codes that refresh every 30 seconds
 * Prevents screenshot-based ticket sharing attacks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    generateQRCodeData,
    generateQRCodeDataSync,
    generateQRCodeImage,
    getCurrentWindowId
} from '../services/qrCodeService';

interface DynamicQROptions {
    eventId: string;
    bookingId: string;
    ticketId: string;
    userId: string;
    refreshInterval?: number; // Default: 30000ms (30 seconds)
    autoStart?: boolean;
}

interface DynamicQRState {
    qrData: string;
    qrImage: string;
    windowId: number;
    lastRefresh: number;
    isRefreshing: boolean;
    error: string | null;
    timeUntilRefresh: number;
}

export function useDynamicQR({
    eventId,
    bookingId,
    ticketId,
    userId,
    refreshInterval = 30000,
    autoStart = true,
}: DynamicQROptions) {
    const [state, setState] = useState<DynamicQRState>({
        qrData: '',
        qrImage: '',
        windowId: getCurrentWindowId(),
        lastRefresh: Date.now(),
        isRefreshing: false,
        error: null,
        timeUntilRefresh: refreshInterval,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isActiveRef = useRef(autoStart);

    /**
     * Generate new QR code with HMAC signature
     */
    const refreshQR = useCallback(async () => {
        if (!eventId || !bookingId || !ticketId || !userId) {
            setState(prev => ({ ...prev, error: 'Missing required ticket data' }));
            return;
        }

        setState(prev => ({ ...prev, isRefreshing: true, error: null }));

        try {
            // Generate new QR data with current timestamp and signature
            const qrData = await generateQRCodeData(eventId, bookingId, ticketId, userId);
            const qrImage = await generateQRCodeImage(qrData, 250);

            setState(prev => ({
                ...prev,
                qrData,
                qrImage,
                windowId: getCurrentWindowId(),
                lastRefresh: Date.now(),
                isRefreshing: false,
                timeUntilRefresh: refreshInterval,
            }));
        } catch (error) {
            // Fallback to sync generation if async fails
            try {
                const qrData = generateQRCodeDataSync(eventId, bookingId, ticketId, userId);
                const qrImage = await generateQRCodeImage(qrData, 250);

                setState(prev => ({
                    ...prev,
                    qrData,
                    qrImage,
                    windowId: getCurrentWindowId(),
                    lastRefresh: Date.now(),
                    isRefreshing: false,
                    timeUntilRefresh: refreshInterval,
                }));
            } catch (fallbackError) {
                setState(prev => ({
                    ...prev,
                    isRefreshing: false,
                    error: 'Failed to generate QR code',
                }));
            }
        }
    }, [eventId, bookingId, ticketId, userId, refreshInterval]);

    /**
     * Start automatic refresh cycle
     */
    const startRefresh = useCallback(() => {
        isActiveRef.current = true;
        refreshQR();

        // Clear existing intervals
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        // Set up refresh interval
        intervalRef.current = setInterval(() => {
            if (isActiveRef.current) {
                refreshQR();
            }
        }, refreshInterval);

        // Set up countdown timer (updates every second)
        countdownRef.current = setInterval(() => {
            setState(prev => ({
                ...prev,
                timeUntilRefresh: Math.max(0, refreshInterval - (Date.now() - prev.lastRefresh)),
            }));
        }, 1000);
    }, [refreshQR, refreshInterval]);

    /**
     * Stop automatic refresh
     */
    const stopRefresh = useCallback(() => {
        isActiveRef.current = false;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    /**
     * Force immediate refresh
     */
    const forceRefresh = useCallback(() => {
        refreshQR();

        // Reset the interval timer
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                if (isActiveRef.current) {
                    refreshQR();
                }
            }, refreshInterval);
        }
    }, [refreshQR, refreshInterval]);

    // Auto-start on mount
    useEffect(() => {
        if (autoStart && eventId && bookingId && ticketId && userId) {
            startRefresh();
        }

        return () => {
            stopRefresh();
        };
    }, [autoStart, eventId, bookingId, ticketId, userId, startRefresh, stopRefresh]);

    return {
        ...state,
        refreshQR: forceRefresh,
        startRefresh,
        stopRefresh,
        isActive: isActiveRef.current,
    };
}

export default useDynamicQR;
