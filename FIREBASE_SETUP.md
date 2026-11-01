# Firebase setup — Aditi Cosmetics

This project now includes a Firebase client setup, Firestore product service helpers, and starter security rules.

## 1. Create a Firebase project
1. Open https://console.firebase.google.com/
2. Create a project named `aditi-cosmetics` (or your preferred project ID).
3. Add a Web App from Project Overview.
4. Copy the Firebase web app configuration values.

## 2. Add local environment values
1. Copy `.env.example` and name the copy `.env.local`.
2. Replace each placeholder with the values from Firebase Project settings.
3. Do not commit `.env.local` to a public repository.

The Firebase web config is used by the browser; security comes from Firebase Authentication and the database/storage rules, not from hiding these values.

## 3. Enable Firebase services
In Firebase Console:
- Authentication → Sign-in method → enable Email/Password.
- Firestore Database → Create database.
- Storage → Get started.

## 4. Publish security rules
- Firestore → Rules → paste `firestore.rules` → Publish.
- Storage → Rules → paste `storage.rules` → Publish.

These are starter rules. Review them before production, especially order validation and any future customer profile fields.

## 5. Create the first admin safely
1. In Authentication, add your own admin email as a user (or register it through a future admin login screen).
2. Copy that user's UID.
3. In Firestore, create a collection named `admins`.
4. Add a document whose document ID is exactly that UID. It can contain `{ "role": "admin" }`.

Only a trusted project owner should create this document. The website must never allow users to create or edit their own admin record.

## 6. Install and run
```bash
npm install
npm run dev
```

## Current integration status
- `src/firebase.js` initializes Firebase only when `.env.local` is configured.
- `src/firebaseStore.js` provides cloud product read, live subscription, create, update, and delete functions.
- The existing storefront still runs in local demo mode until the UI is wired to these services and an admin sign-in flow is added.
- No real payments are enabled. Connect a payment provider only after order creation, server-side verification, and webhook validation are implemented.

## Before going live
Do not treat the current demo Admin page as secure. The next coding step is to wire Firebase Auth into the admin screen and replace local product CRUD with the cloud service functions. Then add image upload, order validation, payment verification, and production testing.


## Checkout and orders (Cash on Delivery)
- Enable Authentication → Sign-in method → **Anonymous**. Checkout uses an anonymous Firebase user so each guest order is authenticated and can be tied to a UID.
- Publish the updated `firestore.rules` file in Firestore → Rules.
- Customers can place Cash on Delivery orders. Orders are saved in the `orders` collection.
- Admin dashboard → Orders shows orders and allows status updates.
- Online payment is intentionally not enabled. Add a trusted backend (Cloud Functions/server) for payment order creation, signature verification, and provider webhooks before enabling online payments.
