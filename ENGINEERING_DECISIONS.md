# 🧠 Newtonian — Key Engineering Decisions & Architectural Trade-offs

> **Project:** Newtonite Operations Management Platform  
> **Challenge:** Internal Operations Management System for Scaling Organizations  

---

## 1. Concurrency Control: Optimistic Locking with Versioning

### Decision
We implemented **Optimistic Concurrency Control (OCC)** using a mandatory `version` integer field on the `WorkItem` model. Every mutating API endpoint (`PUT /api/work-items/:id`) requires the client to supply the expected current version. If the server finds that the database version has been bumped by another user's edit, it aborts the transaction and responds with HTTP **409 Conflict**.

### Alternatives Considered
- **Pessimistic Locking (`SELECT FOR UPDATE` on read):** Holding explicit row locks while a user opens an edit modal locks database resources across user think-time, limiting scalability under hundreds of concurrent users.
- **Last-Write-Wins (LWW):** Silently overwrites concurrent edits, causing catastrophic data loss in operational workflows (e.g. overwriting status or compliance approvals).

### Trade-offs & Reconciliation
- **Pros:** Zero database lock overhead during reads, high throughput, guarantees data integrity.
- **Cons:** Requires explicit frontend handling. We built a React Query reconciliation modal that catches 409 responses, shows the server's current state side-by-side with the user's unsaved changes, and allows diff inspection or force-refresh.

---

## 2. Idempotency Middleware for Mutating Operations

### Decision
We designed a custom Express middleware (`idempotency()`) that inspects the `x-idempotency-key` HTTP header on `POST` and `PUT` requests. The middleware caches the result status code and body in Redis (or an in-memory fallback cache with TTL) for 5 minutes. Subsequent retries with the same key bypass controller execution and immediately return the cached response.

### Alternatives Considered
- **Client-side disable-button-on-submit:** Easily bypassed by network retry policies, page reloads, or automated scripts.
- **Database-level unique request IDs:** Increases schema complexity and tightly couples idempotency logic to relational models.

### Trade-offs & Reconciliation
- **Pros:** Prevents duplicate item creation, duplicate comments, or double approval transitions during unstable network connections or accidental user double-clicks.
- **Cons:** Cache storage requirement. Mitigated by setting an explicit 5-minute TTL on idempotency entries.

---

## 3. Server-Enforced RBAC & Resource-Level Authorization

### Decision
Authorization logic is enforced strictly on the **server side** via layered middleware (`authenticate` + `authorize([roles])` + team membership checks). A user cannot read or mutate work items belonging to teams they do not belong to, regardless of client UI state.

### Alternatives Considered
- **Client-side only view toggles:** Highly vulnerable to API sniffing and direct HTTP client manipulation (Postman/curl).
- **Global admin flags:** Insufficient for multi-team operational isolation where compliance or operational items are team-restricted.

### Trade-offs & Reconciliation
- **Pros:** Impenetrable security boundary; compliance with operational privacy requirements.
- **Cons:** Requires team membership lookups on queries. Optimized via compound indexes on `(userId, teamId)` in `team_memberships`.

---

## 4. State Machine & Approval Workflow Constraints

### Decision
Work item status transitions follow a strict state machine validated at the service layer (`isValidTransition`):
- `OPEN` ➔ `IN_PROGRESS` | `CLOSED`
- `IN_PROGRESS` ➔ `OPEN` | `AWAITING_APPROVAL` | `RESOLVED` | `CLOSED`
- `AWAITING_APPROVAL` ➔ `IN_PROGRESS` | `RESOLVED` | `CLOSED`
- `RESOLVED` ➔ `OPEN` | `IN_PROGRESS` | `CLOSED`
- `CLOSED` ➔ `OPEN`

Furthermore, moving an item from `AWAITING_APPROVAL` to `RESOLVED` requires a verified `APPROVED` record in the `approvals` table.

### Alternatives Considered
- **Unrestricted status dropdown:** Allows invalid operational state skips (e.g., resolving a compliance item without sign-off).
- **Frontend-only state rules:** Can be bypassed via direct API calls.

### Trade-offs & Reconciliation
- **Pros:** Guarantees business process compliance and auditability.
- **Cons:** Slightly stricter API contract; requires standard approval actions before resolution.

---

## 5. Audit Logging & Soft Deletion Integrity

### Decision
Mutations produce immutable `WorkItemHistory` entries capturing the acting user, timestamp, action type, field changed, and old/new values. Work item deletions are **soft deletes** (`isDeleted = true`) to preserve audit history and relational integrity.

### Alternatives Considered
- **Hard deletes (`DELETE FROM work_items`):** Destroys compliance history and causes orphaned comments/approvals.
- **Database triggers:** Harder to test and maintain across different deployment environments.

### Trade-offs & Reconciliation
- **Pros:** Full audit trail for regulatory compliance; easy recovery from accidental deletions.
- **Cons:** All read queries must include `isDeleted: false`. Enforced centrally in `workItemService`.
