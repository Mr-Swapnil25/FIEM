# Firebase Data Connect Deployment Guide

This guide walks you through setting up Firebase Data Connect with Cloud SQL PostgreSQL for the EventEase application.

## Prerequisites

1. **Firebase CLI** installed and logged in:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Google Cloud Billing** enabled on your Firebase project
3. **Firebase Blaze Plan** (Pay as you go) - required for Cloud SQL

## Step 1: Initialize Firebase in Your Project

```bash
# Navigate to project root
cd c:\Users\A1IN\Desktop\eventease

# Initialize Firebase
firebase init

# Select:
# - Data Connect: Set up a Firebase Data Connect service
# - Storage: Configure security rules for Cloud Storage
# - (Optional) Emulators for local development
```

## Step 2: Configure Firebase Project

Set your Firebase project:
```bash
firebase use future-project-148
```

## Step 3: Enable Required APIs

In Google Cloud Console (https://console.cloud.google.com), enable:
- Cloud SQL Admin API
- Firebase Data Connect API
- Service Networking API

Or use gcloud CLI:
```bash
gcloud services enable sqladmin.googleapis.com --project=future-project-148
gcloud services enable firebasedataconnect.googleapis.com --project=future-project-148
gcloud services enable servicenetworking.googleapis.com --project=future-project-148
```

## Step 4: Create Cloud SQL Instance

The Data Connect deployment will create the Cloud SQL instance automatically, but you can also create it manually:

```bash
# Create Cloud SQL PostgreSQL instance
gcloud sql instances create eventease-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --project=future-project-148

# Create database
gcloud sql databases create eventease \
  --instance=eventease-db \
  --project=future-project-148
```

## Step 5: Deploy Data Connect

```bash
# Deploy Data Connect schema and connectors
firebase deploy --only dataconnect

# Or deploy everything
firebase deploy
```

This will:
1. Create/update the Cloud SQL instance
2. Apply the PostgreSQL schema
3. Generate the TypeScript SDK
4. Deploy the GraphQL endpoints

## Step 6: Configure Authentication

1. Go to Firebase Console → Authentication
2. Enable **Email/Password** sign-in method
3. (Optional) Add authorized domains

### Email Domain Restriction

The app is configured to only allow emails from `@teamfuture.in` domain. To change this:

1. Update `.env`:
   ```
   VITE_ALLOWED_EMAIL_DOMAIN=@yourdomain.com
   ```

2. The email format expected is: `firstname.lastname.year.division@teamfuture.in`

## Step 7: Configure Storage Rules

Create or update `storage.rules`:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Event images - anyone can read, authenticated users can write
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // User avatars - anyone can read, owner can write
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tickets - only authenticated users can read their own
    match /tickets/{userId}/{ticketId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy storage rules:
```bash
firebase deploy --only storage
```

## Step 8: Seed Initial Data (Optional)

Create default categories after deployment:

```bash
# Using Firebase Data Connect Explorer in Firebase Console
# Or create a seed script
```

Example GraphQL mutation to create categories:
```graphql
mutation {
  category_insert(data: {
    name: "Cultural",
    description: "Cultural events and festivals",
    icon: "music",
    color: "#8B5CF6"
  })
}
```

## Step 9: Local Development with Emulators

For local development without hitting production:

```bash
# Start emulators
firebase emulators:start --only auth,dataconnect,storage

# In another terminal, run your dev server
npm run dev
```

Update `.env` for emulator mode:
```
VITE_USE_EMULATOR=true
```

## Project Structure

```
eventease/
├── dataconnect/
│   ├── dataconnect.yaml    # Data Connect configuration
│   ├── connector.yaml      # SDK generation config
│   ├── schema.gql          # PostgreSQL schema
│   ├── queries.gql         # GraphQL queries
│   └── mutations.gql       # GraphQL mutations
├── services/
│   ├── firebase.ts         # Firebase initialization
│   ├── authService.ts      # Authentication service
│   ├── dataConnectService.ts # Data Connect operations
│   └── backend.ts          # Business logic (legacy)
└── .env                    # Environment variables
```

## Environment Variables

Required environment variables (`.env`):

```
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyC1RbrBKzBKTj3gmxz0GuzpgHcyCdOHFpo
VITE_FIREBASE_AUTH_DOMAIN=future-project-148.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=future-project-148
VITE_FIREBASE_STORAGE_BUCKET=future-project-148.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=419364786805
VITE_FIREBASE_APP_ID=1:419364786805:web:1ded2ec0a1dd941361de3c
VITE_FIREBASE_MEASUREMENT_ID=G-454EJ1C9KJ

# Email Domain Restriction
VITE_ALLOWED_EMAIL_DOMAIN=@teamfuture.in

# Data Connect Configuration
VITE_DATACONNECT_SERVICE_ID=eventease-service
VITE_DATACONNECT_LOCATION=us-central1
VITE_DATACONNECT_CONNECTOR_ID=eventease-connector

# Development
VITE_USE_EMULATOR=false
```

## Troubleshooting

### "Cloud SQL instance not found"
- Ensure billing is enabled
- Wait a few minutes for instance creation
- Check Cloud SQL Admin API is enabled

### "Permission denied" errors
- Verify Firebase project permissions
- Check authentication token is valid
- Ensure user has correct role in database

### "Schema validation failed"
- Check schema.gql syntax
- Ensure all relationships are valid
- Run `firebase dataconnect:sql:diff` to see changes

### Data not syncing
- Check browser console for errors
- Verify Data Connect endpoint is reachable
- Ensure auth token is being sent

## Useful Commands

```bash
# View schema differences
firebase dataconnect:sql:diff

# Apply schema changes
firebase dataconnect:sql:migrate

# Generate SDK
firebase dataconnect:sdk:generate

# View logs
firebase functions:log

# Check project status
firebase projects:list
```

## Cost Considerations

Cloud SQL pricing (Blaze Plan):
- db-f1-micro: ~$10/month
- Storage: $0.17/GB/month
- Network egress: varies by region

To minimize costs:
- Use emulators for development
- Set up spending limits in Google Cloud Console
- Consider using db-f1-micro for development

## Next Steps

1. Run `firebase deploy --only dataconnect` to deploy
2. Test authentication with a sample user
3. Create categories using Firebase Console
4. Create your first event
5. Test booking flow

## Support

- Firebase Documentation: https://firebase.google.com/docs/data-connect
- Firebase Support: https://firebase.google.com/support
- Stack Overflow: Tag `firebase-data-connect`
