/**
 * useQRScanner Hook
 * 
 * Encapsulates QR code scanning logic using html5-qrcode library.
 * Handles camera initialization, scanning, and cleanup.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface UseQRScannerOptions {
    containerId: string;
    onScan: (data: string) => Promise<void>;
    autoStart?: boolean;
    startDelay?: number;
}

interface UseQRScannerReturn {
    cameraActive: boolean;
    cameraError: string | null;
    startCamera: () => Promise<void>;
    stopCamera: () => Promise<void>;
}

export function useQRScanner({
    containerId,
    onScan,
    autoStart = true,
    startDelay = 500
}: UseQRScannerOptions): UseQRScannerReturn {
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const processingRef = useRef(false);

    const startCamera = useCallback(async () => {
        const container = document.getElementById(containerId);
        if (scannerRef.current || !container) return;

        try {
            setCameraError(null);
            const scanner = new Html5Qrcode(containerId, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false
            });

            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                async (decodedText) => {
                    if (processingRef.current) return;
                    processingRef.current = true;

                    try {
                        await onScan(decodedText);
                    } finally {
                        processingRef.current = false;
                    }
                },
                () => {
                    // Ignore scan failures, keep scanning
                }
            );

            setCameraActive(true);
        } catch (err) {
            console.error('[useQRScanner] Camera error:', err);
            setCameraError('Unable to access camera. Please allow camera permissions or use manual entry.');
            setCameraActive(false);
        }
    }, [containerId, onScan]);

    const stopCamera = useCallback(async () => {
        if (!scannerRef.current) return;

        try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
        } catch (err) {
            console.error('[useQRScanner] Error stopping camera:', err);
        }

        scannerRef.current = null;
        setCameraActive(false);
    }, []);

    // Auto-start camera on mount if enabled
    useEffect(() => {
        if (!autoStart) return;

        const timer = setTimeout(() => {
            startCamera();
        }, startDelay);

        return () => {
            clearTimeout(timer);
            stopCamera();
        };
    }, [autoStart, startDelay, startCamera, stopCamera]);

    return {
        cameraActive,
        cameraError,
        startCamera,
        stopCamera
    };
}

export default useQRScanner;
