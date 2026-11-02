# JulleyOnline — API Reference Documentation

## Base URL
- Local: `http://localhost:5000/api`

## Authentication & Headers
All protected endpoints require a valid JWT token passed in the `Authorization` header and the active branch tenant ID passed in the `x-tenant-id` header:

```http
Authorization: Bearer <jwt_access_token>
x-tenant-id: <active_tenant_uuid>
Content-Type: application/json
```

---

## 1. Authentication APIs

### Register New User
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@abctech.com",
    "password": "Password123!",
    "organizationId": "ORG_UUID",
    "tenantId": "TENANT_UUID",
    "role": "Member"
  }
  ```
- **Responses:**
  - `201 Created`: User registered with JWT token.
  - `400 Bad Request`: Email already exists or validation error.

### User Login
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "rahul@abctech.com",
    "password": "Password123!"
  }
  ```
- **Responses:**
  - `200 OK`: Returns JWT token, user profile, and list of authorized memberships.
  - `401 Unauthorized`: Invalid credentials.

### Get Current User Profile
- **Method:** `GET`
- **Endpoint:** `/auth/me`
- **Auth:** Required (`Bearer <token>`)
- **Responses:**
  - `200 OK`: Returns user profile, organizations, and branch permissions.

---

## 2. Organization APIs

### List Organizations
- **Method:** `GET`
- **Endpoint:** `/organizations`
- **Auth:** Required
- **Description:** Returns organizations the authenticated user belongs to.

### Create Organization
- **Method:** `POST`
- **Endpoint:** `/organizations`
- **Auth:** Required
- **Request Body:**
  ```json
  { "name": "ABC Technologies" }
  ```
- **Responses:**
  - `201 Created`: Organization created; creator assigned `Org Admin`.

---

## 3. Tenant / Branch APIs

### List Authorized Tenants
- **Method:** `GET`
- **Endpoint:** `/tenants?organizationId=<optional_org_id>`
- **Auth:** Required
- **Description:** Returns branches the user has permission to access.

### Create Branch Tenant
- **Method:** `POST`
- **Endpoint:** `/tenants`
- **Auth:** Required (`Org Admin` role required)
- **Request Body:**
  ```json
  {
    "organizationId": "ORG_UUID",
    "name": "Chennai"
  }
  ```
- **Responses:**
  - `201 Created`: Tenant created.
  - `403 Forbidden`: Non-admin users rejected.

### List Branch Members
- **Method:** `GET`
- **Endpoint:** `/tenants/:id/users`
- **Auth:** Required (Must be member of tenant or parent Org Admin)
- **Responses:**
  - `200 OK`: Returns users belonging to the branch for task assignment.
  - `403 Forbidden`: Cross-tenant user enumeration blocked.

---

## 4. Board APIs

### List Boards
- **Method:** `GET`
- **Endpoint:** `/boards`
- **Headers:** `x-tenant-id: <uuid>`
- **Responses:**
  - `200 OK`: Returns boards strictly belonging to the active tenant.

### Get Board Details with Columns & Tasks
- **Method:** `GET`
- **Endpoint:** `/boards/:id`
- **Headers:** `x-tenant-id: <uuid>`
- **Responses:**
  - `200 OK`: Board with nested columns and tasks.
  - `404 Not Found`: Board does not exist or belongs to another isolated tenant.

### Create Board
- **Method:** `POST`
- **Endpoint:** `/boards`
- **Headers:** `x-tenant-id: <uuid>`
- **Role:** `Org Admin` or `Tenant Admin`
- **Request Body:**
  ```json
  {
    "name": "Website Development",
    "description": "Customer portal development"
  }
  ```
- **Responses:**
  - `201 Created`: Board created along with 4 default columns (*To Do*, *In Progress*, *Testing*, *Done*).

---

## 5. Task APIs (Concurrency & Ordering)

### List Tasks
- **Method:** `GET`
- **Endpoint:** `/tasks?boardId=<uuid>&columnId=<uuid>`
- **Headers:** `x-tenant-id: <uuid>`

### Get Task Details
- **Method:** `GET`
- **Endpoint:** `/tasks/:id`
- **Headers:** `x-tenant-id: <uuid>`
- **Responses:**
  - `200 OK`: Task details.
  - `403 Forbidden`: Attempting to query an isolated foreign branch task.

### Create Task
- **Method:** `POST`
- **Endpoint:** `/tasks`
- **Headers:** `x-tenant-id: <uuid>`
- **Request Body:**
  ```json
  {
    "boardId": "BOARD_UUID",
    "columnId": "COLUMN_UUID",
    "title": "Design Login Page",
    "description": "Create Figma wireframes",
    "priority": "High",
    "assignedTo": "USER_UUID",
    "dueDate": "2026-11-08T00:00:00Z"
  }
  ```
- **Responses:**
  - `201 Created`: Task created with version `1`. Emits `task:created` via Socket.IO.

### Update Task (with Optimistic Locking)
- **Method:** `PUT`
- **Endpoint:** `/tasks/:id`
- **Headers:** `x-tenant-id: <uuid>`
- **Request Body:**
  ```json
  {
    "title": "Updated Title",
    "description": "Updated details",
    "priority": "Urgent",
    "expectedVersion": 1
  }
  ```
- **Responses:**
  - `200 OK`: Task updated, version incremented to `2`. Emits `task:updated`.
  - `409 Conflict`: `expectedVersion` does not match current server version. Payload includes latest server task to resolve conflict.

### Move Task (Drag-and-Drop Reordering)
- **Method:** `PATCH`
- **Endpoint:** `/tasks/:id/move`
- **Headers:** `x-tenant-id: <uuid>`
- **Request Body:**
  ```json
  {
    "destinationColumnId": "COLUMN_UUID",
    "newPosition": 0,
    "expectedVersion": 1
  }
  ```
- **Responses:**
  - `200 OK`: Executed in atomic database transaction: updates column, shifts positions of affected sibling tasks, increments version. Emits `task:moved` to tenant room.
  - `409 Conflict`: Stale drag-and-drop move rejected.

### Delete Task
- **Method:** `DELETE`
- **Endpoint:** `/tasks/:id`
- **Headers:** `x-tenant-id: <uuid>`
- **Responses:**
  - `200 OK`: Task removed, sibling positions closed, emits `task:deleted`.

---

## 6. AI Assistant API (Agentic Python Service)

### Chat with Kanban Assistant
- **Method:** `POST`
- **Endpoint:** `/ai/chat`
- **Headers:** `x-tenant-id: <uuid>`
- **Request Body:**
  ```json
  {
    "message": "Summarize the Hyderabad board progress",
    "boardId": "OPTIONAL_BOARD_UUID"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "source": "Python FastAPI Agent Service",
        "tools_used": ["get_board_summary"],
        "reasoning": ["User asked for general overview..."],
        "response": "📊 Executive Summary for Hyderabad Branch..."
      }
    }
    ```
