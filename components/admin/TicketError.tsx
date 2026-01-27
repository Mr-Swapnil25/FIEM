/**
 * TicketError Component
 * 
 * Displays error modal for invalid/problematic ticket scans.
 * Shows different icons and messages based on error type.
 */

import React from 'react';

export type ErrorType =
    | 'already_checked_in'
    | 'cancelled'
    | 'waitlist'
    | 'not_found'
    | 'wrong_event'
    | 'invalid_format'
    | 'expired'
    | 'generic';

export interface TicketErrorData {
    type: ErrorType;
    title: string;
    message: string;
    reason: string;
    previousScan?: string;
    eventMatch?: string;
    userName?: string;
}

interface TicketErrorProps {
    error: TicketErrorData;
    onDismiss: () => void;
    onTryAgain: () => void;
    onManualEntry: () => void;
}

const ERROR_ICONS: Record<ErrorType, string> = {
    already_checked_in: 'person_off',
    cancelled: 'event_busy',
    waitlist: 'hourglass_top',
    wrong_event: 'wrong_location',
    expired: 'schedule',
    not_found: 'gpp_bad',
    invalid_format: 'gpp_bad',
    generic: 'gpp_bad'
};

export function TicketError({ error, onDismiss, onTryAgain, onManualEntry }: TicketErrorProps) {
    const icon = ERROR_ICONS[error.type];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={onDismiss}
        >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

            {/* Simulated Scanner Background (visible through blur) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start text-white/40">
                    <span className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                        Live Scanner
                    </span>
                </div>
                {/* Scanner Frame (dimmed) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-64 h-64 border-2 border-white rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-sm" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-sm" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-sm" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-sm" />
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
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Red Glow Effect */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/20 blur-[80px] rounded-full pointer-events-none" />

                {/* Content Wrapper */}
                <div className="flex flex-col items-center text-center relative z-10">
                    {/* Icon Container with Glow */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30 transform scale-150" />
                        <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20 animate-pulse" />

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
                                {icon}
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
                        {error.title}
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed mb-1 px-2">
                        {error.message}
                    </p>
                    <p className="text-white/50 text-xs mb-6">
                        Reason: {error.reason}
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
                        {error.previousScan && (
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
                                    <p className="text-sm text-white font-medium">{error.previousScan}</p>
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
                                <p className={`text-sm font-medium ${error.eventMatch === 'Valid' ? 'text-green-400' : 'text-red-400'}`}>
                                    {error.eventMatch}
                                </p>
                            </div>
                        </div>

                        {/* User Name if available */}
                        {error.userName && (
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
                                    <p className="text-sm text-white font-medium">{error.userName}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="w-full space-y-3">
                        <button
                            onClick={onTryAgain}
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
                            onClick={onManualEntry}
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
    );
}

export default TicketError;
