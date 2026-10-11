# Gym App — Web Admin Dashboard Execution Guide

**Stack: React + Tailwind CSS**
**Owner: Web frontend developer (1 person)**

---

## What This Dashboard Does

The web dashboard is for gym operators (admins). They use it to manage everything about their gym — listing info, packages, pricing, and seeing who has booked. It's not public-facing. Only logged-in gym admins can access it. Members never use this; they use the mobile app.

There is also a tiny check-in page on this web app that gym staff can open on any phone/tablet browser to scan QR codes at the door.

---

## Project Structure

```
gym-web-admin/
├── src/
│   ├── pages/          → one file per page/screen
│   ├── components/     → reusable pieces (buttons, tables, forms)
│   ├── services/       → API call functions (axios)
│   ├── context/        → global state (logged-in admin info)
│   └── utils/          → helper functions (date formatting, etc.)
├── public/
├── .env
└── index.html
```

---

## Environment Variables (.env)

```
VITE_API_URL=https://yourapi.com/api
```

All API calls go to this base URL.

---

## Pages to Build

There are 8 pages total. Here they are in order of priority.

---

### 1. Login Page `/login`

**What it does:** Gym admin enters email and password to access the dashboard.

**Layout:**

- Centered card on the screen
- App logo / name at the top
- Email input
- Password input
- "Sign In" button
- Error message below button if login fails

**API call:** `POST /api/auth/admin/login`

**On success:** Save the JWT token (in localStorage) and redirect to the Dashboard.

**Route protection:** If a user visits any page without a token, redirect them to `/login`. Wrap all other pages in an `<AuthGuard>` component that checks for the token.

---

### 2. Dashboard (Home) `/dashboard`

**What it does:** The first page an admin sees after logging in. Shows a quick overview of what's happening today.

**Layout:**

- Top navigation bar (gym name, logout button)
- 3 summary cards at the top:
  - **Today's Bookings** — count of confirmed bookings today
  - **Today's Revenue** — total ETB collected today
  - **Current Capacity** — e.g. "32 / 50 members right now"
- Below cards: a simple table of today's bookings (member name, time slot, package, status)

**API call:** `GET /api/admin/summary` to get the card numbers.
`GET /api/admin/bookings?date=today` for the bookings table.

---

### 3. Gym Profile `/gym`

**What it does:** Admin views and edits their gym's public information — what members see in the mobile app.

**Layout:**

- Form at the top with current values pre-filled:
  - Gym name
  - Address
  - Opening time / Closing time
  - Capacity (max members at a time)
  - Amenities (a multi-select or tag input: Showers, Parking, Sauna, etc.)
- Photo section below: shows current photos, allows uploading new ones
- "Save Changes" button

**API calls:**

- `GET /api/gyms/:id` — load current gym data when page opens
- `PUT /api/gyms/:id` — save changes on button click

**Important:** Show a success toast ("Saved!") or error message after the save attempt so the admin knows it worked.

---

### 4. Packages `/packages`

**What it does:** Admin creates and manages the membership packages members can buy (Daily, Weekly, Monthly, Annual).

**Layout:**

- List of existing packages — each shows: name, type, price, duration, active/inactive toggle
- "Add New Package" button at the top right → opens a modal/form
- Each package row has an Edit button and an Active/Inactive toggle

**Add/Edit Package form fields:**

- Package name (e.g. "Monthly Premium")
- Type: dropdown — Daily / Weekly / Monthly / Annual
- Price (in ETB)
- Duration in days (e.g. 30)
- Benefits description (text area, optional)

**API calls:**

- `GET /api/packages?gym_id=1` — list packages
- `POST /api/packages` — create new
- `PUT /api/packages/:id` — edit existing
- `DELETE /api/packages/:id` — deactivate

---

### 5. Bookings `/bookings`

**What it does:** Admin sees all bookings for their gym — who booked, when, what package, and what the status is.

**Layout:**

- Filter bar at top: date range picker + status filter (All / Confirmed / Cancelled / Checked In)
- Table below with columns:
  - Member name
  - Package name
  - Date & time slot
  - Status (color coded: green = confirmed, grey = cancelled, blue = checked in)
  - Booked at (when they made the booking)

**API call:** `GET /api/bookings?gym_id=1&status=confirmed&date_from=...&date_to=...`

Keep this page simple — no bulk actions needed at this stage.

---

### 6. Revenue `/revenue`

**What it does:** Admin sees how much money has been collected, broken down by date or by package.

**Layout:**

- Date range picker at the top (default: current month)
- Summary at top: Total revenue for selected period
- Simple bar chart below: revenue per day in the selected range
- Table below the chart: each row is a completed payment (member, package, amount, date)

**API call:** `GET /api/admin/revenue?from=2024-05-01&to=2024-05-31`

**Chart library:** Use `recharts` — it works directly in React with no extra setup.

---

### 7. Check-In Scanner `/checkin`

**What it does:** A simple page gym staff open on a phone or tablet at the front desk. They type or paste a QR code value to validate a member's booking. No native app needed — just a browser page.

**Layout:**

- Large text input box in the center labeled "Scan or Enter QR Code"
- "Validate" button below
- Result area below button:
  - Green box: "✓ Valid — Abebe Bekele, Monthly Pass, 09:00–10:00"
  - Red box: "✗ Invalid or Already Used"

**Optional upgrade:** Use a library like `html5-qrcode` to enable the phone's camera to scan the QR code directly (the text field is the fallback if this is too complex).

**API call:** `POST /api/bookings/checkin` with `{ qr_code: "GYMAPP-123-uuid" }`

This page should work well on a mobile browser — keep it clean, large text, big button.

---

### 8. Not Found `/404`

A simple "Page not found" screen with a link back to the dashboard. Required so users don't see a blank white screen if they hit a wrong URL.

---

## Navigation Structure

```
/login           → public, no auth required
/dashboard       → protected
/gym             → protected
/packages        → protected
/bookings        → protected
/revenue         → protected
/checkin         → protected (but mobile-friendly, minimal nav)
```

Top navigation bar (visible on all protected pages):

- Left: App name / logo
- Right: Logged-in admin name + Logout button

Left sidebar with links to: Dashboard, Gym Profile, Packages, Bookings, Revenue

The check-in page has no sidebar — it's standalone and minimal.

---

## API Service Layer

Don't scatter `axios.get(...)` calls all over your components. Create a `services/` folder with one file per feature:

```javascript
// services/api.js — base axios instance
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

```javascript
// services/gyms.js
import api from "./api";
export const getGym = (id) => api.get(`/gyms/${id}`);
export const updateGym = (id, data) => api.put(`/gyms/${id}`, data);
```

```javascript
// services/bookings.js
import api from "./api";
export const getBookings = (params) => api.get("/bookings", { params });
export const checkIn = (qr_code) => api.post("/bookings/checkin", { qr_code });
```

---

## Auth State (Context)

Create an `AuthContext` that stores the logged-in admin info and the token. Wrap the whole app in it. The `AuthGuard` component reads from this context.

```javascript
// On login success:
localStorage.setItem("token", response.data.token);
localStorage.setItem("admin", JSON.stringify(response.data.admin));

// On logout:
localStorage.removeItem("token");
localStorage.removeItem("admin");
navigate("/login");
```

---

## npm Packages

```bash
npm create vite@latest gym-web-admin -- --template react
cd gym-web-admin
npm install axios react-router-dom recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## Build Order (stick to this sequence)

1. Project setup, Tailwind, routing skeleton (all pages exist but empty)
2. Login page + auth guard + API service layer
3. Dashboard page (summary cards + bookings table)
4. Gym Profile page (view + edit form)
5. Packages page (list + add/edit modal)
6. Bookings page (table + filters)
7. Revenue page (summary + chart + table)
8. Check-in scanner page

---

## General Rules for This Dashboard

- **Always show loading states** — when waiting for an API call, show a spinner or "Loading..." so the admin isn't staring at an empty table.
- **Always show error messages** — if an API call fails, show the error message, don't just silently fail.
- **Keep it functional, not fancy** — this is an internal tool. Clean and usable beats beautiful. Don't spend time on animations or elaborate design.
- **Test on both desktop and tablet** — the dashboard will mostly be used on desktop, but the check-in page must work well on a mobile browser.
