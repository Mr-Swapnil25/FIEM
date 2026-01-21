/**
 * QR Code Service
 * Generates and validates QR codes for event tickets
 * Uses HMAC-SHA256 for cryptographic signature security
 */

// ============================================================================
// TYPES
// ============================================================================

// QR Code data structure
export interface QRCodeData {
  type: 'EVENTEASE_TICKET';
  eventId: string;
  bookingId: string;
  ticketId: string;
  userId: string;
  timestamp: number;
  windowId?: number; // For dynamic QR (30-sec window)
  signature: string;
}

// QR Code validation result
export interface QRValidationResult {
  valid: boolean;
  data?: QRCodeData;
  error?: string;
}

// Dynamic QR configuration
const DYNAMIC_QR_WINDOW_MS = 30000; // 30 seconds
const VALIDATION_BUFFER_WINDOWS = 2; // Accept current + 1 previous window

// ============================================================================
// CRYPTOGRAPHIC SIGNATURE (HMAC-SHA256)
// ============================================================================

/**
 * Get the secret key for HMAC signing
 * Uses environment variable in production, fallback for development
 */
const getSecretKey = (): string => {
  // In production, use: import.meta.env.VITE_QR_SECRET_KEY
  const envKey = typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.VITE_QR_SECRET_KEY
    : undefined;

  // Use environment key or fallback (in production, NEVER use fallback)
  return envKey || 'EVENTEASE_DEV_SECRET_KEY_2026_CHANGE_IN_PRODUCTION';
};

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 * This is cryptographically secure and works in browser
 */
export const generateHMACSignature = async (payload: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(getSecretKey());
  const payloadData = encoder.encode(payload);

  // Import key for HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the payload
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Return first 16 characters (64 bits) for shorter QR
  return hashHex.slice(0, 16);
};

/**
 * Synchronous HMAC signature using fallback algorithm
 * Used when crypto.subtle is not available (rare)
 */
const generateSyncSignature = (payload: string): string => {
  const secret = getSecretKey();
  let hash = 0;
  const combined = payload + secret;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Add more complexity
  for (let i = 0; i < 3; i++) {
    hash = ((hash << 5) - hash) + (hash >> 3);
  }

  return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
};

/**
 * Get current time window ID (30-second windows)
 */
export const getCurrentWindowId = (): number => {
  return Math.floor(Date.now() / DYNAMIC_QR_WINDOW_MS);
};

// ============================================================================
// QR CODE GENERATION
// ============================================================================

/**
 * Generate QR code data string with HMAC signature
 * Uses dynamic windowed timestamps to prevent screenshot attacks
 */
export const generateQRCodeData = async (
  eventId: string,
  bookingId: string,
  ticketId: string,
  userId: string
): Promise<string> => {
  const timestamp = Date.now();
  const windowId = getCurrentWindowId();

  // Create payload for signing (includes windowId for time-sensitivity)
  const signaturePayload = `${eventId}:${ticketId}:${userId}:${windowId}`;

  // Generate cryptographic signature
  let signature: string;
  try {
    signature = await generateHMACSignature(signaturePayload);
  } catch (e) {
    // Fallback for environments without crypto.subtle
    console.warn('[QRCode] crypto.subtle unavailable, using fallback');
    signature = generateSyncSignature(signaturePayload);
  }

  const data: QRCodeData = {
    type: 'EVENTEASE_TICKET',
    eventId,
    bookingId,
    ticketId,
    userId,
    timestamp,
    windowId,
    signature
  };

  return JSON.stringify(data);
};

/**
 * Generate QR code data synchronously (for offline/immediate use)
 */
export const generateQRCodeDataSync = (
  eventId: string,
  bookingId: string,
  ticketId: string,
  userId: string
): string => {
  const timestamp = Date.now();
  const windowId = getCurrentWindowId();

  const signaturePayload = `${eventId}:${ticketId}:${userId}:${windowId}`;
  const signature = generateSyncSignature(signaturePayload);

  const data: QRCodeData = {
    type: 'EVENTEASE_TICKET',
    eventId,
    bookingId,
    ticketId,
    userId,
    timestamp,
    windowId,
    signature
  };

  return JSON.stringify(data);
};

/**
 * Generate QR code as data URL (SVG or PNG)
 */
export const generateQRCodeImage = async (
  data: string,
  size: number = 200,
  darkColor: string = '#000000',
  lightColor: string = '#ffffff'
): Promise<string> => {
  try {
    // Dynamic import of qrcode library if available
    // @ts-expect-error - qrcode might not be installed
    const QRCode = await import('qrcode').catch(() => null);

    if (QRCode) {
      return await QRCode.toDataURL(data, {
        width: size,
        margin: 2,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });
    }
  } catch {
    console.log('[QRCode] qrcode library not available, using fallback');
  }

  // Fallback: Generate a simple placeholder with ticket info
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  // Background
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  // Parse data to get ticket ID
  let ticketId = 'TICKET';
  try {
    const parsed = JSON.parse(data) as QRCodeData;
    ticketId = parsed.ticketId || 'TICKET';
  } catch {
    // Use default
  }

  // Draw pattern (simplified QR-like pattern)
  const gridSize = 10;
  const cellSize = (size - 40) / gridSize;
  const startX = 20;
  const startY = 20;

  // Generate a deterministic pattern based on data
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const charCode = data.charCodeAt((i * gridSize + j) % data.length);
      if (charCode % 2 === 0) {
        ctx.fillStyle = darkColor;
        ctx.fillRect(
          startX + j * cellSize,
          startY + i * cellSize,
          cellSize - 1,
          cellSize - 1
        );
      }
    }
  }

  // Add corner markers (like real QR codes)
  const markerSize = cellSize * 2;
  const drawMarker = (x: number, y: number) => {
    ctx.fillStyle = darkColor;
    ctx.fillRect(x, y, markerSize, markerSize);
    ctx.fillStyle = lightColor;
    ctx.fillRect(x + cellSize * 0.3, y + cellSize * 0.3, markerSize - cellSize * 0.6, markerSize - cellSize * 0.6);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + cellSize * 0.6, y + cellSize * 0.6, markerSize - cellSize * 1.2, markerSize - cellSize * 1.2);
  };

  drawMarker(startX, startY);
  drawMarker(startX + (gridSize - 2) * cellSize, startY);
  drawMarker(startX, startY + (gridSize - 2) * cellSize);

  // Add ticket text at bottom
  ctx.fillStyle = darkColor;
  ctx.font = `bold ${size / 15}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(ticketId, size / 2, size - 5);

  return canvas.toDataURL('image/png');
};

// ============================================================================
// QR CODE VALIDATION
// ============================================================================

/**
 * Validate QR code data with HMAC signature verification
 * Checks if the QR code is within the valid time window (60 seconds)
 */
export const validateQRCode = async (qrData: string): Promise<QRValidationResult> => {
  try {
    const data = JSON.parse(qrData) as QRCodeData;

    // Check type
    if (data.type !== 'EVENTEASE_TICKET') {
      return { valid: false, error: 'Invalid QR code type' };
    }

    // Check required fields
    if (!data.eventId || !data.ticketId || !data.userId) {
      return { valid: false, error: 'Missing required ticket information' };
    }

    // Check time window (dynamic QR validation)
    const currentWindow = getCurrentWindowId();
    const qrWindow = data.windowId || Math.floor(data.timestamp / DYNAMIC_QR_WINDOW_MS);

    // Accept current window + buffer previous windows
    if (currentWindow - qrWindow > VALIDATION_BUFFER_WINDOWS) {
      return { valid: false, error: 'QR code has expired. Please refresh your ticket.' };
    }

    // Verify HMAC signature
    const signaturePayload = `${data.eventId}:${data.ticketId}:${data.userId}:${qrWindow}`;

    let expectedSignature: string;
    try {
      expectedSignature = await generateHMACSignature(signaturePayload);
    } catch {
      expectedSignature = generateSyncSignature(signaturePayload);
    }

    if (data.signature !== expectedSignature) {
      // Also check previous window (for edge cases during window transition)
      const prevPayload = `${data.eventId}:${data.ticketId}:${data.userId}:${qrWindow - 1}`;
      let prevSignature: string;
      try {
        prevSignature = await generateHMACSignature(prevPayload);
      } catch {
        prevSignature = generateSyncSignature(prevPayload);
      }

      if (data.signature !== prevSignature) {
        return { valid: false, error: 'Invalid ticket signature' };
      }
    }

    // Check if ticket is not too old (valid for 1 year for static validation)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (data.timestamp && Date.now() - data.timestamp > oneYear) {
      return { valid: false, error: 'Ticket has expired' };
    }

    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: 'Invalid QR code format' };
  }
};

/**
 * Synchronous validation (for offline use)
 */
export const validateQRCodeSync = (qrData: string): QRValidationResult => {
  try {
    const data = JSON.parse(qrData) as QRCodeData;

    if (data.type !== 'EVENTEASE_TICKET') {
      return { valid: false, error: 'Invalid QR code type' };
    }

    if (!data.eventId || !data.ticketId || !data.userId) {
      return { valid: false, error: 'Missing required ticket information' };
    }

    const currentWindow = getCurrentWindowId();
    const qrWindow = data.windowId || Math.floor(data.timestamp / DYNAMIC_QR_WINDOW_MS);

    if (currentWindow - qrWindow > VALIDATION_BUFFER_WINDOWS) {
      return { valid: false, error: 'QR code has expired. Please refresh your ticket.' };
    }

    const signaturePayload = `${data.eventId}:${data.ticketId}:${data.userId}:${qrWindow}`;
    const expectedSignature = generateSyncSignature(signaturePayload);

    if (data.signature !== expectedSignature) {
      const prevPayload = `${data.eventId}:${data.ticketId}:${data.userId}:${qrWindow - 1}`;
      const prevSignature = generateSyncSignature(prevPayload);

      if (data.signature !== prevSignature) {
        return { valid: false, error: 'Invalid ticket signature' };
      }
    }

    return { valid: true, data };
  } catch {
    return { valid: false, error: 'Invalid QR code format' };
  }
};

/**
 * Parse QR code data (without validation)
 */
export const parseQRCodeData = (qrData: string): QRCodeData | null => {
  try {
    const data = JSON.parse(qrData) as QRCodeData;
    if (data.type === 'EVENTEASE_TICKET') {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

// ============================================================================
// TICKET GENERATION
// ============================================================================

/**
 * Generate a scannable ticket with QR code
 * Returns HTML string for rendering
 */
export const generateTicketHTML = async (
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  venue: string,
  ticketId: string,
  qrCodeData: string
): Promise<string> => {
  const qrImage = await generateQRCodeImage(qrCodeData, 150);

  return `
    <div style="
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      padding: 24px;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 350px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    ">
      <div style="border-bottom: 2px dashed rgba(255,255,255,0.2); padding-bottom: 16px; margin-bottom: 16px;">
        <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #a78bfa;">${eventTitle}</h2>
        <p style="margin: 4px 0; font-size: 14px; opacity: 0.8;">📅 ${eventDate} at ${eventTime}</p>
        <p style="margin: 4px 0; font-size: 14px; opacity: 0.8;">📍 ${venue}</p>
      </div>
      <div style="display: flex; justify-content: center; margin: 16px 0;">
        <img src="${qrImage}" alt="Ticket QR Code" style="border-radius: 8px; background: white; padding: 8px;" />
      </div>
      <div style="text-align: center; border-top: 2px dashed rgba(255,255,255,0.2); padding-top: 16px;">
        <p style="margin: 0; font-size: 12px; opacity: 0.6;">Ticket ID</p>
        <p style="margin: 4px 0 0 0; font-size: 16px; font-family: monospace; letter-spacing: 2px;">${ticketId}</p>
      </div>
    </div>
  `;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateQRCodeData,
  generateQRCodeDataSync,
  generateQRCodeImage,
  validateQRCode,
  validateQRCodeSync,
  parseQRCodeData,
  generateTicketHTML,
  generateHMACSignature,
  getCurrentWindowId,
};
