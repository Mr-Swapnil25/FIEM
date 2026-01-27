# EventEase Audit Report

## 1. Backend Integrity: [PASS]
We have verified that the application strictly adheres to the **Firestore Only** architecture constraint.
- **Dependencies:** `package.json` contains only `firebase` SDK. No `@firebase/data-connect`, `pg`, `mysql`, `sequelize`, or `typeorm` dependencies are present.
- **Imports:** A global scan of the codebase confirmed no imports of SQL or Data Connect libraries.
- **Initialization:** Firebase is initialized `const db = getFirestore(app);` in `services/firestoreService.ts`.

## 2. CRUD Functionality Matrix

### A. Events (Admin)
| Action | Status | Notes |
| :--- | :--- | :--- |
| **CREATE** | **WORKING** | Uses `setDoc` with UUID. Validation is enforced by Firestore Security Rules (`hasRequiredFields`). |
| **READ** | **WORKING** | `listEvents` supports filtering and sorting. Graceful fallback for missing indexes is implemented. |
| **UPDATE** | **WORKING** | Uses `updateDoc` for partial updates. `updatedAt` timestamp is automatically handled. |
| **DELETE** | **WORKING** | Implements "Soft Delete" (`isDeleted: true`), preserving data integrity. |

### B. Bookings (Student)
| Action | Status | Notes |
| :--- | :--- | :--- |
| **CREATE** | **WORKING** | Uses `runTransaction` to atomically check capacity and increment registration counts. <br>⚠️ **Note:** There is a minor race condition risk where a user could double-book if they send simultaneous requests, as the "already booked" check happens outside the transaction. **Recommendation:** Use deterministic Booking IDs (`booking_${eventId}_${userId}`) to enforce uniqueness at the database level. |
| **READ** | **WORKING** | `getUserBookings` correctly filters by `userId`. Security rules strictly enforce ownership (`resource.data.userId == request.auth.uid`). |

## 3. Connectivity & Permissions
- **Frontend Protection:** `App.tsx` correctly guards routes:
    - Admin routes (`/admin/*`) require `user.role === 'admin'`.
    - Student routes (`/student/*`) require `user.role === 'student'`.
- **Backend Protection:** `firestore.rules` enforce strict access control:
    - Events: Only Admins can Create/Update/Delete.
    - Bookings: Students can only Read/Create their own bookings.
- **Demo Data:** `seedDemoData.ts` correctly creates:
    - Admin: `demo.admin.admin.2026@...` (Role: Admin)
    - Student: `demo.student.cs.2026@...` (Role: Student)

## 4. Bug List & fixes

### Issue 1: Booking Race Condition
**Severity:** Low (Edge case)
**Location:** `services/firestoreService.ts` -> `createBookingWithTransaction`
**Description:** The transaction checks for event capacity but does not check if the user already has a booking for the event *within* the transaction. The check exists in `backend.ts` but is essentially a "check-then-act" pattern subject to race conditions.

**Fix (Recommended Strategy):**
Use a deterministic ID for bookings to leverage Firestore's uniqueness constraint on document creation.

```typescript
// In services/backend.ts

export const createBooking = async (userId: string, eventId: string, amountPaid: number = 0): Promise<Booking> => {
  // ... existing code ...
  
  // CHANGE: Generate deterministic Booking ID
  // This physically prevents a user from creating two bookings for the same event
  const bookingId = \`booking_\${eventId}_\${userId}\`; 
  
  // Pass this explicit ID to firestoreService.createBooking
  // ...
};
```

**Overall Status:** The application is architecturally sound and functionally robust, meeting all critical constraints.
