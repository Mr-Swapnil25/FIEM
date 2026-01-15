# Phase 2: Firebase Architecture Design

## Executive Summary

This document defines the complete Firebase architecture for EventEase production deployment.
- **Primary Database**: Firebase Data Connect (Cloud SQL PostgreSQL)
- **Fallback Database**: Cloud Firestore (when Data Connect fails)
- **File Storage**: Firebase Storage
- **Authentication**: Firebase Auth with custom claims

**Design Principles:**
1. Zero localStorage tolerance for production data
2. Primary → Fallback pattern for reliability
3. Designed for 100k+ users scalability
4. TypeScript strict mode compatibility

---

## Step 2.1: Firebase Data Connect Schema

### Schema Location
`dataconnect/schema/schema.production.gql`

### Entity Relationship Diagram

```
┌──────────────────┐
│      User        │
├──────────────────┤
│ id (PK, UUID)    │
│ email (unique)   │
│ displayName      │
│ role             │
│ ...              │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐     ┌──────────────────┐
│     Booking      │────▶│      Event       │
├──────────────────┤ N:1 ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ userId (FK)      │     │ organizerId (FK) │
│ eventId (FK)     │     │ categoryId (FK)  │
│ ticketId (unique)│     │ title            │
│ status           │     │ status           │
└──────────────────┘     └────────┬─────────┘
                                  │
         ┌────────────────────────┼───────────────────────┐
         │                        │                       │
         ▼                        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  FavoriteEvent   │   │     Review       │   │   Notification   │
├──────────────────┤   ├──────────────────┤   ├──────────────────┤
│ userId (FK)      │   │ userId (FK)      │   │ userId (FK)      │
│ eventId (FK)     │   │ eventId (FK)     │   │ eventId (FK)     │
└──────────────────┘   │ rating           │   │ type             │
                       └──────────────────┘   └──────────────────┘
```

### Tables Summary

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | User profiles | email, role |
| `categories` | Event categories | name (unique) |
| `events` | Event listings | status+date, organizerId, categoryId |
| `bookings` | Event registrations | userId+status, eventId+status, ticketId |
| `favorite_events` | User favorites | userId, eventId |
| `notifications` | User notifications | userId+read, userId+createdAt |
| `reviews` | Event reviews | eventId+createdAt, rating |
| `check_in_logs` | Audit trail | eventId+checkedInAt, bookingId |
| `event_announcements` | Event updates | eventId+createdAt |
| `payment_transactions` | Payment records | bookingId, status |
| `file_uploads` | File metadata | userId+type |
| `daily_event_metrics` | Analytics | date, eventId+date |

### Enumerations

```typescript
// TypeScript equivalents for schema enums
type UserRole = 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN';
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'WAITLIST' | 'EXPIRED' | 'NO_SHOW';
type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
type NotificationType = 'GENERAL' | 'EVENT_REMINDER' | 'BOOKING_CONFIRMED' | ...;
type CheckInMethod = 'QR_SCAN' | 'MANUAL_ENTRY' | 'TICKET_ID' | 'AUTO';
type FileType = 'AVATAR' | 'ID_CARD' | 'EVENT_IMAGE' | 'TICKET' | 'DOCUMENT';
type TransactionStatus = 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
```

### Soft Delete Strategy

All critical tables include:
```graphql
isDeleted: Boolean! @default(value: false)
deletedAt: Timestamp
```

**Query Pattern:**
```graphql
# Always filter out deleted records
events(where: { isDeleted: { eq: false } })
```

### Index Strategy for 100k+ Users

| Query Pattern | Index |
|---------------|-------|
| List published events | `events(status, date)` |
| User's bookings | `bookings(userId, status)` |
| Event participants | `bookings(eventId, status)` |
| Ticket lookup | `bookings(ticketId)` - unique |
| User notifications | `notifications(userId, read)` |
| Event reviews | `reviews(eventId, createdAt)` |
| Check-in audit | `check_in_logs(eventId, checkedInAt)` |

---

## Step 2.2: Firestore Fallback Structure

### Purpose
Firestore serves as a **fallback** when Data Connect operations fail:
- Network timeouts
- Data Connect service unavailable
- Emergency read-only mode

### Collection Hierarchy

```
firestore/
├── users/                          # User profiles
│   └── {userId}/
│       ├── bookings/               # Subcollection: user's bookings
│       │   └── {bookingId}
│       ├── favorites/              # Subcollection: user's favorites
│       │   └── {favoriteId}
│       └── notifications/          # Subcollection: user's notifications
│           └── {notificationId}
│
├── events/                         # Event listings
│   └── {eventId}/
│       ├── reviews/                # Subcollection: event reviews
│       │   └── {reviewId}
│       ├── announcements/          # Subcollection: event announcements
│       │   └── {announcementId}
│       └── bookings/               # Subcollection: event bookings (mirror)
│           └── {bookingId}
│
├── categories/                     # Event categories
│   └── {categoryId}
│
├── bookings/                       # Top-level bookings (for ticket lookup)
│   └── {bookingId}
│
├── checkInLogs/                    # Audit logs
│   └── {logId}
│
├── paymentTransactions/            # Payment records
│   └── {transactionId}
│
├── fileUploads/                    # File metadata
│   └── {fileId}
│
└── _metadata/                      # System metadata
    ├── syncStatus                  # Data Connect sync status
    └── appConfig                   # Runtime configuration
```

### Document ID Patterns

| Collection | ID Pattern | Example |
|------------|------------|---------|
| `users` | Firebase Auth UID | `abc123xyz` |
| `events` | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `bookings` | UUID v4 | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| `categories` | UUID v4 | `6ba7b811-9dad-11d1-80b4-00c04fd430c8` |
| `checkInLogs` | Auto-generated | Firestore auto-ID |
| `paymentTransactions` | UUID v4 | Matches gateway reference |

### Subcollections vs Flat Structure Decision

| Pattern | Use Case | Reasoning |
|---------|----------|-----------|
| **Subcollection** | `users/{uid}/bookings` | Strong ownership, automatic cascade |
| **Subcollection** | `events/{id}/reviews` | Event-scoped access, efficient queries |
| **Flat + Mirror** | `bookings/` (top-level) | Global ticket lookup by ticketId |
| **Flat** | `checkInLogs/` | Cross-event audit queries |

### Composite Indexes Required

```javascript
// firestore.indexes.json
{
  "indexes": [
    // Events by status and date
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    // Bookings by status and date
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // User notifications unread first
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "read", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Reviews by rating
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "rating", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Data Denormalization Strategy

To minimize reads and improve performance:

| Denormalized Field | Source | Stored In |
|-------------------|--------|-----------|
| `eventTitle` | Event.title | Booking |
| `eventDate` | Event.date | Booking |
| `eventVenue` | Event.venue | Booking |
| `eventImageUrl` | Event.imageUrl | Booking |
| `userName` | User.displayName | Booking, Review |
| `userEmail` | User.email | Booking |
| `categoryName` | Category.name | Event |
| `organizerName` | User.displayName | Event |

**Update Pattern:** Use Cloud Functions to propagate denormalized field updates.

### Offline Persistence Configuration

```typescript
// Enable Firestore offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open
    console.warn('Offline persistence unavailable: multiple tabs');
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support
    console.warn('Offline persistence not supported');
  }
});
```

---

## Step 2.3: Firebase Storage Structure

### Folder Hierarchy

```
gs://future-project-148.appspot.com/
│
├── avatars/                        # User profile pictures
│   └── {userId}/
│       └── avatar_{timestamp}.{ext}
│
├── id-cards/                       # College ID uploads (private)
│   └── {userId}/
│       └── idcard_{timestamp}.{ext}
│
├── events/                         # Event images
│   └── {eventId}/
│       ├── cover_{timestamp}.{ext}
│       └── gallery/
│           └── {imageId}.{ext}
│
├── tickets/                        # Generated ticket PDFs
│   └── {userId}/
│       └── {bookingId}/
│           └── ticket_{ticketId}.pdf
│
├── temp/                           # Temporary uploads (auto-cleanup)
│   └── {uploadId}/
│       └── {filename}
│
└── exports/                        # Admin data exports (private)
    └── {date}/
        └── {exportType}_{timestamp}.csv
```

### File Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Avatar | `avatar_{timestamp}.{ext}` | `avatar_1736758800000.jpg` |
| ID Card | `idcard_{timestamp}.{ext}` | `idcard_1736758800000.png` |
| Event Cover | `cover_{timestamp}.{ext}` | `cover_1736758800000.webp` |
| Ticket | `ticket_{ticketId}.pdf` | `ticket_EVT-LXK92M-A1B2C3.pdf` |
| Temp | `{originalFilename}` | `my_photo.jpg` |

### File Size Limits

| File Type | Max Size | Allowed MIME Types |
|-----------|----------|-------------------|
| Avatar | 2 MB | image/jpeg, image/png, image/webp |
| ID Card | 5 MB | image/jpeg, image/png, image/pdf |
| Event Image | 5 MB | image/jpeg, image/png, image/webp |
| Ticket PDF | 1 MB | application/pdf |
| Temp Upload | 10 MB | any |

### Storage Rules (Enhanced)

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isAdmin() {
      return request.auth.token.role == 'admin' || 
             request.auth.token.role == 'super_admin';
    }
    
    function isValidImage() {
      return request.resource.contentType.matches('image/(jpeg|png|webp)')
             && request.resource.size < 5 * 1024 * 1024;
    }
    
    function isValidAvatar() {
      return request.resource.contentType.matches('image/(jpeg|png|webp)')
             && request.resource.size < 2 * 1024 * 1024;
    }
    
    function isValidIdCard() {
      return (request.resource.contentType.matches('image/(jpeg|png)') ||
              request.resource.contentType == 'application/pdf')
             && request.resource.size < 5 * 1024 * 1024;
    }
    
    // Avatars - public read, owner write
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if isAuthenticated() && isOwner(userId) && isValidAvatar();
      allow delete: if isAuthenticated() && isOwner(userId);
    }
    
    // ID Cards - private, owner only
    match /id-cards/{userId}/{fileName} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow write: if isAuthenticated() && isOwner(userId) && isValidIdCard();
      allow delete: if isAuthenticated() && isOwner(userId);
    }
    
    // Event images - public read, admins write
    match /events/{eventId}/{allPaths=**} {
      allow read: if true;
      allow write: if isAuthenticated() && isAdmin() && isValidImage();
      allow delete: if isAuthenticated() && isAdmin();
    }
    
    // Tickets - owner only
    match /tickets/{userId}/{allPaths=**} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && isOwner(userId);
      allow delete: if isAuthenticated() && isOwner(userId);
    }
    
    // Temp uploads - authenticated users, auto-cleanup
    match /temp/{uploadId}/{fileName} {
      allow read, write: if isAuthenticated();
    }
    
    // Exports - admins only
    match /exports/{allPaths=**} {
      allow read: if isAuthenticated() && isAdmin();
      allow write: if false; // Cloud Functions only
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### File Metadata Storage

Each uploaded file should have metadata in Firestore/Data Connect:

```typescript
interface FileUpload {
  id: string;
  userId: string;
  type: 'avatar' | 'id-card' | 'event-image' | 'ticket' | 'document';
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;  // bytes
  storagePath: string;  // Full storage path
  downloadUrl: string;  // Public URL if applicable
  relatedEntityType?: 'event' | 'user' | 'booking';
  relatedEntityId?: string;
  isProcessed: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Orphaned File Cleanup

Cloud Function to clean up orphaned files:

```typescript
// Scheduled: Daily at 2 AM
// 1. Query file_uploads where isDeleted = false
// 2. Check if related entity still exists
// 3. If entity deleted > 7 days ago, delete file from Storage
// 4. Mark file_uploads record as isDeleted = true
```

---

## Step 2.4: Authentication Strategy

### Authentication Methods

| Method | Status | Use Case |
|--------|--------|----------|
| Email/Password | ✅ Primary | Institutional emails (@teamfuture.in) |
| Google Sign-In | ✅ Secondary | Quick login with Google account |
| Apple Sign-In | ✅ Secondary | iOS users |
| Phone Auth | ❌ Disabled | Not required |
| Anonymous | ❌ Disabled | Not required |

### User Registration Flow

```
┌─────────────────┐
│  User enters    │
│  email/password │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     NO      ┌─────────────────┐
│ Email domain    │────────────▶│  Show error:    │
│ @teamfuture.in? │             │  Invalid domain │
└────────┬────────┘             └─────────────────┘
         │ YES
         ▼
┌─────────────────┐
│ Firebase Auth   │
│ createUser()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse email for │
│ name, year, div │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create user in  │
│ Data Connect    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set custom      │
│ claims (role)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send email      │
│ verification    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Registration   │
│   Complete!     │
└─────────────────┘
```

### Login Flow

```
┌─────────────────┐
│  User enters    │
│  email/password │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Firebase Auth   │
│ signIn()        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     NO      ┌─────────────────┐
│ Email verified? │────────────▶│  Show warning   │
│                 │             │  (allow access) │
└────────┬────────┘             └────────┬────────┘
         │ YES                           │
         ▼                               │
┌─────────────────┐◀─────────────────────┘
│ Fetch user from │
│ Data Connect    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼ EXISTS  ▼ NOT FOUND
┌─────────┐  ┌─────────────┐
│ Return  │  │ Create user │
│ profile │  │ in DB       │
└─────────┘  └─────────────┘
```

### Role-Based Access Control (RBAC)

#### Roles Hierarchy

```
SUPER_ADMIN
    │
    ▼
  ADMIN
    │
    ▼
  STUDENT
```

#### Role Permissions

| Permission | Student | Admin | Super Admin |
|------------|---------|-------|-------------|
| View events | ✅ | ✅ | ✅ |
| Book events | ✅ | ✅ | ✅ |
| Create events | ❌ | ✅ | ✅ |
| Edit own events | ❌ | ✅ | ✅ |
| Delete events | ❌ | ✅ | ✅ |
| Check-in users | ❌ | ✅ | ✅ |
| View all users | ❌ | ✅ | ✅ |
| Manage roles | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |

### Custom Claims Design

#### Claims Structure

```typescript
interface CustomClaims {
  role: 'student' | 'admin' | 'super_admin';
  emailDomain: string;  // teamfuture.in
  institutionId?: string;  // For multi-tenant future
}
```

#### Setting Claims (Cloud Function)

```typescript
// functions/src/auth/setCustomClaims.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const setUserRole = functions.https.onCall(async (data, context) => {
  // Only super_admin can change roles
  if (context.auth?.token.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can change roles');
  }
  
  const { userId, role } = data;
  
  // Validate role
  if (!['student', 'admin', 'super_admin'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }
  
  // Set claims
  await admin.auth().setCustomUserClaims(userId, {
    role,
    emailDomain: 'teamfuture.in'
  });
  
  // Update Data Connect
  // ... update user role in database
  
  return { success: true };
});
```

#### Auto-Set Claims on Registration

```typescript
// functions/src/auth/onUserCreate.ts
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  // Parse email for institutional info
  const email = user.email || '';
  const isInstitutional = email.endsWith('@teamfuture.in');
  
  // Default role based on email pattern
  const isAdmin = email.startsWith('admin.') || email.includes('.admin@');
  const role = isAdmin ? 'admin' : 'student';
  
  // Set custom claims
  await admin.auth().setCustomUserClaims(user.uid, {
    role,
    emailDomain: isInstitutional ? 'teamfuture.in' : email.split('@')[1]
  });
  
  // Create user profile in Data Connect
  // ...
});
```

### Validating Claims in Security Rules

#### Firestore Rules

```javascript
function hasRole(role) {
  return request.auth.token.role == role;
}

function isAdmin() {
  return hasRole('admin') || hasRole('super_admin');
}

function isSuperAdmin() {
  return hasRole('super_admin');
}

// Usage
match /events/{eventId} {
  allow create: if isAdmin();
  allow delete: if isAdmin() && resource.data.organizerId == request.auth.uid;
}
```

#### Data Connect Authorization

```graphql
# Public access
query ListPublishedEvents @auth(level: PUBLIC) { ... }

# Authenticated users only
query GetBookingById @auth(level: USER) { ... }

# Admin operations (checked in resolver)
mutation CreateEvent @auth(level: USER) { ... }
# Then validate role in Cloud Function middleware
```

### Session Management

#### Token Refresh Strategy

```typescript
// Auto-refresh ID token before expiry
import { getIdToken, onIdTokenChanged } from 'firebase/auth';

// Listen for token changes
onIdTokenChanged(auth, async (user) => {
  if (user) {
    // Get fresh token
    const token = await getIdToken(user, true);
    
    // Update any API clients with new token
    apiClient.setAuthToken(token);
  }
});

// Force refresh before important operations
const freshToken = await getIdToken(auth.currentUser, true);
```

#### Session Timeout

```typescript
// Configure session persistence
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

// For "Remember Me" checked - persist across sessions
await setPersistence(auth, browserLocalPersistence);

// For "Remember Me" unchecked - session only
await setPersistence(auth, browserSessionPersistence);
```

### Password Reset Flow

```
┌─────────────────┐
│  User clicks    │
│  "Forgot Pass"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enter email    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     NO      ┌─────────────────┐
│ Valid domain?   │────────────▶│  Show error     │
│ @teamfuture.in  │             │                 │
└────────┬────────┘             └─────────────────┘
         │ YES
         ▼
┌─────────────────┐
│ sendPassword    │
│ ResetEmail()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Show success   │
│  "Check email"  │
└─────────────────┘
```

### Email Verification Flow

```typescript
// After registration
import { sendEmailVerification } from 'firebase/auth';

const sendVerification = async (user: User) => {
  await sendEmailVerification(user, {
    url: `${window.location.origin}/auth?verified=true`,
    handleCodeInApp: true
  });
};

// Check verification status
const checkVerified = () => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    // Show verification reminder
    showVerificationBanner();
  }
};
```

### Social Login Integration

#### Google Sign-In

```typescript
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'teamfuture.in'  // Restrict to domain
    });
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Validate email domain
    if (!user.email?.endsWith('@teamfuture.in')) {
      await auth.signOut();
      return { success: false, error: 'Please use your @teamfuture.in email' };
    }
    
    // Create/update user profile in Data Connect
    // ...
    
    return { success: true, user: mappedUser };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
};
```

#### Apple Sign-In

```typescript
import { OAuthProvider, signInWithPopup } from 'firebase/auth';

const signInWithApple = async (): Promise<AuthResult> => {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Validate email domain
    if (!user.email?.endsWith('@teamfuture.in')) {
      await auth.signOut();
      return { success: false, error: 'Please use your @teamfuture.in email' };
    }
    
    // Create/update user profile in Data Connect
    // ...
    
    return { success: true, user: mappedUser };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
};
```

---

## Implementation Priority

### Phase 2 Complete ✅

1. ✅ Step 2.1: Data Connect Schema (`schema.production.gql`)
2. ✅ Step 2.2: Firestore Fallback Structure (documented above)
3. ✅ Step 2.3: Storage Structure (documented above)
4. ✅ Step 2.4: Authentication Strategy (documented above)

### Next: Phase 3 Implementation

1. Create `firestoreService.ts` - Firestore operations mirroring Data Connect
2. Update `dataConnectService.ts` - Replace localStorage with Firestore fallback
3. Update `storageService.ts` - Remove localStorage for images
4. Update `backend.ts` - Remove localStorage for reviews
5. Create Cloud Functions for:
   - User role management
   - Denormalized field updates
   - Orphaned file cleanup
   - Daily analytics aggregation

---

*Document Version: 2.0*
*Last Updated: January 13, 2026*
*Author: EventEase Architecture Team*
