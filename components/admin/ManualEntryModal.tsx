/**
 * ManualEntryModal Component
 * 
 * Modal for manual ticket ID entry when QR scanning fails.
 */

import React, { useState } from 'react';

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (ticketId: string) => Promise<void>;
    processing: boolean;
    error: string | null;
}

export function ManualEntryModal({
    isOpen,
    onClose,
    onSubmit,
    processing,
    error
}: ManualEntryModalProps) {
    const [ticketId, setTicketId] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!ticketId.trim()) return;
        await onSubmit(ticketId.trim());
        setTicketId('');
    };

    const handleClose = () => {
        setTicketId('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
                className="absolute inset-0 bg-[#111722]/80 backdrop-blur-md"
                onClick={handleClose}
            />
            <div className="relative w-full max-w-sm bg-[#192233]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Enter Ticket ID</h3>

                <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                    placeholder="e.g. EVT-9982-XJ"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-slate-500 text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                />

                {error && (
                    <p className="text-red-400 text-sm text-center mt-3">{error}</p>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleClose}
                        className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={processing || !ticketId.trim()}
                        className="flex-1 h-12 rounded-xl bg-[#135bec] text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {processing ? 'Checking...' : 'Check In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ManualEntryModal;
