# Gym Platform Web

React + Vite + Tailwind frontend for the Gym Platform backend (`https://gym-app-and-website.onrender.com`). One app, six role-based experiences: member, gym admin, trainer, physiotherapist, nutrition consultant and gym staff.

**Status:** all source is written and statically checked, but `npm install` and `npm run build` could not be run where it was authored and no live API call was made. See `docs/TEST_RESULTS.md`.

## Run locally

```bash
npm install
cp .env.example .env     # optional: defaults to the Render URL
npm run dev              # http://localhost:5173
npm run build && npm run preview
```

Requires Node 18+.

## Configuration

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Backend host root, no `/api` suffix (default `https://gym-app-and-website.onrender.com`). Paths such as `/api/auth/login` and `/api/v1/...` are added in code. |

Only this one non-secret value is read from the environment. Nothing secret belongs in a `VITE_` variable.

## Deploy (Vercel or any static host)

1. Import the repo, framework preset **Vite**, build command `npm run build`, output `dist`.
2. Set `VITE_API_URL` if it differs from the default.
3. `vercel.json` rewrites every path to `index.html` so React Router deep links work. On other hosts add the equivalent fallback.
4. On the backend: allow the deployed origin and `http://localhost:5173` in CORS (with the `Authorization` header), and set `FRONTEND_URL` to the deployed origin so Chapa returns to `/payment-success`, `/payment-failed` and `/payment-pending`.

## Roles and routes

| Role | Home | Login tab |
|---|---|---|
| MEMBER | `/app` | Member |
| GYM_ADMIN | `/admin` | Gym admin |
| TRAINER | `/trainer` | Coach |
| PHYSIOTHERAPIST | `/physio` | Coach |
| NUTRITION_CONSULTANT | `/nutrition` | Coach |
| GYM_STAFF | `/staff` | Gym staff |

Public routes: `/`, `/gyms` (explains sign-in is required), `/login`, `/register`, `/change-password`, `/unauthorized`, `/payment-*`. Route guards are a UX layer only; the backend enforces authorization.

## Authentication

The backend uses bearer JWTs, no cookies. The token is in `data.token` for provider/staff logins and top-level `token` for member/admin logins; `AuthContext` normalizes both. The session is stored in `localStorage` so it survives refresh and is validated with `GET /api/auth/me` on load. The trade-off is that any XSS could read it; the app renders no untrusted HTML and sends the token only to the configured API origin. A 401 clears the session and returns to sign-in; a `PASSWORD_CHANGE_REQUIRED` 403 routes to `/change-password`.

## Structure

```
src/
  api/          axios client (envelope unwrapping, retry GET only, auth handlers) + one module per endpoint group
  config/       env, roles, navigation, apiShape.js (switches for conflicting field names)
  contexts/     Auth, Toast, AdminGym (admin's active gym)
  hooks/        useAsync, useSubmit (blocks double submit), useDebounce
  components/   common (DataTable, Modal, states, ChatPanel...), layout, forms
  pages/        public, auth, member, admin, provider (trainer + physio), nutrition, staff
  routes/       ProtectedRoute
  utils/        format (Addis time, ETB), validators, errors, storage
docs/           ENDPOINT_MAP.md, MISSING_ENDPOINTS.md, TEST_RESULTS.md
```

## Behaviour worth knowing

- **Cold starts:** the app pings the server on load and shows a banner if it is slow; GET requests retry twice on network/502-504 errors. POST/PUT/PATCH/DELETE are never retried. Checkout reuses an already-created order if only the payment step fails, so a booking is never created twice.
- **Unverified endpoints** (`/api/v1/...`) render "Not available on this server yet" on 404 instead of fake data.
- **Times** are entered and shown in Africa/Addis_Ababa (UTC+3) and sent with an explicit `+03:00` offset. Prices are ETB.
- **Chat** polls every 10 s. Socket.io is not implemented (see `docs/MISSING_ENDPOINTS.md`).

## Documentation

- `docs/ENDPOINT_MAP.md`: every endpoint, the page that uses it, and its verification status.
- `docs/MISSING_ENDPOINTS.md`: what the backend team still needs to provide or confirm.
- `docs/TEST_RESULTS.md`: what was and was not tested.
