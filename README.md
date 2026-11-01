# Aditi Cosmetics — Starter Website

A responsive React + Vite cosmetics storefront with a demo product-management dashboard.

## Run locally
1. Install Node.js (LTS).
2. Open Terminal in this folder.
3. Run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL printed by Vite (usually http://localhost:5173).

## Included
- Premium blush / beige storefront design
- Search, category filters, and price sorting
- Product cards and shopping bag with quantity controls
- Admin product add / edit / delete
- Browser localStorage persistence
- Responsive mobile layout

## Important before publishing
This is a frontend starter/demo. It does NOT yet include:
- Secure admin authentication
- Cloud database or image storage
- Real checkout / payment processing
- Order management or customer accounts

Do not use the demo admin screen as a secure production admin panel. The next phase should connect Firebase Authentication, Firestore, Storage, security rules, and then a payment provider in test mode before going live.

## Firebase preparation
See `FIREBASE_SETUP.md` for Firebase project setup, environment variables, starter Firestore/Storage rules, and admin UID setup. Cloud product helper functions are in `src/firebaseStore.js`; the existing UI remains in local demo mode until Firebase Auth and those functions are wired into the screens.


## Checkout and order management
- Cash on Delivery checkout with customer delivery details.
- Guest checkout uses Firebase Anonymous Authentication; enable it in Firebase Console.
- Orders are saved in Firestore and visible in the Admin → Orders section.
- Admin can update order status (New, Confirmed, Packed, Shipped, Delivered, Cancelled).
- Online payments are not included; integrate them only with a trusted server-side verification flow.
