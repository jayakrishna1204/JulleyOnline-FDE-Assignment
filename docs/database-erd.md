# JulleyOnline — Multi-Tenant Database ER Diagram

## Overview
This document presents the complete Entity-Relationship Diagram for the multi-tenant real-time collaborative Kanban system. The data model enforces strict data isolation at the branch/tenant level, role-based access control, and optimistic concurrency locking.

![Database ERD](./database-erd.svg)

---

## Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ TENANTS : "has branches"
    ORGANIZATIONS ||--o{ MEMBERSHIPS : "manages"
    USERS ||--o{ MEMBERSHIPS : "belongs to"
    TENANTS ||--o{ MEMBERSHIPS : "assigns role in"
    TENANTS ||--o{ BOARDS : "owns"
    BOARDS ||--o{ COLUMNS : "contains"
    COLUMNS ||--o{ TASKS : "groups"
    TENANTS ||--o{ TASKS : "isolates"
    USERS ||--o{ TASKS : "assigned to"
    TENANTS ||--o{ ACTIVITY_LOGS : "audits"
    USERS ||--o{ ACTIVITY_LOGS : "performed by"

    ORGANIZATIONS {
        UUID id PK
        VARCHAR name
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    TENANTS {
        UUID id PK
        UUID organization_id FK
        VARCHAR name
        TIMESTAMP created_at
    }

    USERS {
        UUID id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password_hash
        TIMESTAMP created_at
    }

    MEMBERSHIPS {
        UUID id PK
        UUID user_id FK
        UUID organization_id FK
        UUID tenant_id FK "nullable for org-level"
        VARCHAR role "'Org Admin' | 'Tenant Admin' | 'Member'"
        TIMESTAMP created_at
    }

    BOARDS {
        UUID id PK
        UUID organization_id FK
        UUID tenant_id FK "strict tenant scoping"
        VARCHAR name
        TEXT description
        UUID created_by FK
        TIMESTAMP created_at
    }

    COLUMNS {
        UUID id PK
        UUID board_id FK
        UUID tenant_id FK "strict tenant scoping"
        VARCHAR name
        INTEGER position
    }

    TASKS {
        UUID id PK
        UUID board_id FK
        UUID column_id FK
        UUID tenant_id FK "strict tenant scoping"
        VARCHAR title
        TEXT description
        UUID assigned_to FK
        VARCHAR priority
        TIMESTAMP due_date
        INTEGER position
        INTEGER version "Optimistic Concurrency Control"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ACTIVITY_LOGS {
        UUID id PK
        UUID tenant_id FK "strict tenant scoping"
        UUID user_id FK
        VARCHAR entity_type
        UUID entity_id
        VARCHAR action
        JSONB details
        TIMESTAMP created_at
    }
```

---

## The 8 Core Tables

### 1. `organizations`
Stores top-level enterprise companies (e.g., *ABC Technologies*, *XYZ Solutions*).

### 2. `tenants`
Stores independent branches/workspaces belonging to an organization (e.g., *Hyderabad*, *Bangalore*, *Chennai*, *Mumbai*, *Pune*).

### 3. `users`
Stores registered employees and credentials. Passwords are encrypted with bcrypt (10 rounds). Plain text passwords are never stored.

### 4. `memberships`
Establishes user permissions across organizations and tenants. Enforces RBAC with three levels:
- **Org Admin**: Full control over organization, branches, and tenant assignments.
- **Tenant Admin**: Manage boards, columns, and team members within their specific branch.
- **Member**: Create, edit, and move tasks within authorized boards.

### 5. `boards`
Stores project Kanban workspaces. Foreign key `tenant_id` guarantees isolation.

### 6. `columns`
Stores task status stages (*To Do*, *In Progress*, *Testing*, *Done*). Ordering maintained by `position`.

### 7. `tasks`
Stores work items with:
- `tenant_id`: Mandatory tenant isolation key.
- `version`: Integer incremented on every move or edit. Enables Optimistic Concurrency Control (OCC) and prevents silent overwrite conflicts (HTTP 409).
- `position`: Server-authoritative ordering index.

### 8. `activity_logs`
Historical audit trail of all mutations (`Created`, `Updated`, `Moved`, `Deleted`). Includes actor `user_id`, timestamp, and metadata payload in JSONB.
