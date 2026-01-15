# Phase 3: Firebase Production Implementation Guide

> **ZERO localStorage TOLERANCE** - All data persists in Firebase

---

## 🎯 Implementation Summary

This guide documents the complete Firebase production implementation for EventEase, replacing ALL localStorage-based data persistence with Firebase services.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        EventEase App                        │
├─────────────────────────────────────────────────────────────┤
│  Auth Layer: Firebase Authentication (@teamfuture.in only)  │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer (Priority)                      │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Firebase Data     │    │   Cloud Firestore           │ │
│  │   Connect (Primary) │ => │   (Fallback)                │ │
│  │   Cloud SQL/Postgres│    │   firestoreService.ts       │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer: Firebase Storage (Images, Documents, PDFs)  │
├─────────────────────────────────────────────────────────────┤
│                 ❌ localStorage: NEVER USED                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Files Modified/Created

### New Files Created

| File | Purpose |
|------|---------|
| `services/firestoreService.ts` | Firestore CRUD operations (~1100 lines) |
| `dataconnect/connector/queries.production.gql` | Production GraphQL queries |
| `dataconnect/connector/mutations.production.gql` | Production GraphQL mutations |
| `firestore.production.rules` | Production Firestore security rules |
| `storage.production.rules` | Production Storage security rules |
| `cors.json` | CORS configuration for Storage bucket |
| `.env.example` | Environment variables template |

### Files Modified (localStorage Removed)

| File | Changes |
|------|---------|
| `services/storageService.ts` | Complete rewrite - Firebase Storage ONLY |
| `services/dataConnectService.ts` | Replaced localStorage with Firestore fallback |
| `services/backend.ts` | Replaced localStorage reviews with Firestore |
| `services/firebase.ts` | Added Storage exports (listAll, getMetadata) |

### Deprecated File (Not Imported)

| File | Status |
|------|--------|
| `services/mockBackend.ts` | ⚠️ ORPHANED - Not imported anywhere, safe to delete |

---

## 🔧 Environment Configuration

### Required Environment Variables (.env)

```bash
# Firebase Core Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=future-project-148.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=future-project-148
VITE_FIREBASE_STORAGE_BUCKET=future-project-148.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Data Connect Configuration
VITE_USE_DATA_CONNECT=true
VITE_DATACONNECT_SERVICE_ID=fiem-project
VITE_DATACONNECT_LOCATION=asia-south1
VITE_DATACONNECT_CONNECTOR=eventease-connector

# Environment Mode
VITE_ENV=production
```

### Environment Modes

| `VITE_USE_DATA_CONNECT` | Behavior |
|------------------------|----------|
| `true` | Uses Data Connect (primary) → Firestore (fallback) |
| `false` | Uses Firestore directly |

---

## 🚀 Deployment Commands

### 1. Deploy Firestore Security Rules

```bash
# Copy production rules to firebase.json expected location
cp firestore.production.rules firestore.rules

# Deploy rules
firebase deploy --only firestore:rules
```

### 2. Deploy Storage Security Rules

```bash
# Copy production rules to firebase.json expected location
cp storage.production.rules storage.rules

# Deploy rules
firebase deploy --only storage
```

### 3. Configure Storage CORS

```bash
# Using gsutil (install Google Cloud SDK if needed)
gsutil cors set cors.json gs://future-project-148.firebasestorage.app
```

### 4. Deploy Data Connect Schema (if using)

```bash
# Navigate to dataconnect directory
cd dataconnect

# Deploy schema and connectors
firebase deploy --only dataconnect
```

### 5. Full Deployment

```bash
# Deploy everything
firebase deploy
```

---

## 📊 Data Services Reference

### storageService.ts Exports

| Function | Description |
|----------|-------------|
| `uploadEventImage(file, eventId)` | Upload event banner/image |
| `uploadUserAvatar(file, userId)` | Upload user profile picture |
| `uploadIdCard(file, userId)` | Upload student ID verification |
| `uploadTicket(pdfBlob, bookingId, userId)` | Upload generated PDF ticket |
| `getEventImageURL(eventId)` | Get event image download URL |
| `getUserAvatarURL(userId)` | Get user avatar download URL |
| `getUserIdCards(userId)` | List user's ID card files |
| `getTicketURL(bookingId, userId)` | Get ticket PDF download URL |
| `deleteFile(filePath)` | Delete file from Storage |
| `getFileMetadata(filePath)` | Get file metadata |
| `listFiles(path)` | List files in a directory |

### dataConnectService.ts Exports

| Function | Description | Fallback |
|----------|-------------|----------|
| `getUserByEmail(email)` | Get user by email | Firestore |
| `listPublishedEvents(limit, offset)` | List published events | Firestore |
| `getEventById(id)` | Get single event | Firestore |
| `createUser(input)` | Create new user | Firestore |
| `createBooking(input)` | Create booking | Firestore |
| `createEvent(input)` | Create event | Firestore |
| `updateEvent(id, input)` | Update event | Firestore |
| `deleteEvent(id)` | Delete event | Firestore |
| `getUserBookings(userId)` | Get user's bookings | Firestore |
| `getEventParticipants(eventId)` | Get event participants | Firestore |
| `cancelBooking(bookingId)` | Cancel booking | Firestore |
| `checkInParticipant(bookingId)` | Check in participant | Firestore |
| `listCategories()` | List all categories | Firestore |
| `getUserFavorites(userId)` | Get user favorites | Firestore |
| `addFavorite(userId, eventId)` | Add to favorites | Firestore |
| `removeFavorite(userId, eventId)` | Remove from favorites | Firestore |
| `getUserNotifications(userId)` | Get user notifications | Firestore |
| `createNotification(input)` | Create notification | Firestore |
| `markNotificationRead(id)` | Mark notification as read | Firestore |
| `getDashboardStats()` | Get admin dashboard stats | Firestore |

### backend.ts Exports (Reviews)

| Function | Description |
|----------|-------------|
| `getEventReviews(eventId)` | Get reviews for an event |
| `getUserReviewForEvent(userId, eventId)` | Check if user reviewed event |
| `createReview(reviewData)` | Submit new review |
| `deleteReview(reviewId, eventId)` | Delete a review |
| `flagReview(reviewId, eventId, userId)` | Flag review for moderation |
| `getAllReviews()` | Get all reviews (admin) |
| `updateEventRatingStats(eventId)` | Recalculate event rating |

### firestoreService.ts Exports

| Function | Description |
|----------|-------------|
| `getUserById(id)` | Get user by ID |
| `getUserByEmail(email)` | Get user by email |
| `createUser(data)` | Create user document |
| `updateUser(id, data)` | Update user document |
| `getEventById(id)` | Get event by ID |
| `listEvents(options)` | List events with filters |
| `listPublishedEvents(limit, offset)` | List published events |
| `createEvent(data)` | Create event document |
| `updateEvent(id, data)` | Update event document |
| `deleteEvent(id)` | Delete event document |
| `getUserBookings(userId)` | Get user's bookings |
| `getEventParticipants(eventId)` | Get event participants |
| `createBooking(data)` | Create booking document |
| `cancelBooking(bookingId)` | Cancel booking |
| `checkInParticipant(bookingId)` | Check in participant |
| `listCategories()` | List categories |
| `createCategory(data)` | Create category |
| `getUserFavorites(userId)` | Get user favorites |
| `checkIsFavorite(userId, eventId)` | Check if favorited |
| `addFavorite(userId, eventId)` | Add favorite |
| `removeFavorite(userId, eventId)` | Remove favorite |
| `getUserNotifications(userId)` | Get notifications |
| `createNotification(data)` | Create notification |
| `markNotificationRead(id)` | Mark as read |
| `getEventReviews(eventId)` | Get event reviews |
| `createReview(data)` | Create review |
| `deleteReview(reviewId)` | Delete review |
| `flagReview(reviewId, userId)` | Flag review |
| `getDashboardStats()` | Get dashboard stats |
| `toTimestamp(date)` | Convert to Firestore Timestamp |
| `timestampToISO(timestamp)` | Convert Timestamp to ISO string |
| `generateId()` | Generate unique ID |
| `generateTicketId()` | Generate ticket ID |

---

## 🔐 Security Rules Summary

### Firestore Rules

- **Users**: Read own profile, write own profile, admin full access
- **Events**: Public read for published, admin CRUD
- **Bookings**: User reads own bookings, admin full access
- **Reviews**: Public read, authenticated create, owner/admin delete
- **Categories**: Public read, admin write
- **Notifications**: User reads/writes own, admin full access

### Storage Rules

- **Event images**: Public read, admin write
- **User avatars**: Public read, owner write
- **ID cards**: Owner and admin only
- **Tickets**: Owner and admin only, PDF only, max 10MB

---

## ✅ Verification Checklist

### Pre-Deployment

- [ ] Environment variables configured in `.env`
- [ ] Firebase project `future-project-148` accessible
- [ ] Firebase CLI logged in (`firebase login`)
- [ ] Data Connect enabled in Firebase Console (if using)

### Post-Deployment

- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] CORS configured for Storage bucket
- [ ] Test user registration (Google Sign-In)
- [ ] Test event creation (admin)
- [ ] Test event booking (student)
- [ ] Test image upload
- [ ] Test ticket PDF generation
- [ ] Verify no localStorage usage in browser DevTools

### localStorage Verification

Open browser DevTools → Application → Local Storage:
- Should see NO application data
- Only acceptable: `envErrors` (configuration error tracking)

---

## 🧪 Testing

### Quick Smoke Test

```typescript
// In browser console
import { listPublishedEvents } from './services/dataConnectService';
const events = await listPublishedEvents();
console.log('Events from Firebase:', events);

// Should NOT see any localStorage access in Network/Application tabs
```

### Verify No localStorage

```javascript
// In browser console
Object.keys(localStorage).forEach(key => {
  if (!key.includes('envErrors')) {
    console.error('UNEXPECTED localStorage key:', key);
  }
});
```

---

## 🔄 Migration from localStorage

If you have existing localStorage data:

1. **Export existing data** (before deployment):
   ```javascript
   const backup = {};
   Object.keys(localStorage).forEach(key => {
     backup[key] = localStorage.getItem(key);
   });
   console.log(JSON.stringify(backup, null, 2));
   ```

2. **Clear localStorage** after migration:
   ```javascript
   localStorage.clear();
   ```

3. **Import to Firestore** using Firebase Console or migration script

---

## 📝 Notes

### Why Firestore Fallback (Not localStorage)?

1. **Data persistence**: Firestore persists across devices/sessions
2. **Real-time sync**: Automatic sync across tabs/devices
3. **Offline support**: Firestore has built-in offline persistence
4. **Security**: Server-side security rules vs client-side storage
5. **Scalability**: Seamless scaling from dev to production

### Data Connect vs Firestore

| Aspect | Data Connect | Firestore |
|--------|--------------|-----------|
| Backend | Cloud SQL PostgreSQL | NoSQL Document DB |
| Queries | GraphQL | SDK methods |
| Relations | True SQL relations | Manual denormalization |
| Best for | Complex queries, reports | Simple CRUD, real-time |

### When Fallback Triggers

- Data Connect not enabled (`VITE_USE_DATA_CONNECT=false`)
- Data Connect service unavailable
- Network errors to Data Connect
- GraphQL query/mutation errors

---

## 📞 Support

- **Firebase Project**: `future-project-148`
- **Data Connect Service**: `fiem-project`
- **Region**: `asia-south1`
- **Allowed Domain**: `@teamfuture.in`
- **Storage Bucket**: `future-project-148.firebasestorage.app`

---

*Last Updated: Phase 3 Implementation Complete*
*localStorage Usage: ZERO*
