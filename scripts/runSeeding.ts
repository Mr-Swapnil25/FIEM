/**
 * Run Demo Seeding
 * Execute this to create demo accounts and sample data
 * 
 * Import this file in your main App.tsx or run from browser console
 */

import { seedDemoData, isDemoDataSeeded, DEMO_ACCOUNTS } from './seedDemoData';

// Auto-run seeding when this module is imported
export async function runSeeding() {
    console.log('🌱 Checking if demo data exists...');

    const alreadySeeded = await isDemoDataSeeded();

    if (alreadySeeded) {
        console.log('✅ Demo data already exists!');
        console.log('\n📋 Demo Credentials:');
        console.log(`   Admin: ${DEMO_ACCOUNTS.admin.email}`);
        console.log(`   Password: ${DEMO_ACCOUNTS.admin.password}`);
        console.log(`   Student: ${DEMO_ACCOUNTS.student.email}`);
        console.log(`   Password: ${DEMO_ACCOUNTS.student.password}`);
        return;
    }

    console.log('🔧 Creating demo accounts...');

    try {
        await seedDemoData();
        console.log('\n✅ Demo accounts created successfully!');
    } catch (error) {
        console.error('❌ Failed to seed demo data:', error);
    }
}

// Export for use
export { DEMO_ACCOUNTS };

// Uncomment to auto-run when imported:
// runSeeding();
