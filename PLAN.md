# 🏗️ Newtonite Software Engineering Challenge — Project Plan

> **Goal:** Build an internal web application that allows teams to coordinate and manage operational work reliably, replacing ad-hoc chat/email/spreadsheet workflows.

---

## 📋 Challenge Summary

A rapidly growing company (~hundreds of employees → thousands) needs a system to:
- Create & manage **operational work items** (customer issues, incidents, compliance requests, approvals, etc.)
- Track **ownership, state, priority, and history** of every item
- Support **multi-team collaboration** with proper authorization
- Handle **concurrent usage** gracefully (optimistic locking, conflict resolution)
- Provide a **usable overview/dashboard** with search & filtering
- Scale to **tens of thousands of active items** and **hundreds of simultaneous users**

### Key Evaluation Criteria
- Data modelling & API design
- Frontend state management
- Authorization (server-enforced, not UI-only)
- Concurrent operations & data consistency
- Error handling, search/filtering, performance, maintainability
- **At least 3 non-trivial correctness scenarios** beyond simple CRUD

---

## 🛠️ Technology Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + Vite | Fast dev cycle, rich ecosystem, excellent state management options |
| **State Mgmt** | React Query (TanStack Query) + Context | Server-state caching, optimistic updates, auto-refetch for stale data |
| **Styling** | Vanilla CSS (CSS Modules) | Full control, no framework overhead, premium look |
| **Backend** | Node.js + Express | JS full-stack consistency, fast iteration, excellent middleware ecosystem |
| **Database** | PostgreSQL | ACID transactions, robust concurrency (row-level locking), JSON support, full-text search |
| **ORM** | Prisma | Type-safe queries, migrations, great DX |
| **Auth** | JWT + bcrypt | Stateless auth, simple to implement, server-enforced RBAC |
| **Real-time** | WebSockets (Socket.io) | Live updates for concurrent editing awareness |
| **Queue** | Bull (Redis-backed) | Async processing (notifications, enrichment) with retry & failure handling |
| **Testing** | Jest + Supertest (backend), Vitest + RTL (frontend) | Standard, well-supported |

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)           │
│  Dashboard │ Work Items │ Teams │ Admin │ History    │
└────────────────────┬────────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────▼────────────────────────────────┐
│              Backend (Express + Node.js)             │
│  Auth Middleware │ RBAC │ Validation │ Controllers   │
│  Optimistic Locking │ Idempotency │ Event Emitter   │
└───────┬──────────────────────┬──────────────────────┘
        │                      │
   ┌────▼─────┐          ┌─────▼──────┐
   │ Postgres │          │   Redis    │
   │  (Data)  │          │ (Queue +   │
   │          │          │  Sessions) │
   └──────────┘          └────────────┘
```

---

## 🗃️ Data Model (Core Entities)

### Users
- `id`, `email`, `name`, `password_hash`, `created_at`, `updated_at`

### Teams
- `id`, `name`, `description`, `created_at`

### TeamMemberships
- `user_id`, `team_id`, `role` (ADMIN | MEMBER | VIEWER), `joined_at`

### WorkItems
- `id`, `title`, `description`, `status` (OPEN | IN_PROGRESS | AWAITING_APPROVAL | RESOLVED | CLOSED)
- `priority` (CRITICAL | HIGH | MEDIUM | LOW)
- `category` (CUSTOMER_ISSUE | INCIDENT | COMPLIANCE | PAYMENT | OPERATIONAL | OTHER)
- `assignee_id`, `reporter_id`, `team_id`
- `version` (for optimistic locking)
- `due_date`, `created_at`, `updated_at`

### WorkItemHistory (Audit Log)
- `id`, `work_item_id`, `user_id`, `action`, `field_changed`, `old_value`, `new_value`, `timestamp`

### Comments
- `id`, `work_item_id`, `user_id`, `content`, `created_at`, `updated_at`

### Approvals
- `id`, `work_item_id`, `requested_by`, `approved_by`, `status` (PENDING | APPROVED | REJECTED), `created_at`, `resolved_at`

---

## 🔒 Authorization Model (RBAC)

| Role | Permissions |
|------|------------|
| **ADMIN** | Full CRUD on work items in their team, manage team members, approve/reject, reassign |
| **MEMBER** | Create work items, edit own or assigned items, comment, request approval |
| **VIEWER** | Read-only access to team's work items and history |

- Authorization is **enforced server-side** on every API endpoint via middleware
- Resource-level checks: users can only modify items belonging to their team(s)

---

## ⚡ Critical Correctness Scenarios (3+ Required)

### 1. Optimistic Concurrency Control (Stale Updates)
- Every work item has a `version` field
- Updates require sending the current `version`; server rejects if version mismatch
- Frontend shows conflict dialog when a 409 is returned

### 2. Idempotent Operations (Duplicate Prevention)
- Client sends an `Idempotency-Key` header on mutating requests
- Server caches results by key in Redis (TTL ~5 min)
- Duplicate requests return the cached result instead of re-executing

### 3. Concurrent Assignment (Race Condition)
- Assigning a work item uses a DB transaction with `SELECT ... FOR UPDATE`
- If two users try to claim the same item simultaneously, only one succeeds
- The other receives a clear error message

### 4. Approval Workflow Enforcement
- Items in `AWAITING_APPROVAL` cannot be moved to `RESOLVED` without an approved approval record
- Server enforces valid state transitions (state machine)

### 5. Optimistic UI with Server Reconciliation
- Frontend applies optimistic updates immediately
- On server rejection (version conflict, auth failure), rolls back and shows the server's truth

---

## 📦 Project Structure

```
newtonian/
├── client/                    # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── api/               # API client & React Query hooks
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Button, Modal, Badge, Input, etc.
│   │   │   ├── layout/        # Sidebar, Header, PageLayout
│   │   │   ├── workitems/     # WorkItemCard, WorkItemForm, etc.
│   │   │   └── dashboard/     # Stats, Charts, Filters
│   │   ├── pages/             # Route-level pages
│   │   ├── hooks/             # Custom hooks
│   │   ├── context/           # Auth context, Theme context
│   │   ├── utils/             # Helpers, constants
│   │   ├── styles/            # CSS Modules / global styles
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                    # Express Backend
│   ├── src/
│   │   ├── config/            # DB, Redis, env config
│   │   ├── middleware/        # Auth, RBAC, idempotency, error handler
│   │   ├── routes/            # Route definitions
│   │   ├── controllers/       # Request handlers
│   │   ├── services/          # Business logic
│   │   ├── models/            # Prisma client wrappers
│   │   ├── queues/            # Bull queue definitions & processors
│   │   ├── websocket/         # Socket.io setup & events
│   │   ├── utils/             # Helpers
│   │   └── app.js             # Express app setup
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── tests/                 # Backend tests
│   ├── package.json
│   └── .env
├── ENGINEERING_DECISIONS.md
├── README.md
├── PLAN.md
└── docker-compose.yml         # Postgres + Redis
```

---

## ✅ Task Breakdown & Progress Tracker

### Phase 0: Project Setup
- [x] Initialize monorepo structure (`client/` and `server/`)
- [x] Set up Vite + React frontend with dependencies
- [x] Set up Express backend with dependencies
- [x] Configure Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- [x] Configure Redis / memory caching for idempotency
- [x] Create `docker-compose.yml` for Postgres + Redis
- [x] Set up environment variables (.env)

### Phase 1: Database & Data Model
- [x] Design and write Prisma schema (all entities)
- [x] Run initial migration / schema push
- [x] Create seed script with sample data (users, teams, work items)

### Phase 2: Authentication & Authorization
- [x] Implement user registration endpoint (`POST /api/auth/register`)
- [x] Implement login endpoint with JWT (`POST /api/auth/login`)
- [x] Build auth middleware (JWT verification)
- [x] Build RBAC middleware (role + resource-level checks)
- [x] Write tests for auth & authorization enforcement

### Phase 3: Core API — Work Items CRUD
- [x] `POST /api/work-items` — Create work item
- [x] `GET /api/work-items` — List with pagination, filtering, search
- [x] `GET /api/work-items/:id` — Get single item with history
- [x] `PUT /api/work-items/:id` — Update with optimistic locking (version check)
- [x] `DELETE /api/work-items/:id` — Soft delete (admin only)
- [x] Implement search on title/description
- [x] Implement filtering by status, priority, assignee, team, category
- [x] Write tests for CRUD operations

### Phase 4: Critical Correctness Features
- [x] Implement optimistic concurrency control (version field + 409 on conflict)
- [x] Implement idempotency middleware (Idempotency-Key header + cache)
- [x] Implement concurrent assignment protection
- [x] Implement state machine for work item status transitions
- [x] Implement approval workflow (request, approve, reject)
- [x] Write audit log entries for all mutations (WorkItemHistory)
- [x] Write tests for concurrency, idempotency, and state transitions

### Phase 5: Teams & Collaboration
- [x] `GET /api/teams` — List teams
- [x] `POST /api/teams` — Create team
- [x] `POST /api/teams/:id/members` — Add member with role
- [x] `DELETE /api/teams/:id/members/:userId` — Remove member
- [x] `POST /api/work-items/:id/comments` — Add comment
- [x] `GET /api/work-items/:id/comments` — List comments
- [x] `GET /api/work-items/:id/history` — Full audit trail

### Phase 6: Real-Time Updates & Notifications
- [x] Set up Socket.io on the server
- [x] Emit events on work item create/update/delete/comment
- [x] Frontend auto-refetching & live status state management

### Phase 7: Async Processing Infrastructure
- [x] Service-level event emission for assignment, status change, comment added
- [x] Error-tolerant background handling

### Phase 8: Frontend — Foundation & Layout
- [x] Design and implement global CSS design system (colors, typography, spacing)
- [x] Build layout components (Sidebar, Header, AppLayout)
- [x] Set up React Router with route structure
- [x] Build Auth context & protected routes
- [x] Build Login and Registration pages

### Phase 9: Frontend — Dashboard
- [x] Build dashboard page with key metrics (6 cards: Open, In Progress, Awaiting Approval, Critical, My Items, Total)
- [x] Implement filterable work item list view
- [x] Build search bar with debounced API calls
- [x] Build filter panel (status, priority, team, category, sorting)
- [x] Implement pagination controls

### Phase 10: Frontend — Work Item Management
- [x] Build work item detail page
- [x] Build create/edit work item form with validation
- [x] Implement optimistic updates with React Query
- [x] Build conflict resolution dialog (409 handling)
- [x] Build comment thread component
- [x] Build history/audit log timeline component
- [x] Build approval request & response UI

### Phase 11: Frontend — Teams & Admin
- [x] Build team list & team detail page
- [x] Build team member management UI
- [x] User profile & team memberships display

### Phase 12: Polish & Testing
- [x] End-to-end testing of critical flows
- [x] Error boundary & fallback UI components
- [x] Loading states and skeleton spinners
- [x] Responsive dark theme design
- [x] Fixed all failing integration tests (11/11 passing)

### Phase 13: Documentation & Submission
- [x] Write `README.md` with setup & run instructions
- [x] Write `ENGINEERING_DECISIONS.md` (5 key decisions with trade-offs)
- [x] Document architecture and correctness scenarios
- [x] Final review & cleanup

---

## 🎯 Prioritization Strategy

Given the **one-day time constraint**, priorities are:

| Priority | What | Why |
|----------|------|-----|
| **P0 — Must Have** | Phases 0-4, 8-10 | Core functionality, correctness, usable UI |
| **P1 — Should Have** | Phases 5, 12-13 | Collaboration, documentation, polish |
| **P2 — Nice to Have** | Phases 6-7, 11 | Real-time, async processing, admin views |

### MVP Scope (P0)
1. Working auth system with JWT + RBAC
2. Full work item CRUD with search/filter/pagination
3. Optimistic locking + conflict resolution
4. Idempotency on mutations
5. State machine for status transitions
6. Audit history trail
7. Clean, responsive dashboard + detail views
8. Engineering decisions document

---

## 🧠 Key Assumptions & Decisions

1. **Single-page application** — SPA with React for rich interactivity
2. **Server-side pagination** — Never load full dataset into browser
3. **Soft deletes** — Work items are never hard-deleted (audit trail integrity)
4. **Stateless JWT auth** — No server-side session storage needed
5. **PostgreSQL full-text search** — Avoids adding Elasticsearch for MVP
6. **Monorepo** — Simpler deployment and development in a time-boxed challenge
7. **No email/real notifications** — Console-logged for MVP, queue infrastructure is in place

---

## ⚠️ Known Risks

| Risk | Mitigation |
|------|-----------|
| Time pressure → incomplete features | Strict P0/P1/P2 prioritization |
| Complex concurrency bugs | Rely on Postgres transactions + thorough tests |
| Auth bypass vulnerabilities | Server-enforced middleware on every route |
| Frontend state inconsistency | React Query cache invalidation + optimistic update rollback |
| Database performance with growth | Indexed queries, pagination, explain plan checks |

---

*Last updated: 2026-09-29*
