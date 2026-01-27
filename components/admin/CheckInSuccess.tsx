/**
 * CheckInSuccess Component
 * 
 * Displays success modal after successful ticket check-in.
 * Shows participant info with avatar and verification badge.
 */

import React from 'react';
import { User, Booking, Event } from '../../types';

export interface CheckedInData {
    booking: Booking;
    user: User;
    event: Event;
}

interface CheckInSuccessProps {
    data: CheckedInData;
    onDone: () => void;
    onScanNext: () => void;
}

export function CheckInSuccess({ data, onDone, onScanNext }: CheckInSuccessProps) {
    const { user } = data;
    const studentId = user.rollNo?.split('-').pop() || '00000';

    return (
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
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#135bec]/20 blur-[80px] rounded-full pointer-events-none" />

                {/* Success Icon */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-green-500 blur-xl opacity-20 animate-pulse" />
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
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                    Access Granted
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                </h3>

                {/* Student Avatar */}
                <div className="mb-4 relative group">
                    <div className="absolute inset-0 rounded-full bg-[#135bec] blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative h-28 w-28 p-1 rounded-full border-2 border-[#135bec] bg-[#192233]">
                        <div
                            className="h-full w-full rounded-full overflow-hidden bg-slate-700 bg-center bg-cover"
                            style={{
                                backgroundImage: user.avatarUrl
                                    ? `url('${user.avatarUrl}')`
                                    : 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)'
                            }}
                        >
                            {!user.avatarUrl && (
                                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                                    {user.name.charAt(0)}
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
                        {user.name}
                    </h2>
                    <p className="text-[#92a4c9] text-sm font-medium">
                        ID: #{studentId} • Class of 2025
                    </p>
                    <p className="text-xs text-[#92a4c9]/60 font-medium uppercase tracking-wider pt-2">
                        {user.department || 'Student'}
                    </p>
                </div>

                {/* Action Button */}
                <button
                    onClick={onDone}
                    className="group relative w-full overflow-hidden rounded-xl bg-[#135bec] h-[52px] flex items-center justify-center transition-all hover:bg-blue-600 active:scale-[0.98] shadow-lg shadow-blue-900/20"
                >
                    <span className="relative z-10 text-white text-base font-bold tracking-wide">Done</span>
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                </button>
            </div>

            {/* Footer Text */}
            <button
                onClick={onScanNext}
                className="mt-8 text-sm text-slate-500 font-medium opacity-60 hover:opacity-100 transition-opacity"
            >
                Tap to scan next student
            </button>
        </div>
    );
}

export default CheckInSuccess;
