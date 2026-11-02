# JulleyOnline — Real-Time WebSocket Documentation (Socket.IO)

## 1. Connection Architecture

Socket.IO provides persistent, low-latency, bidirectional communication between clients and the Node.js backend. Every connected client is strictly partitioned into tenant-scoped rooms to enforce data isolation in real time.

```
React Client A (Hyderabad) ───\
                               ───> Socket Room: [tenant:HYDERABAD_UUID] (Live Events)
React Client B (Hyderabad) ───/

React Client C (Bangalore)  ──────> Socket Room: [tenant:BANGALORE_UUID] (Isolated)
```

---

## 2. Authentication Handshake

Clients must provide their JWT token in `auth.token` during the initial Socket.IO connection:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('token')
  },
  transports: ['websocket', 'polling']
});
```

### Handshake Verification
1. Server verifies JWT signature and expiration.
2. Server loads the user and their authorized memberships from PostgreSQL.
3. If token is missing, expired, or invalid, connection is rejected with `Authentication error`.

---

## 3. Tenant Room Authorization

A client **cannot** arbitrarily join any room. When a client requests to join a branch:

```javascript
socket.emit('tenant:join', { tenantId: 'HYDERABAD_TENANT_UUID' }, (response) => {
  console.log(response); // { success: true, message: 'Joined tenant room...' }
});
```

### Backend Enforcement
1. The server checks the authenticated user's memberships.
2. If the user does not have membership in `tenantId` (or is not an authorized `Org Admin`), room entry is **denied**.
3. If authorized, socket joins room `tenant:${tenantId}`.
4. Server updates online presence for that tenant.

---

## 4. Real-Time Events Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `tenant:join` | Client → Server | `{ tenantId: string }` | Join authorized tenant room |
| `tenant:leave` | Client → Server | `{ tenantId: string }` | Leave tenant room |
| `task:created` | Server → Client | `{ task: TaskObject }` | Broadcast when new task is created |
| `task:updated` | Server → Client | `{ task: TaskObject }` | Broadcast when task details are edited |
| `task:moved` | Server → Client | `{ taskId, sourceColumnId, destinationColumnId, oldPosition, newPosition, task }` | Broadcast when task is dragged or reordered |
| `task:deleted` | Server → Client | `{ taskId, columnId, position }` | Broadcast when task is deleted |
| `presence:update` | Server → Client | `{ tenantId, onlineUsers: User[], count: number }` | Real-time presence update of active branch members |
| `board:updated` | Server → Client | `{ action, board, boardId }` | Broadcast when board is created, updated, or deleted |

---

## 5. Sample Event Payloads

### `task:moved`
```json
{
  "taskId": "7e4bfa38-2391-4e4f-b883-9b88cf2436d1",
  "sourceColumnId": "c138d72e-...",
  "destinationColumnId": "d549fa1b-...",
  "oldPosition": 0,
  "newPosition": 1,
  "task": {
    "id": "7e4bfa38-2391-4e4f-b883-9b88cf2436d1",
    "title": "Design Login Page",
    "columnId": "d549fa1b-...",
    "position": 1,
    "version": 2,
    "priority": "High",
    "assignee": {
      "id": "...",
      "name": "Rahul Sharma"
    }
  }
}
```

### `presence:update`
```json
{
  "tenantId": "05f2e736-b905-4d2e-86bc-1f19e9e3eeaf",
  "count": 2,
  "onlineUsers": [
    { "id": "user_1", "name": "Rahul Sharma", "email": "rahul@abctech.com" },
    { "id": "user_2", "name": "Priya Patel", "email": "priya@abctech.com" }
  ]
}
```

---

## 6. Presence Tracking & Connection Resiliency

### Multi-Tab Tracking
The backend presence tracker maintains connection references per user ID:
- If a user opens 3 browser tabs in the same branch, their presence counter is `3`.
- Closing 1 tab decrements the counter to `2`. They remain displayed as Online.
- Only when all tabs disconnect is the user broadcast as Offline.

### Network Disconnection & Recovery
If a user loses internet connectivity or their connection drops:
1. Socket enters `reconnecting` status.
2. Frontend displays visual banner with offline indicator.
3. Upon reconnection (`reconnect` event), client automatically rejoins the authorized tenant room.
4. Client executes background resynchronization with `GET /api/boards/:id` to reconcile any mutations that occurred while offline.
