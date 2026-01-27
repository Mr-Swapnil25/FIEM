/**
 * Ticket Error Factory
 * 
 * Creates standardized error objects for different ticket check-in failures.
 */

import { ErrorType, TicketErrorData } from '../components/admin/TicketError';

interface ErrorDetails {
    userName?: string;
    checkedInAt?: string;
    eventTitle?: string;
}

export function createTicketError(type: ErrorType, details?: ErrorDetails): TicketErrorData {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const errorMap: Record<ErrorType, TicketErrorData> = {
        already_checked_in: {
            type,
            title: 'Already Checked In',
            message: `${details?.userName || 'This participant'} has already been checked in.`,
            reason: 'Duplicate Entry',
            previousScan: details?.checkedInAt || `Today at ${timeString}`,
            eventMatch: 'Valid',
            userName: details?.userName
        },
        cancelled: {
            type,
            title: 'Booking Cancelled',
            message: 'This booking has been cancelled and is no longer valid.',
            reason: 'Cancelled Booking',
            eventMatch: 'N/A'
        },
        waitlist: {
            type,
            title: 'Waitlist Only',
            message: 'This participant is on the waitlist and has not been confirmed.',
            reason: 'Not Confirmed',
            eventMatch: 'Pending'
        },
        not_found: {
            type,
            title: 'Ticket Not Found',
            message: 'This ticket does not exist in our system.',
            reason: 'Invalid Ticket ID',
            eventMatch: 'Not Found'
        },
        wrong_event: {
            type,
            title: 'Wrong Event',
            message: 'This ticket is for a different event.',
            reason: 'Event Mismatch',
            eventMatch: details?.eventTitle || 'Wrong Session ID'
        },
        invalid_format: {
            type,
            title: 'Invalid Format',
            message: 'The ticket ID format is not valid.',
            reason: 'Malformed ID',
            eventMatch: 'N/A'
        },
        expired: {
            type,
            title: 'Ticket Expired',
            message: 'This event has already ended.',
            reason: 'Event Completed',
            eventMatch: 'Expired'
        },
        generic: {
            type: 'generic',
            title: 'Invalid Ticket',
            message: 'This ticket is not valid for the current session.',
            reason: 'Unknown Error',
            eventMatch: 'Error'
        }
    };

    return errorMap[type];
}
