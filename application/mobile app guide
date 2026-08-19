# Gym App — Mobile App Execution Guide

**Stack: React Native + Expo**
**Owner: Mobile developer (1 person, other devs assist when available)**

---

## What This App Does

This is the app real users (gym members) download and use. It lets them find a gym, book a slot or buy a package, pay through Chapa, get a QR code, and check in at the gym. It's the product your users will judge you by — so stability and a smooth booking/payment flow matter more than visual polish.

---

## Why Expo

Expo is a toolkit on top of React Native that removes most of the native setup pain. You don't need to configure Android Studio or Xcode to get started. It also gives you push notifications and QR camera scanning almost for free. Use **Expo SDK 51** (latest stable).

---

## Project Setup

```bash
npx create-expo-app gym-mobile --template blank
cd gym-mobile
npx expo install expo-router expo-secure-store expo-camera
npx expo install expo-notifications expo-image-picker
npm install axios @react-native-async-storage/async-storage
npm install react-native-safe-area-context react-native-screens
```

---

## Project Structure

```
gym-mobile/
├── app/                     → screens (Expo Router uses file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── index.tsx        → Home (gym list)
│   │   ├── bookings.tsx     → My Bookings
│   │   └── profile.tsx      → Profile
│   ├── gym/
│   │   └── [id].tsx         → Gym Detail
│   ├── booking/
│   │   ├── new.tsx          → Book a slot / choose package
│   │   ├── payment.tsx      → Chapa payment webview
│   │   └── success.tsx      → Booking confirmed screen
│   └── _layout.tsx          → Root layout + auth guard
├── services/                → API call functions
├── components/              → reusable UI pieces
├── context/                 → auth state
├── constants/               → colors, sizes, API URL
└── .env
```

---

## Environment Variables (.env)

```
EXPO_PUBLIC_API_URL=https://yourapi.com/api
```

---

## Screens to Build

There are 10 screens. Here they are in order of priority.

---

### 1. Register Screen `(auth)/register`

**What it does:** New user creates an account.

**Fields:**

- Full name
- Email address
- Phone number
- Password
- Confirm password
- "Create Account" button
- Link to login screen ("Already have an account? Sign in")

**API call:** `POST /api/auth/register`

**On success:** Save the token, navigate to the Home screen (gym list).

**On error:** Show the error message below the form (e.g. "Email already in use").

---

### 2. Login Screen `(auth)/login`

**What it does:** Existing user signs in.

**Fields:**

- Email address
- Password
- "Sign In" button
- Link to register screen

**API call:** `POST /api/auth/login`

**On success:** Save the token, navigate to Home.

---

### 3. Home Screen (Gym List) `(tabs)/index`

**What it does:** The main screen users land on after logging in. Shows all available gyms.

**Layout:**

- Search bar at the top
- List of gym cards below — each card shows:
  - Gym photo (thumbnail)
  - Gym name
  - Address
  - Opening hours
  - A simple tag list of amenities (e.g. "Showers • Parking")
- Tapping a card goes to the Gym Detail screen

**API call:** `GET /api/gyms` on screen load. Filter the list locally when user types in search bar (filter by gym name or address).

**Handle empty state:** If no gyms are returned, show a friendly "No gyms available" message — not a blank screen.

---

### 4. Gym Detail Screen `gym/[id]`

**What it does:** Full information about one gym. User decides here whether to book.

**Layout:**

- Photo carousel at the top (swipeable photos)
- Gym name, address, hours, capacity
- Amenities list
- "Check Availability" section:
  - Date picker
  - Time slot picker
  - Shows how many spots are left for that time
- List of available packages with name, price, and duration
- "Book Now" button — takes the user to the Booking screen

**API calls:**

- `GET /api/gyms/:id` — load gym data when screen opens
- `GET /api/gyms/:id/availability?slot_start=...&slot_end=...` — called when user picks a time slot
- `GET /api/packages?gym_id=:id` — load packages

---

### 5. Booking Screen `booking/new`

**What it does:** User confirms their chosen time slot and package, then initiates payment.

**Layout:**

- Summary card at the top:
  - Gym name
  - Selected time slot
  - Selected package + price
- "Confirm and Pay" button
- A note below: "You will be taken to complete payment securely"

**What happens on "Confirm and Pay":**

1. Call `POST /api/bookings` with the selected gym, package, slot start/end
2. Backend responds with a Chapa `checkout_url`
3. Navigate to the Payment Screen and pass the `checkout_url`

If the backend returns 409 (slot full): show an alert — "Sorry, this slot just filled up. Please choose another time." — and go back to the Gym Detail screen.

---

### 6. Payment Screen `booking/payment`

**What it does:** Opens the Chapa payment page inside the app using a WebView, so the user never leaves the app to pay.

**Layout:**

- A WebView that loads the `checkout_url` from Chapa
- A loading indicator while the page loads
- A "Cancel Payment" button at the top

**How it works:**

- Load the Chapa checkout URL in the WebView
- Watch the WebView's URL as it changes
- When the URL changes to your `return_url` (the URL you set when initializing payment), capture the `tx_ref` from the URL parameters
- Call `GET /api/payments/verify/:tx_ref` to confirm with your backend
- If confirmed: navigate to Booking Success screen
- If failed: show error and go back

```bash
npx expo install react-native-webview
```

---

### 7. Booking Success Screen `booking/success`

**What it does:** Shown after payment is confirmed. Displays the QR code the user will use to check in.

**Layout:**

- Large green checkmark or success icon at the top
- "Booking Confirmed!" heading
- Booking summary (gym, date, time, package)
- Large QR code in the center (generated from the `qr_code` string returned by the backend)
- "View My Bookings" button

```bash
npx expo install react-native-qrcode-svg
```

Render the QR code: `<QRCode value={booking.qr_code} size={220} />`

---

### 8. My Bookings Screen `(tabs)/bookings`

**What it does:** User sees all their upcoming and past bookings. This is where they find their QR codes after the success screen.

**Layout:**

- Two tabs at the top: "Upcoming" and "Past"
- Each booking card shows:
  - Gym name and photo (small)
  - Date and time slot
  - Package name
  - Status badge (Confirmed / Cancelled / Checked In)
  - "Show QR Code" button (only for confirmed bookings)
- Tapping "Show QR Code" opens a fullscreen view of the QR code

**API call:** `GET /api/bookings/my`

---

### 9. QR Code Fullscreen View

Not a separate route — a Modal that opens over the Bookings screen. Shows the QR code large enough for a scanner to read. Keep the screen from dimming (use `expo-keep-awake`).

```bash
npx expo install expo-keep-awake
```

---

### 10. Profile Screen `(tabs)/profile`

**What it does:** User views and edits their account info. Also where they log out.

**Layout:**

- Profile photo (with option to change it)
- Name, email, phone — editable fields
- "Save Changes" button
- "Log Out" button at the bottom (red text)

**API calls:**

- `GET /api/users/me` — load current info
- `PUT /api/users/me` — save changes

---

## Navigation Structure

```
App starts
  ↓
AuthGuard (check for saved token)
  ├── No token → (auth) stack → Login / Register
  └── Has token → (tabs) navigator
        ├── Tab 1: Home (Gym List)
        ├── Tab 2: My Bookings
        └── Tab 3: Profile

From Home (Gym List) → push to Gym Detail (modal/stack)
From Gym Detail → push to Booking screen
From Booking → push to Payment (WebView)
From Payment → push to Booking Success
```

Bottom tab bar icons:

- Home → house icon
- Bookings → calendar icon
- Profile → person icon

---

## Auth & Token Storage

Store the JWT token securely using `expo-secure-store`, not AsyncStorage (AsyncStorage is not encrypted).

```javascript
// Save token after login
await SecureStore.setItemAsync("token", response.data.token);

// Read token
const token = await SecureStore.getItemAsync("token");

// Delete on logout
await SecureStore.deleteItemAsync("token");
```

Attach the token to every API call automatically using an axios interceptor (same pattern as the web app's services/api.js).

---

## API Service Layer

Create `services/api.js`:

```javascript
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

Then create one file per feature area:

- `services/auth.js` — login, register
- `services/gyms.js` — gym list, gym detail, availability
- `services/packages.js` — list packages
- `services/bookings.js` — create, my bookings
- `services/payments.js` — verify payment

---

## Push Notifications

Use **Expo Notifications** to receive booking confirmations and reminders.

```javascript
// On app start (after login), get the device's push token and send to backend
import * as Notifications from "expo-notifications";

const { status } = await Notifications.requestPermissionsAsync();
if (status === "granted") {
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await api.put("/users/me", { fcm_token: token });
}
```

The backend sends the notification when a booking is confirmed. The mobile app just needs to register the token and handle incoming notifications gracefully.

---

## General Rules for This App

- **Loading states everywhere** — every screen that fetches data should show a spinner while waiting, not a blank screen.
- **Error handling everywhere** — if an API call fails, show a human-readable message. Never show a raw error object to the user.
- **The booking flow is sacred** — test the path from "tap Book Now" to "see QR code" until it works perfectly every time, including when payment fails or the slot fills up mid-flow.
- **Test on both Android and iOS** — Expo makes this easy. Test on real devices, not just simulator, especially for payments and camera.
- **Offline awareness** — if the user has no internet, show a friendly "No connection" message rather than a crash.

---

## Build Order (stick to this sequence)

1. Expo project setup, folder structure, navigation skeleton (all screens exist but empty)
2. Register + Login screens + token storage + API service layer + auth guard
3. Home screen (gym list from API)
4. Gym Detail screen (photos, hours, availability check, packages)
5. Booking screen + POST /bookings call
6. Payment screen (WebView with Chapa URL)
7. Booking Success screen (QR code display)
8. My Bookings screen (upcoming + past)
9. Profile screen
10. Push notification registration
