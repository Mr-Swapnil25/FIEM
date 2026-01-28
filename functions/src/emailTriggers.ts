import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from './emailService';

const db = admin.firestore();

/**
 * Trigger: When a new booking is created
 * Sends a confirmation email to the user
 */
export const onBookingCreated = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snapshot, context) => {
        const booking = snapshot.data();
        const bookingId = context.params.bookingId;

        if (!booking || !booking.userId || !booking.eventId) {
            console.log('[EmailTrigger] Invalid booking data');
            return;
        }

        try {
            // 1. Fetch User Details
            const userDoc = await db.collection('users').doc(booking.userId).get();
            if (!userDoc.exists) {
                console.log(`[EmailTrigger] User ${booking.userId} not found`);
                return;
            }
            const user = userDoc.data();
            const userEmail = user?.email;

            if (!userEmail) {
                console.log(`[EmailTrigger] User ${booking.userId} has no email`);
                return;
            }

            // 2. Fetch Event Details
            const eventDoc = await db.collection('events').doc(booking.eventId).get();
            const event = eventDoc.exists ? eventDoc.data() : { title: 'Event' };

            // 3. Send Email
            await sendEmail({
                to: userEmail,
                subject: `Booking Confirmed: ${event?.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #4F46E5;">Booking Confirmed! ✅</h2>
                        <p>Hi ${user?.displayName || 'there'},</p>
                        <p>Your booking for <strong>${event?.title}</strong> has been confirmed.</p>
                        
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Ticket ID:</strong> ${booking.ticketId || bookingId}</p>
                            <p><strong>Date:</strong> ${event?.date ? new Date(event.date.toDate()).toDateString() : 'TBA'}</p>
                            <p><strong>Location:</strong> ${event?.location || 'TBA'}</p>
                        </div>

                        <p>Please show your QR code at the entry.</p>
                        <br>
                        <p>Cheers,<br>The EventEase Team</p>
                    </div>
                `
            });
            console.log(`[EmailTrigger] Confirmation sent for booking ${bookingId}`);

        } catch (error) {
            console.error(`[EmailTrigger] Failed to send confirmation for ${bookingId}:`, error);
        }
    });

/**
 * Trigger: When a booking status changes to 'cancelled'
 * Sends a cancellation email
 */
export const onBookingCancelled = functions.firestore
    .document('bookings/{bookingId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const bookingId = context.params.bookingId;

        // Check if status changed to cancelled
        if (newData.status === oldData.status || newData.status !== 'cancelled') {
            return;
        }

        try {
            // 1. Fetch User Details
            const userDoc = await db.collection('users').doc(newData.userId).get();
            const user = userDoc.data();
            const userEmail = user?.email;

            if (!userEmail) return;

            // 2. Fetch Event Details
            const eventDoc = await db.collection('events').doc(newData.eventId).get();
            const event = eventDoc.exists ? eventDoc.data() : { title: 'Event' };

            // 3. Send Email
            await sendEmail({
                to: userEmail,
                subject: `Booking Cancelled: ${event?.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #EF4444;">Booking Cancelled ❌</h2>
                        <p>Hi ${user?.displayName || 'there'},</p>
                        <p>Your booking for <strong>${event?.title}</strong> has been cancelled as requested.</p>
                        
                        <p>If this was a mistake, please book again via the app.</p>
                        <br>
                        <p>Regards,<br>The EventEase Team</p>
                    </div>
                `
            });
            console.log(`[EmailTrigger] Cancellation email sent for booking ${bookingId}`);

        } catch (error) {
            console.error(`[EmailTrigger] Failed to send cancellation for ${bookingId}:`, error);
        }
    });
