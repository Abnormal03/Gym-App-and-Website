# Gym Platform — Shared Project Source of Truth

**Purpose:** Coordinate mobile app, backend, and web work from the same description of the current system and the agreed future scope.

**Last reviewed:** 2026-10-28
**Status:** Baseline captured; roadmap items are proposals until their decision records are completed.  
**Maintainer:** Product/engineering team. The mobile app developer maintains this document with input from backend and web owners.

## How to use this document

- Treat **Current system** as a code-based snapshot, not a guarantee that every flow has been verified against a running deployment.
- Treat **Planned features** as requested scope, not implemented functionality or settled requirements.
- Before starting an item, agree on its decisions and acceptance criteria below. Update the API/data contract here before or alongside implementation.
- Backend authorization and validation are authoritative. A client-side route guard or hidden control is not a security boundary.
- Keep this file in version control. For a change spanning projects, each project owner should review the contract and record the implementation PR/commit under the feature.

## Projects and code locations

| Project | Location | Current role |
|---|---|---|
| Member mobile application | `Gym-App-and-Website/application` (this repo, branch `app/V3Features`) | Expo / React Native member app |
| Backend | `~/projects/gym-backend/backend` (separate repo, observed branch `backend`) | Express API, Prisma/PostgreSQL, JWT auth, payments, Socket.IO |
| Web application | `~/projects/gym-web2/website` (observed branch `v2web`) | React / Vite portal for members, gym admins, providers, nutrition consultants, and staff |

The `backend/` folder and `backend` branch inside the mobile repository are an older, reduced snapshot. Use `~/projects/gym-backend` as the backend implementation reference unless the team explicitly changes that source. Do not copy an API contract from the old snapshot without checking the expanded backend.

## Current system

### Architecture

- The mobile and web clients call the same HTTP API under `/api` using Bearer JWTs.
- The backend is Express with Prisma and PostgreSQL. It owns persisted state, business rules, role checks, bookings, payments, and provider/staff management.
- Chapa handles hosted payment. The backend creates/validates payment state and handles callback/webhook verification; clients must not treat a browser redirect as proof of payment.
- The web portal is one React application with role-specific routes. The mobile app is an Expo Router application focused on members.
- Real-time chat is available in the backend through Socket.IO. The mobile client has a Socket.IO chat-thread flow. The web README describes polling for chat; the web client should be checked before assuming parity.

### Roles present in the code

`MEMBER`, `GYM_ADMIN`, `GYM_STAFF`, `TRAINER`, `PHYSIOTHERAPIST`, and `NUTRITION_CONSULTANT` are represented in current backend/web flows. The requested **super admin** role is not established by the reviewed routes and is a future design item.

### Current member flow

1. Register/login through `/api/auth/register` and `/api/auth/login`.
2. Browse gyms and availability via `/api/gyms`; inspect packages via `/api/packages`.
3. Quote and create a checkout via `/api/checkout/quote` and `/api/checkout`.
4. If payment is needed, initialize/verify through `/api/payments`; the payment page is hosted by Chapa.
5. Read bookings via `/api/bookings` or `/api/bookings/my-bookings`. The app's booking service exposes both forms.
6. Request a member check-in pass through `/api/me/pass`; gym staff/admin scan through `/api/checkins/scan`.

The mobile booking screen currently uses the combined checkout endpoint. Older guides describe a separate booking creation followed by payment initialization; use the current implementation and live backend contract when changing this flow.

### Current web portal

The web code has member booking/profile/session/chat views; gym admin pages for gyms, packages, bookings, members, providers, staff, payouts, leaderboard, and profile; provider pages for profile/account, availability, packages, clients, sessions, reviews, and earnings; nutrition consultant pages; and staff dashboard/check-in/account pages.

Web auth supports member, admin, provider, and staff login entry points. It normalizes the different token response envelopes and validates/restores sessions via `/api/auth/me`. The portal README says gym admin, trainer, physiotherapist, nutrition consultant, and staff are role-specific experiences.

### Current trainer/provider and payment groundwork

- Backend provider records are typed (trainer, physiotherapist, nutrition consultant) and associated with a gym when applicable. Provider self-service endpoints exist for profile, availability, packages, clients, and nutrition consultation plans.
- Members can select a provider as part of a gym checkout/session flow.
- Provider earnings and payout endpoints/UI exist. Gym admins have payout management in the web UI.
- The reviewed model/routes do **not** establish the requested distinction among private-hired, gym-assigned, and independently registered trainers as full business relationships. Nor do they settle who collects/owes each payment in all three cases.

## V3 mobile UI refresh: home and member navigation

- **Status:** UI scope agreed from the supplied screenshots; implementation in progress.
- **User outcome:** Members can find a gym quickly and reach their main destinations from the bottom navigation or drawer.
- **Scope:** Refresh the existing gym home screen, custom bottom tab bar, and member drawer to follow the supplied reference. Booking flow is explicitly a later UI slice.
- **Home behavior:** Show a greeting using the signed-in member's name, a gym search field, the existing near-me action, quick gym filters, a “Nearby gyms” list with “See all”, and gym cards showing the available gym information. Preserve current gym details navigation, loading, retry, and empty/error handling.
- **Bottom navigation shown in reference:** Home, Feed, Bookings, Chats, Profile. Bookings, Chats, and Profile keep their existing routes. Feed opens a clearly labeled empty “Coming soon” state for this slice; content-sharing behavior remains a separate future feature.
- **Drawer shown in reference:** Member initials/photo, name and email; Home, My Bookings, My Sessions, Payment History, My Ratings and Reviews, Settings, Help and Support, Terms of Service, Privacy Policy, and Log Out. Keep existing route/logout behavior unless a separate route contract is agreed.
- **Existing app data shapes:** signed-in member from the auth store; gym cards use the existing `Gym` type. No mobile API, database, or payment contract change is part of this UI slice.
- **Existing backend dependency (verified in source):** `GET /api/gyms` and `GET /api/gyms/search` provide the current gym list/search flow; the app already uses device location and gym detail requests for “Near me”. The list fields include name, address, hours, capacity, photos, and amenities.
- **Known data gap:** The expanded backend's gym-list query does not include package data or a monthly price. Do not hard-code a sample price or silently add a request per gym. The card shows a monthly price only if monthly package data is already present on the gym object; current live gym-list responses therefore omit it.
- **Working UI assumptions:** (1) Feed opens a labeled “Coming soon” empty state with no fabricated posts; (2) the 24/7 chip recognizes `00:00`–`23:59` hours because the current backend requires opening time to be earlier than closing time; (3) show a gym price only when the current list data includes a valid monthly package, and make no extra request per card. The current gym list contains no package data, so current live cards will omit the price. These assumptions can be changed by the project owner during review.
- **Acceptance criteria:** Match the supplied home/drawer/tab visual hierarchy; remain usable in light and dark themes; provide accessible labels and selected states; preserve the live gym search, near-me, gym-detail, drawer navigation, and logout behavior; show correct loading, empty, and error/retry states; do not represent demo or placeholder content as live data.
- **Implementation references:** `APPLICATION_DEV_CHECKLIST.md` (Phase A–E workflow); current implementation branch `app/V3Features`. Backend/web changes: none planned for this slice.

## V3 mobile auth and drawer access refresh

- **Status:** In progress; visual implementation follows the supplied light/dark sign-in reference.
- **Scope:** Restyle existing member sign-in and sign-up screens with Bole Elite branding, light/dark selection, language affordance, password visibility control, and inline auth error presentation. Make drawer access explicit with a hamburger on Home while keeping the avatar as a profile shortcut.
- **Visual system:** Use the shared light/dark theme palette across auth and Home. Keep a common type hierarchy (page titles, supporting text, field labels/input text, and controls) and match the supplied proportions, including larger gym imagery and readable bottom-tab labels.
- **Behavior and contracts:** Existing `/api/auth/login` and `/api/auth/register` service calls, payloads, session persistence, and post-auth navigation remain unchanged. Auth errors stay client presentation state; no API or backend contract changes are part of this UI update. The sign-in screen shows a generic recoverable error banner and red input outlines when authentication fails.
- **Acceptance criteria:** Auth screens follow the provided light/dark hierarchy; error feedback is visible above the form and invalid fields are highlighted; password visibility remains controllable; the Home hamburger opens the existing member drawer and profile avatar opens Profile.
- **Open limitation:** The existing “Forgot password?” link has no implemented route or backend contract, so this visual pass does not add a recovery flow.
- **Implementation references:** `application/app/(app)/(auth)/login.tsx`, `application/app/(app)/(auth)/Signup.tsx`, and `application/app/(app)/(drawer)/(tabs)/index.tsx`. No backend or web changes planned.

## Cross-client API conventions

- Base URL is environment-configured. Mobile uses `EXPO_PUBLIC_API_URL` and appends `/api` if needed. Web uses `VITE_API_URL` as the backend host root and includes `/api/...` in its API modules.
- Authenticated requests send `Authorization: Bearer <token>`.
- Backend role and resource ownership checks decide access; frontend guards exist to improve navigation only.
- Preserve each endpoint's actual request/response envelope. The mobile Axios response interceptor returns `response.data`; the web API client also normalizes envelopes. Avoid silently changing response shapes used by either client.
- Keep monetary values in ETB unless a feature decision explicitly adds currencies. Booking times are presented in Addis Ababa time in the web app; clients should send explicit offsets/instants and backend remains responsible for canonical time handling.
- Some web API modules deliberately call `/api/v1/...` paths marked as not verified/available in their own comments. The inspected backend mounts many current routes at `/api/...` without `/v1`. Treat these endpoints as a known contract mismatch and verify before depending on them.

## Planned features (requested; not yet specified or implemented as a complete set)

No ordering or release commitment has been agreed. Work will be taken one item at a time.

1. **Content sharing for users** — audience, content types, privacy, moderation, reporting, and ownership are undecided.
2. **Self-registration for gyms** — registration fields, verification/approval, duplicate handling, and when a gym becomes publicly bookable are undecided.
3. **Customizable individual gym websites** — customization scope, URL/domain model, templates, publication controls, and gym data visibility are undecided.
4. **Trainer payment options** — direct payment from member to trainer and indirect payment through a gym are requested. Collection, settlement, fees, refunds, receipts, and payout responsibilities need decisions.
5. **Trainer video sharing with clients** — upload/hosting, access control, retention, size/format limits, and moderation need decisions.
6. **Admin profile update** — existing admin profile read and profile UI are present; confirm which fields may be edited and whether this feature means extending the current flow.
7. **Super admin supervision and approval** — new platform-level role and scope requested. Approval targets, separation from gym-admin authority, audit trail, and recovery/security requirements are undecided.
8. **Trainer relationship types** — support and distinguish:
   - **Private Trainer:** trainer independently selected and hired by a member.
   - **Gym-Assigned Trainer:** trainer assigned to a member by the gym.
   - **Independent Trainer:** trainer registers on the platform independently rather than through a gym.

These are separate dimensions: “private” and “gym-assigned” describe how a trainer/member relationship starts; “independent” describes trainer onboarding/affiliation. One trainer may be independent and privately hired. The team must decide whether an independently registered trainer can also be assigned by a gym, and whether a private hire can involve a gym-affiliated trainer, before finalizing the data model.

## Feature contract and decision record

Copy this section for each feature before implementation. Keep the record in this document or link to a versioned design document from it.

### Feature: `<name>`

- **Status:** Proposed / Specifying / Contract agreed / In progress / Shipped
- **User problem and outcome:**
- **Roles and permissions:**
- **Mobile behavior:**
- **Web behavior:**
- **Backend behavior and source of truth:**
- **Data model changes:**
- **API contract:** method, path, request, response, errors, auth/role checks
- **Payments/media/privacy implications:**
- **Acceptance criteria:**
- **Migration and compatibility plan:**
- **Open decisions / decision owner / due date:**
- **Implementation references:** backend PR, web PR, mobile PR, release:

## Change coordination checklist

For any cross-project change:

1. Agree on behavior, roles, edge cases, and acceptance criteria.
2. Agree on database and API changes, including authorization, response envelopes, errors, and compatibility/migration needs.
3. Update this document and API client types/adapters for each affected client.
4. Implement backend rules first or in a coordinated sequence; clients must not simulate a backend decision.
5. Check mobile and web behavior against the same contract, including loading, empty, error, and unauthorized states.
6. Record shipped references and update status here.

## Source notes and confidence

This baseline was read from the local project source on 2026-10-26. It has not been validated against production or a running API in this review. The web README reports that its source was statically checked but no live API call was made when authored. Endpoint availability and response details should therefore be confirmed with the backend owner before a feature contract is finalized. The shared source of truth for any disputed behavior is the agreed API/data contract plus the current backend implementation, not an older guide or inferred UI behavior.
