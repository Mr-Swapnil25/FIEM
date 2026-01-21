/**
 * Demo Data Seeding Script
 * Creates test accounts and sample data for EventEase
 * 
 * Usage: Import and call seedDemoData() from your app
 * Or run via Firebase Functions for production seeding
 */

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { auth, app } from '../services/firebase';

// Initialize Firestore
const db = getFirestore(app);

// ============================================================================
// DEMO CREDENTIALS (Using institutional @teamfuture.in format)
// ============================================================================

export const DEMO_ACCOUNTS = {
    admin: {
        email: 'demo.admin.admin.2026@teamfuture.in',
        password: 'TestAdmin@2026',
        role: 'admin' as const,
        displayName: 'Demo Admin',
        firstName: 'Demo',
        lastName: 'Admin',
        department: 'ADMIN',
        batch: '2026',
    },
    student: {
        email: 'demo.student.cs.2026@teamfuture.in',
        password: 'TestStudent@2026',
        role: 'student' as const,
        displayName: 'Demo Student',
        firstName: 'Demo',
        lastName: 'Student',
        department: 'CS',
        year: '3rd Year',
        rollNo: 'CS-2026-001',
        batch: '2026',
    }
};

// ============================================================================
// DEMO EVENTS
// ============================================================================

const DEMO_EVENTS = [
    {
        title: 'Tech Symposium 2026',
        description: 'Annual technology conference featuring keynotes from industry leaders, workshops on AI/ML, and networking opportunities. Join us for an exciting day of innovation and learning.',
        shortDescription: 'Annual tech conference with AI/ML workshops',
        venue: 'Main Auditorium',
        location: 'Block A, Ground Floor',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        time: '10:00 AM',
        endTime: '5:00 PM',
        totalSlots: 200,
        registeredCount: 45,
        price: 0,
        category: 'Technical',
        status: 'published',
        featured: true,
        isPublic: true,
        tags: ['AI', 'ML', 'Technology', 'Workshop'],
    },
    {
        title: 'Music Fest Night',
        description: 'Live performances by college bands, DJ night, and acoustic sessions. Food stalls and fun activities throughout the evening.',
        shortDescription: 'Live music, performances, and fun!',
        venue: 'Open Air Theatre',
        location: 'Central Campus',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        time: '6:00 PM',
        endTime: '11:00 PM',
        totalSlots: 500,
        registeredCount: 120,
        price: 100,
        category: 'Cultural',
        status: 'published',
        featured: true,
        isPublic: true,
        tags: ['Music', 'Concert', 'Live Performance'],
    },
    {
        title: 'Career Fair 2026',
        description: 'Meet recruiters from top companies. Bring your resume and dress professionally. Companies attending: Google, Microsoft, Amazon, and more.',
        shortDescription: 'Connect with top employers',
        venue: 'Conference Hall',
        location: 'Block B, 2nd Floor',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        time: '9:00 AM',
        endTime: '4:00 PM',
        totalSlots: 300,
        registeredCount: 89,
        price: 0,
        category: 'Career',
        status: 'published',
        featured: false,
        isPublic: true,
        tags: ['Jobs', 'Internships', 'Networking'],
    },
];

// Past event for student demo
const PAST_EVENT = {
    title: 'Hackathon 2025',
    description: '24-hour coding marathon with amazing prizes and mentorship from industry experts.',
    shortDescription: '24-hour coding challenge',
    venue: 'Computer Lab Complex',
    location: 'Block C',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    time: '9:00 AM',
    endTime: '9:00 AM (next day)',
    totalSlots: 100,
    registeredCount: 100,
    price: 50,
    category: 'Technical',
    status: 'completed',
    featured: false,
    isPublic: true,
    tags: ['Hackathon', 'Coding', 'Competition'],
};

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

/**
 * Generate a ticket ID
 */
const generateTicketId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ETK';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Create a demo user account
 */
async function createDemoUser(
    email: string,
    password: string,
    userData: {
        displayName: string;
        role: 'admin' | 'student';
        department?: string;
        year?: string;
        rollNo?: string;
    }
): Promise<string> {
    try {
        // Create auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Create Firestore user document
        await setDoc(doc(db, 'users', userId), {
            id: userId,
            email,
            displayName: userData.displayName,
            role: userData.role,
            department: userData.department || '',
            year: userData.year || '',
            rollNo: userData.rollNo || '',
            emailDomain: email.split('@')[1],
            isDeleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        console.log(`✅ Created user: ${email} (${userId})`);
        return userId;
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            // User exists, try to sign in and get ID
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log(`✓ User already exists: ${email}`);
            return userCredential.user.uid;
        }
        throw error;
    }
}

/**
 * Create demo events
 */
async function createDemoEvents(adminId: string): Promise<string[]> {
    const eventIds: string[] = [];

    for (const eventData of DEMO_EVENTS) {
        const eventRef = doc(collection(db, 'events'));
        await setDoc(eventRef, {
            id: eventRef.id,
            ...eventData,
            organizerId: adminId,
            adminId,
            eventDate: Timestamp.fromDate(eventData.date),
            date: eventData.date.toISOString(),
            availableSlots: eventData.totalSlots - eventData.registeredCount,
            waitlistCount: 0,
            averageRating: 4.5,
            totalReviews: Math.floor(Math.random() * 20),
            isDeleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        eventIds.push(eventRef.id);
        console.log(`✅ Created event: ${eventData.title}`);
    }

    // Create past event
    const pastEventRef = doc(collection(db, 'events'));
    await setDoc(pastEventRef, {
        id: pastEventRef.id,
        ...PAST_EVENT,
        organizerId: adminId,
        adminId,
        eventDate: Timestamp.fromDate(PAST_EVENT.date),
        date: PAST_EVENT.date.toISOString(),
        availableSlots: 0,
        waitlistCount: 0,
        averageRating: 4.8,
        totalReviews: 45,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    eventIds.push(pastEventRef.id);
    console.log(`✅ Created past event: ${PAST_EVENT.title}`);

    return eventIds;
}

/**
 * Create demo bookings for student
 */
async function createDemoBookings(
    studentId: string,
    eventIds: string[]
): Promise<void> {
    // Book upcoming event (Tech Symposium)
    const upcomingBookingRef = doc(collection(db, 'bookings'));
    const upcomingTicketId = generateTicketId();

    await setDoc(upcomingBookingRef, {
        id: upcomingBookingRef.id,
        userId: studentId,
        eventId: eventIds[0], // Tech Symposium
        ticketId: upcomingTicketId,
        qrCode: JSON.stringify({
            type: 'EVENTEASE_TICKET',
            eventId: eventIds[0],
            bookingId: upcomingBookingRef.id,
            ticketId: upcomingTicketId,
            userId: studentId,
            timestamp: Date.now(),
        }),
        status: 'confirmed',
        isWaitlist: false,
        amountPaid: 0,
        paymentStatus: 'not_required',
        numberOfTickets: 1,
        eventTitle: 'Tech Symposium 2026',
        eventDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    console.log(`✅ Created booking for Tech Symposium (${upcomingTicketId})`);

    // Book past event (Hackathon)
    const pastBookingRef = doc(collection(db, 'bookings'));
    const pastTicketId = generateTicketId();

    await setDoc(pastBookingRef, {
        id: pastBookingRef.id,
        userId: studentId,
        eventId: eventIds[3], // Hackathon (past)
        ticketId: pastTicketId,
        status: 'checked_in',
        isWaitlist: false,
        amountPaid: 50,
        paymentStatus: 'completed',
        numberOfTickets: 1,
        eventTitle: 'Hackathon 2025',
        eventDate: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        checkedInAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        checkedInBy: 'admin-user',
        checkInMethod: 'qr_scan',
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    console.log(`✅ Created past booking for Hackathon (${pastTicketId})`);
}

/**
 * Create sample check-in logs for admin
 */
async function createDemoCheckIns(adminId: string, eventId: string): Promise<void> {
    const names = ['Rahul Sharma', 'Priya Patel', 'Aditya Kumar', 'Sneha Gupta', 'Vikram Singh'];

    for (let i = 0; i < 5; i++) {
        const logRef = doc(collection(db, 'checkInLogs'));

        await setDoc(logRef, {
            id: logRef.id,
            bookingId: `demo-booking-${i}`,
            eventId,
            userId: `demo-user-${i}`,
            checkedInBy: adminId,
            method: i % 2 === 0 ? 'qr_scan' : 'manual',
            userName: names[i],
            checkedInAt: Timestamp.fromDate(new Date(Date.now() - i * 60 * 60 * 1000)),
            createdAt: serverTimestamp(),
        });
    }

    console.log('✅ Created 5 sample check-in logs');
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

/**
 * Seed all demo data
 */
export async function seedDemoData(): Promise<{
    adminId: string;
    studentId: string;
    eventIds: string[];
}> {
    console.log('🌱 Starting demo data seeding...\n');

    try {
        // 1. Create Admin account
        console.log('Creating admin account...');
        const adminId = await createDemoUser(
            DEMO_ACCOUNTS.admin.email,
            DEMO_ACCOUNTS.admin.password,
            {
                displayName: DEMO_ACCOUNTS.admin.displayName,
                role: DEMO_ACCOUNTS.admin.role,
                department: DEMO_ACCOUNTS.admin.department,
            }
        );

        // 2. Create Student account
        console.log('Creating student account...');
        const studentId = await createDemoUser(
            DEMO_ACCOUNTS.student.email,
            DEMO_ACCOUNTS.student.password,
            {
                displayName: DEMO_ACCOUNTS.student.displayName,
                role: DEMO_ACCOUNTS.student.role,
                department: DEMO_ACCOUNTS.student.department,
                year: DEMO_ACCOUNTS.student.year,
                rollNo: DEMO_ACCOUNTS.student.rollNo,
            }
        );

        // 3. Create Events (as admin)
        console.log('\nCreating demo events...');
        const eventIds = await createDemoEvents(adminId);

        // 4. Create Bookings for student
        console.log('\nCreating demo bookings...');
        await createDemoBookings(studentId, eventIds);

        // 5. Create Check-in logs
        console.log('\nCreating check-in history...');
        await createDemoCheckIns(adminId, eventIds[0]);

        // Sign out after seeding
        await signOut(auth);

        console.log('\n✅ Demo data seeding complete!');
        console.log('\n📋 Demo Credentials:');
        console.log(`   Admin: ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.admin.password}`);
        console.log(`   Student: ${DEMO_ACCOUNTS.student.email} / ${DEMO_ACCOUNTS.student.password}`);

        return { adminId, studentId, eventIds };
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

/**
 * Check if demo data exists
 */
export async function isDemoDataSeeded(): Promise<boolean> {
    try {
        await signInWithEmailAndPassword(
            auth,
            DEMO_ACCOUNTS.admin.email,
            DEMO_ACCOUNTS.admin.password
        );
        await signOut(auth);
        return true;
    } catch {
        return false;
    }
}

export default { seedDemoData, isDemoDataSeeded, DEMO_ACCOUNTS };
