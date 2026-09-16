# Gym Admin Dashboard

React + Vite admin dashboard for the Gym App backend, covering the three MVP admin flows:
gym info/hours/capacity, package pricing, and bookings/revenue.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. It talks directly to the live backend at
`https://gym-app-and-website.onrender.com` (set in `src/api.js` — change `BASE_URL` if you
point it at a local backend instead).

## Structure

- `src/api.js` — thin fetch wrapper for every endpoint the dashboard uses
- `src/AuthContext.jsx` — holds the admin JWT (in `sessionStorage`) and login/logout
- `src/App.jsx` — routes, sidebar nav, top bar with the gym switcher
- `src/pages/` — `Login`, `Gyms`, `GymForm` (add/edit), `Packages`, `Bookings`
- `src/index.css` — design tokens (colors, type) and all styling, no CSS framework

## Notes / things to confirm with backend

- Login expects the JWT back as `token`, `accessToken`, or `jwt` in the response body —
  adjust `AuthContext.jsx` if the real field name differs.
- Booking stats field names (`totalBookings`, `totalRevenue`, `totalCheckIns`) are guesses
  based on common naming — check `GET /api/bookings/stats`'s real response shape and adjust
  `Bookings.jsx` if needed.
- None of the list endpoints are confirmed paginated in the API docs; this build assumes
  they return full arrays.
- A `gym_admin` role is scoped to gyms/packages they own — ownership errors come back as
  403s and currently render as a generic error banner.
