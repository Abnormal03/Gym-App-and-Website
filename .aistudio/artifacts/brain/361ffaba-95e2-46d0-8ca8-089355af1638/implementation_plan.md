# Implementation Plan: Task A6 — Chat (REST API, Real-Time Socket.io & Push)

## 1. User Intent Analysis & Technical Strategy

### 1.1 Context & Objectives
- **Context**: The user is Dev A on the V2 backend track (`actors, check-in, money, chat`). Task A4 (Check-in, streaks, badges) and Task A5 (Provider sessions, earnings, payouts) have been completed, verified with automated test suites, and committed locally (`66bff7c`) to branch `v2Features`. The user elected to push commit `66bff7c` to GitHub from their local terminal and proceed here to **Task A6 (Chat)**.
- **Goal**: Implement the complete Task A6 Chat module strictly following the V2 specifications (`E-70` through `E-73`), the Prisma data model (`ChatThread`, `Message`), and real-time Socket.io guidelines.

### 1.2 Core Rules & Constraints
1. **Participant Scope**: Only the two participants of a `ChatThread` (`userId` and `providerId`) may access the thread. An outsider receives HTTP 403 `FORBIDDEN`.
2. **Writability Guard (`NOT_WRITABLE`)**:
   - Reading thread history is **always allowed** for both participants.
   - Sending new messages requires an active entitlement:
     - An `ACTIVE` `ProviderPackagePurchase` with `expiresAt > now` for this `(userId, providerId)` pair, **OR**
     - An `ACTIVE` `ConsultationAccess` with `expiresAt > now` for this pair.
   - If neither exists or access has expired: `POST /chats/:threadId/messages` is rejected with HTTP 403 and error code `NOT_WRITABLE`.
3. **Delivery Order**:
   - Phase 1: **REST API First** (thread list with unread counters, cursor pagination, message send, mark as read).
   - Phase 2: **Socket.io `/chat` Namespace** (JWT authentication handshake, room joining with membership check, broadcast `message:new` and `message:read`).
   - Phase 3: **Offline Notifications**: Trigger push notifications to the recipient's `fcmToken` if they are offline or not connected.

---

## 2. Architecture & Technical Specifications

### 2.1 Data Model Alignment (`schema.prisma`)
- **`ChatThread`**:
  - `id`: Int
  - `userId`: Int
  - `providerId`: Int
  - `createdAt`: DateTime (default: `now()`)
  - Relation: `@@unique([userId, providerId])`
- **`Message`**:
  - `id`: Int
  - `threadId`: Int
  - `senderUserId`: Int?
  - `senderProviderId`: Int?
  - `body`: String (1 to 2,000 characters)
  - `createdAt`: DateTime (UTC)
  - `readAt`: DateTime? (timestamp when recipient reads the message)
  - Relation: `@@index([threadId, createdAt])`

### 2.2 REST Endpoints Specification

| Method | Endpoint | Auth Roles | Description | Key Validations & Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/chats` | `MEMBER`, `TRAINER`, `PHYSIOTHERAPIST`, `NUTRITION_CONSULTANT` | List all threads for the caller | Includes counterparty name/photo/role, last message preview, unread count, and `writable` boolean flag. |
| `GET` | `/api/chats/:threadId/messages` | `MEMBER`, `TRAINER`, `PHYSIOTHERAPIST`, `NUTRITION_CONSULTANT` | Message history with cursor pagination | Checks participant membership (`FORBIDDEN` if not member/provider of thread). Supports `?before=<timestamp>&limit=20` (max 50). |
| `POST` | `/api/chats/:threadId/messages` | `MEMBER`, `TRAINER`, `PHYSIOTHERAPIST`, `NUTRITION_CONSULTANT` | Send a new message | Body 1–2000 chars. Verifies participant membership + `isThreadWritable` check. Returns created message; emits `message:new`. |
| `POST` | `/api/chats/:threadId/read` | `MEMBER`, `TRAINER`, `PHYSIOTHERAPIST`, `NUTRITION_CONSULTANT` | Mark thread messages as read | Sets `readAt = now()` on all unread messages sent by the counterparty in this thread. Returns count of read messages; emits `message:read`. |

### 2.3 Real-Time Architecture (Socket.io `/chat`)
- **Namespace**: `/chat`
- **Handshake Authentication**:
  - Validates `token` from `socket.handshake.auth.token` using `JWT_SECRET`.
  - Attaches `socket.auth` (`{ role, id, userId, providerId }`).
- **Room Management**:
  - Room name format: `thread:${threadId}`.
  - Event `thread:join`: Verifies caller is a participant of `threadId` before joining.
- **Broadcasting**:
  - On REST or socket message send: Emits `message:new` with the full message payload to `thread:${threadId}`.
  - On read receipts: Emits `message:read` with `{ threadId, readAt, readerId }` to `thread:${threadId}`.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Chat Business Logic & Service Layer
- **File**: `backend/services/chat.service.js`
- **Functions**:
  1. `isThreadWritable(userId, providerId)`: Queries `ProviderPackagePurchase` and `ConsultationAccess` for active, unexpired records.
  2. `listUserThreads(auth)`: Fetches threads for `auth.userId` or `auth.providerId`, computes unread counts, extracts latest message, evaluates `writable`.
  3. `getThreadMessages(auth, threadId, { before, limit })`: Verifies participant access, performs cursor pagination by `createdAt` / `id`.
  4. `sendMessage(auth, threadId, body)`: Enforces membership and `NOT_WRITABLE` check, creates `Message`, triggers Socket.io emission.
  5. `markThreadAsRead(auth, threadId)`: Updates unread counterparty messages to `readAt = now()`, emits `message:read`.

### Step 2: Controller & Express Routing
- **File**: `backend/controllers/chat.controller.js`
  - Maps Express requests to `chat.service.js` using `asyncHandler` and `{ data, error }` envelope.
- **File**: `backend/routes/chat.routes.js`
  - Mounts endpoints with `requireRole('MEMBER', 'TRAINER', 'PHYSIOTHERAPIST', 'NUTRITION_CONSULTANT')`.
- **File**: `backend/server.js`
  - Mounts `app.use('/api/chats', chatRoutes)`.

### Step 3: Real-Time Socket.io Server Setup
- **File**: `backend/socket/chatSocket.js`
  - Initializes `/chat` namespace on the HTTP server instance.
  - Enforces JWT handshake authentication.
  - Handles `thread:join` and broadcasts events.
- **Integration**:
  - Attach Socket.io to Express server in `backend/server.js`.

### Step 4: Frontend Dev Tracker Integration
- Update `src/App.tsx` with a live interactive chat testing interface:
  - Mock threads list with unread badges and `writable` indicators.
  - Real-time message log simulator to verify Socket.io and REST events.

---

## 4. Verification & Testing Strategy

### Automated Test Suite (`backend/scripts/a6/`)
Create `backend/scripts/a6/test-a6-chat.js` and runner `backend/scripts/run-a6.js` covering the exact criteria from the specification:
1. **Access Isolation**: User outside the thread receives HTTP 403 `FORBIDDEN`.
2. **Writability Guard**:
   - Active package purchase or consultation allows sending messages.
   - Expired package or consultation returns HTTP 403 with `NOT_WRITABLE`.
   - Read access remains available even when writing is expired.
3. **Cursor Pagination**: Fetching messages with `?limit=5` and `?before=` properly paginates older messages.
4. **Read Receipts & Unread Counters**:
   - Message sent by Member has `readAt = null`.
   - Provider calls `POST /chats/:id/read` $\to$ sets `readAt` and resets unread counter to 0.
5. **Socket Emission**: Verify that sending a message emits `message:new` to the thread room.

---

## 5. Risk Analysis & Mitigation
- **Risk: Disconnected Sockets on Server Restarts**: Socket clients should handle reconnection gracefully with automatic room re-join.
- **Risk: Concurrent Read Updates**: Updating `readAt` with `updateMany` where `readAt: null` is idempotent and safe under concurrent calls.
- **Risk: Large Message Payloads**: Enforce strict string length validation ($1 \le \text{length} \le 2000$).
