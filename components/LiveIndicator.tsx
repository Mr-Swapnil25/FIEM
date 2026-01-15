/**
 * Live Indicator Component
 * 
 * Shows real-time connection status to users
 * 
 * @module components/LiveIndicator
 */

import React from 'react';
import { useLiveIndicator } from '../hooks/useRealtime';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface LiveIndicatorProps {
  /** Show full label or just dot */
  variant?: 'full' | 'dot' | 'compact';
  /** Custom class name */
  className?: string;
}

export function LiveIndicator({ variant = 'full', className = '' }: LiveIndicatorProps) {
  const { status, label, color, isOnline } = useLiveIndicator();

  if (variant === 'dot') {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${color} ${
          status === 'live' ? 'animate-pulse' : ''
        } ${className}`}
        title={label}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs ${className}`}
        title={isOnline ? 'Connected' : 'Offline'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${color} ${
            status === 'live' ? 'animate-pulse' : ''
          }`}
        />
        {status === 'live' && (
          <span className="text-green-600 dark:text-green-400 font-medium">Live</span>
        )}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
        status === 'live'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : status === 'degraded'
          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      } ${className}`}
    >
      {status === 'live' ? (
        <Wifi size={14} />
      ) : status === 'degraded' ? (
        <RefreshCw size={14} className="animate-spin" />
      ) : (
        <WifiOff size={14} />
      )}
      <span
        className={`w-2 h-2 rounded-full ${color} ${
          status === 'live' ? 'animate-pulse shadow-lg shadow-green-500/50' : ''
        }`}
      />
      <span>{label}</span>
    </div>
  );
}

/**
 * Offline Banner - shows when user is offline
 */
export function OfflineBanner() {
  const { isOnline } = useLiveIndicator();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white py-2 px-4 text-center text-sm font-medium shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <WifiOff size={16} />
        <span>You're offline. Some features may not work.</span>
      </div>
    </div>
  );
}

export default LiveIndicator;
