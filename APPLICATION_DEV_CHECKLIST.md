## Mobile delivery before backend completion: demo to integration

Mobile UI work can proceed while backend work is in progress. Keep demo data behind the service/data boundary so screens can later use the real API without being rewritten. A demo proves layout and navigation; it does not prove authentication, authorization, persistence, payment, booking availability, or backend behavior.

### Phase A — Agree the slice

- [ ] Choose one screen or end-to-end user slice and state what the demo should show.
- [ ] Read this document and inspect the current app service/types and the expanded backend routes for that slice.
- [ ] Mark each dependency as **existing and verified in source**, **contract agreed but backend pending**, or **undecided**.
- [ ] For new roadmap behavior, complete its feature decision record before implementing dependent behavior. Do not turn undecided rules into mock assumptions.
- [ ] Agree on the data shape the screen consumes. Reuse the current app type/API shape where it exists; document any proposed new shape before using it as an integration contract.

### Current Phase A record — V3 home and navigation

- [x] Slice selected from the supplied screenshots: gym home screen, bottom tabs, and member drawer. Booking flow is a later slice.
- [x] Reviewed the current app routes/components and the expanded backend's gym list/search contract.
- [x] Dependency status: gym list/search and near-me behavior already exist in app/backend source; no API or database change is planned for the visual refresh. The gym list does not supply packages/monthly price.
- [x] Screen data uses the existing `User` and `Gym` types. The screenshot's price is omitted unless monthly package data is already available; no extra per-gym request is added.
- [x] UI-only working assumptions: Feed opens a clearly labeled “Coming soon” state; 24/7 is represented by gym hours `00:00`–`23:59` because the current backend rejects equal opening/closing times. These can be revised during review.
- [ ] Product owner reviews the home and navigation demo before moving to the booking-flow slice.

See the **V3 mobile UI refresh: home and member navigation** record in `PROJECT_SOURCE_OF_TRUTH.md` for acceptance criteria and integration details.

### Phase B — Build a clearly isolated demo

- [ ] Implement the screen, navigation, reusable components, and responsive states independently from backend availability.
- [ ] Keep data access in a service/repository or hook boundary. Screens should not contain inline fixture records or call the backend directly.
- [ ] Provide deterministic fixture data through a demo implementation of that boundary. Shape fixtures like the agreed app model/API response, and label demo-only accounts/data in the UI where a viewer could mistake them for real records.
- [ ] Keep demo mode opt-in and visibly separate from live mode. Never silently fall back to demo data after a live request fails.
- [ ] Do not fake successful login, payment, booking confirmation, check-in, upload, or other server-owned mutations as if they were real. In demo mode, label simulated outcomes; in live mode, show pending/error states until the server confirms them.
- [ ] Build loading, empty, recoverable error, and unavailable/offline states while using fixtures so they are ready for real responses.
- [ ] Confirm the demo with the product owner/stakeholders and record accepted UI behavior and remaining decisions.

### Phase C — Lock the backend contract

- [ ] Backend owner confirms the endpoint, HTTP method, auth role, resource ownership rule, request fields, response envelope, error codes/statuses, pagination/filtering, and relevant state transitions.
- [ ] Confirm whether the endpoint already exists in `~/projects/gym-backend`; do not rely on the old backend snapshot or a guide alone.
- [ ] Agree any database or business-rule changes with the backend and web owners. Update this document's feature/API record before depending on a new contract.
- [ ] Confirm environment and deployment details: API origin, `/api` prefix, CORS origin, and whether the endpoint is available in the target environment.
- [ ] For media, payment, booking, or personal data, agree upload/payment ownership, verification, privacy/access rules, and failure/cancellation behavior before live wiring.

### Phase D — Connect the app

- [ ] Implement or update the typed app service method; preserve the backend's actual request/response envelope and normalize it at the service boundary if needed.
- [ ] Wire the screen to live services. Select demo or live data explicitly; do not mix fixture and server records in one session.
- [ ] Attach the stored Bearer token through the shared API client and handle expired sessions consistently with the auth store.
- [ ] Map expected backend errors to useful UI messages while retaining retry/recovery paths. Never treat a redirect, optimistic UI update, or client-side validation as server confirmation.
- [ ] Verify success and failure paths against the agreed backend environment, including loading/empty states, invalid input, authorization failure, network loss, duplicate submit, and stale data where relevant.
- [ ] For checkout/payment, follow the existing server-owned checkout and verification flow. A Chapa return URL alone is not proof of payment.
- [ ] Remove or disable demo mode in the release configuration, or gate it so production users cannot enter demo behavior accidentally.

### Phase E — Handoff and release

- [ ] Update this source of truth with final API/data contract, known limitations, decision status, and implementation references.
- [ ] Confirm backend, web, and mobile owners agree on the shipped behavior and shared contract.
- [ ] Report what was verified against fixtures versus a running backend. Do not describe a fixture-only demo as an integrated feature.

### Demo-to-live status for a feature

Track these separately: **UI demo** (screens and fixture flow), **API contract agreed**, **backend implemented**, **mobile integration verified**, and **release ready**. A check in one stage does not imply later stages are complete.
