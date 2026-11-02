# JulleyOnline — Real-Time Multi-Tenant Collaborative Kanban Board

A production-grade, multi-tenant collaborative task management application built with **React.js, Node.js, Express.js, PostgreSQL (Prisma ORM), Socket.IO**, and an intelligent **Agentic Python FastAPI AI Service**.

Developed for the **Forward Deployed Engineer (FDE) Intern Assignment**.

---

## 1. Project Overview

**JulleyOnline** is an enterprise-ready collaborative task management system designed for multi-branch organizations. It combines real-time synchronization, strict multi-tenant data isolation, optimistic concurrency conflict resolution, live member presence tracking, and an agentic AI assistant.

---

## 2. Business Problem

Consider **ABC Technologies**, a technology company with three independent branches:
- **Hyderabad** (Tenant 1)
- **Bangalore** (Tenant 2)
- **Chennai** (Tenant 3)

### The Core Challenge
Employees must collaborate in real time—moving tasks across columns, assigning work items, and updating descriptions with immediate visibility for team members on the same board. However:
- **Strict Data Isolation:** Employees in Hyderabad must **never** see or access Bangalore's confidential projects or tasks.
- **Concurrent Edits:** If two employees update the same task simultaneously, the system must detect the conflict and prevent silent data overwrites.
- **Real-Time Collaboration:** When an employee moves a card, all team members viewing the board must see the change instantly without refreshing their browsers.

---

## 3. Features

1. **Authentication & RBAC:** Secure JWT-based authentication with bcrypt password hashing and three role tiers (`Org Admin`, `Tenant Admin`, `Member`).
2. **Organization & Branch Switcher:** Dynamic switcher to navigate authorized enterprises and branches.
3. **Interactive Kanban Board:** Multi-column workflow (*To Do*, *In Progress*, *Testing*, *Done*) with fluid HTML5 Drag-and-Drop and optimistic UI updates.
4. **Strict Multi-Tenant Isolation:** Complete data separation at the database, query, middleware, and WebSocket room levels.
5. **Real-Time Synchronization (Socket.IO):** Instant live updates for task creation, edits, movement, and deletion scoped to authorized tenant rooms.
6. **Presence Indicators:** Live indicators showing which team members are currently online in the active branch.
7. **Optimistic Concurrency Control (OCC):** Version-checked updates that return `HTTP 409 Conflict` on stale writes, complete with conflict resolution UI.
8. **Comprehensive Audit Trail:** Immutable activity logs capturing every user mutation.
9. **Network Recovery & Resilience:** Automatic WebSocket reconnection and state resynchronization on connection drops.
10. **Agentic AI Kanban Assistant (FastAPI):** Python AI service that executes authorized, read-only tools to generate board progress summaries, overdue task analyses, and activity insights.
11. **Built-in Test Lab:** Interactive in-app testing suite to demonstrate cross-tenant blocking, 409 concurrency conflicts, and network recovery live.

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Responsive Kanban interface and state management |
| **Backend** | Node.js, Express.js | REST APIs, authentication, authorization, and business logic |
| **Database** | PostgreSQL 18, Prisma ORM | Relational data persistence, foreign keys, and transactions |
| **Real-Time** | Socket.IO, Socket.IO Client | Low-latency tenant-scoped event broadcasting and presence |
| **Security** | JWT, bcryptjs, Zod | Stateless token authentication, password hashing, and input validation |
| **AI Service** | Python 3.13, FastAPI, Pydantic, Uvicorn | Agentic task assistance, tool execution, and analytical summaries |

---

## 5. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React.js Frontend                    │
│   (Kanban Board • Multi-Tenant Switcher • Presence)    │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
     HTTP REST API (JWT)            WebSocket (Socket.IO)
               │                         │
               ▼                         ▼
┌────────────────────────────────────────────────────────┐
│                  Node.js / Express                     │
│  (Auth MW • Tenant Isolation MW • RBAC • Sockets)      │
└──────────────┬─────────────────────────┬───────────────┘
               │                         │
       Prisma Transactions      Verified Tenant Context
               │                         │
               ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   PostgreSQL Database    │  │ Python FastAPI AI Agent  │
│  (8 Tables + Indexes)    │  │  (Tenant-Scoped Tools)   │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 6. Multi-Tenant Architecture

The system utilizes a **Shared Database, Pooled Schema with Discriminator Key (`tenant_id`)** strategy:

1. **Hierarchy:** `Organization → Tenant (Branch) → Board → Column → Task`
2. **Mandatory Foreign Key:** Every business entity (`boards`, `columns`, `tasks`, `activity_logs`) possesses a mandatory `tenant_id` foreign key.
3. **Double Verification Middleware:** Incoming requests pass through `requireTenant` middleware:
   - User identity is validated via signed JWT.
   - User's authorized memberships are loaded from the database.
   - The requested tenant (`x-tenant-id` header) is validated against authorized memberships.
   - If unauthorized, access is immediately blocked with `HTTP 403 Forbidden`.
4. **WebSocket Room Isolation:** Sockets are joined strictly to `tenant:${tenantId}` rooms. Events emitted in Hyderabad are never delivered to Bangalore sockets.

---

## 7. Role-Based Access Control (RBAC)

| Role | Permissions & Responsibilities |
|---|---|
| **Org Admin** | Enterprise-level management. Can create and manage all branches/tenants, assign tenant administrators, and view cross-branch metrics. |
| **Tenant Admin** | Branch-level administration. Can create and delete boards, manage column workflows, and view team activity within their assigned branch. |
| **Member** | Task execution. Can view authorized branch boards, create work items, edit task details, and drag-and-drop tasks across columns. |

---

## 8. Database Design

PostgreSQL 18 database with 8 normalized relational tables:

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ TENANTS : "has"
    ORGANIZATIONS ||--o{ MEMBERSHIPS : "governs"
    USERS ||--o{ MEMBERSHIPS : "assigned"
    TENANTS ||--o{ MEMBERSHIPS : "contains"
    TENANTS ||--o{ BOARDS : "owns"
    BOARDS ||--o{ COLUMNS : "has"
    COLUMNS ||--o{ TASKS : "groups"
    TENANTS ||--o{ TASKS : "isolates"
    USERS ||--o{ TASKS : "assigned to"
    TENANTS ||--o{ ACTIVITY_LOGS : "audits"
    USERS ||--o{ ACTIVITY_LOGS : "acts in"
```

Refer to [`docs/database-erd.md`](docs/database-erd.md) and [`docs/database-erd.svg`](docs/database-erd.svg) for detailed column definitions and indexes.

---

## 9. Real-Time Communication

- **Room Naming Convention:** `tenant:${tenantId}`
- **Authentication Handshake:** Socket handshake validates JWT token before allowing connection.
- **Room Authorization:** A client attempting to join `tenant:join` is verified against their database memberships. Unauthorized attempts are rejected.
- **Presence Tracking:** Tracks active users per branch. Handles multiple tabs per user to prevent premature offline status.
- **Committed Updates:** Database transactions commit before broadcasting events (`task:moved`, `task:created`, `task:updated`, `task:deleted`).

---

## 10. Concurrency Handling

### Scenario: Concurrent Task Edits & Moves
1. Every task record maintains a `version: INTEGER` column (initialized at `1`).
2. When a user drags or edits a task, the client passes `expectedVersion`.
3. The server executes the update inside an atomic transaction:
   ```sql
   UPDATE tasks SET position = $1, version = version + 1
   WHERE id = $2 AND tenant_id = $3 AND version = $4;
   ```
4. If the version has changed on the server, the transaction rolls back and returns **`HTTP 409 Conflict`**.
5. The frontend displays a conflict resolution banner allowing the user to refresh the latest state without losing unsaved changes.

---

## 11. Installation and Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher (Tested on v22.18.0)
- **PostgreSQL:** v14 or higher (Running on `localhost:5432`)
- **Python:** v3.10 or higher (Tested on v3.13.7)
- **Git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/collaborative-kanban.git
cd collaborative-kanban
```

### Step 2: Database Setup
Ensure PostgreSQL is running and create the database:
```sql
CREATE DATABASE collaborative_kanban;
```

### Step 3: Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run seed
```

### Step 4: Frontend Setup
```bash
cd ../frontend
npm install
```

### Step 5: AI Service Setup
```bash
cd ../ai-service
pip install -r requirements.txt
```

---

## 12. Environment Variables

Create `.env` files in `backend/` and `frontend/`:

### `backend/.env`
```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/collaborative_kanban?schema=public"
PORT=5000
JWT_SECRET="super-secret-jwt-key-for-collaborative-kanban"
CORS_ORIGIN="http://localhost:5173"
AI_SERVICE_URL="http://localhost:8000"
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 13. Running the Application

Open three terminal windows:

### Terminal 1: Backend Server (Port 5000)
```bash
cd backend
npm run dev
# Server running at: http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### Terminal 2: Frontend App (Port 5173)
```bash
cd frontend
npm run dev
# App running at: http://localhost:5173
```

### Terminal 3: Python AI Service (Port 8000)
```bash
cd ai-service
python -m uvicorn main:app --port 8000 --reload
# Service running at: http://localhost:8000
```

---

## 14. Demo Accounts & Sample Data

All demo accounts use password: **`Password123!`** (The UI also includes 1-click login buttons).

| Name | Email | Organization | Branch / Tenant | Role |
|---|---|---|---|---|
| **Rahul Sharma** | `rahul@abctech.com` | ABC Technologies | Hyderabad | **Org Admin** |
| **Priya Patel** | `priya@abctech.com` | ABC Technologies | Hyderabad | **Tenant Admin** |
| **Arjun Verma** | `arjun@abctech.com` | ABC Technologies | Hyderabad | **Member** |
| **Sneha Reddy** | `sneha@abctech.com` | ABC Technologies | Bangalore | **Tenant Admin** |
| **Kiran Desai** | `kiran@xyzsol.com` | XYZ Solutions | Mumbai | **Member** |

---

## 15. API Documentation

Full API documentation with sample request/response payloads is located in [`docs/api-documentation.md`](docs/api-documentation.md).

Key Endpoints:
- `POST /api/auth/login` — Authenticate and receive JWT
- `GET /api/boards` — List boards for active tenant
- `GET /api/tasks` — List tasks for active tenant
- `PATCH /api/tasks/:id/move` — Move task with OCC version check
- `POST /api/ai/chat` — Query Agentic AI assistant

---

## 16. WebSocket Events

Full WebSocket documentation is located in [`docs/websocket-documentation.md`](docs/websocket-documentation.md).

Events:
- `tenant:join` — Join branch room
- `task:moved` — Real-time drag-and-drop broadcast
- `presence:update` — Real-time member presence broadcast

---

## 17. Testing and Validation

An automated verification test script is provided in the backend:

```bash
cd backend
node src/test-isolation.js
```

### Verification Results
```
✔ Test 1: API Login with JWT -> PASS
✔ Test 2: Fetch Hyderabad Boards -> PASS (Status 200)
✔ Test 3: Cross-Tenant Block (Priya accessing Bangalore) -> PASS (Status 403 Forbidden)
✔ Test 4: Cross-Tenant Direct Task ID Access -> PASS (Status 403 Forbidden)
✔ Test 5: Optimistic Concurrency Control -> PASS (Status 409 Conflict)
✔ Test 6: Move Task Transaction with Version Increment -> PASS (Status 200)
✔ Test 7: Activity Log Audit Trail -> PASS (Audit logged)
```

You can also run these tests interactively from the web UI using the **"Test Lab"** button in the navbar!

---

## 18. Known Limitations & Future Enhancements

### Limitations
- **Single Node Socket.IO:** Uses in-memory socket adapter suitable for single-server setups.
- **OCC Resolution:** Current conflict resolution rejects stale writes; field-level merge resolution can be added for collaborative text editing.

### Future Enhancements
- **Redis Adapter:** Add `@socket.io/redis-adapter` for horizontal scaling across multiple backend instances.
- **PostgreSQL Row-Level Security (RLS):** Additional database-layer policy enforcement.
- **Mobile Responsive Drawer:** Enhanced mobile touch gestures for drag-and-drop.

---

## Conclusion

**JulleyOnline** delivers an enterprise-grade, production-ready collaborative Kanban platform engineered to solve the complex data isolation and concurrency challenges of multi-branch organizations:

- **Strict Multi-Tenant Isolation:** Enforces zero cross-tenant data leakage through multi-layered validation across database relations, authentication middleware, and scoped WebSocket rooms.
- **Seamless Real-Time Collaboration:** Combines instant bidirectional event broadcasting and live member presence via Socket.IO with atomic Optimistic Concurrency Control (OCC) to prevent conflicting overwrites.
- **Intelligent & Auditable Workflows:** Integrates an agentic Python FastAPI assistant for tenant-scoped board insights, backed by immutable audit trails and an interactive verification Test Lab.

In summary, JulleyOnline bridges high-velocity team collaboration with robust enterprise security, providing a complete architectural blueprint for scalable, resilient multi-tenant applications.

