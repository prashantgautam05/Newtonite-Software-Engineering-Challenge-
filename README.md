# Newtonian — Operations Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-v6-indigo.svg)](https://prisma.io)
[![Tests](https://img.shields.io/badge/Tests-11%20Passed-success.svg)](#-running-tests)

**Newtonian** is a high-reliability, real-time internal operations management platform built for fast-growing organizations. It enables multi-team coordination across customer issues, incidents, compliance requests, and approval workflows with guaranteed data consistency.

---

## Key Features & Correctness Highlights

1. **Optimistic Concurrency Control (OCC):**
   - Implements version-based conflict detection (`version` field) on all work items.
   - Prevents accidental overwrites when multiple team members edit concurrently (returns HTTP `409 Conflict`).

2. **Idempotent Mutations:**
   - Enforces `x-idempotency-key` headers for mutation requests to prevent duplicate creation or double approvals on network retries.

3. **Strict State Machine & Approvals:**
   - Enforces valid status transitions (`OPEN` ➔ `IN_PROGRESS` ➔ `AWAITING_APPROVAL` ➔ `RESOLVED`).
   - Items in `AWAITING_APPROVAL` cannot transition to `RESOLVED` without an approved approval record.

4. **Server-Enforced RBAC:**
   - Role-Based Access Control (`ADMIN`, `MEMBER`, `VIEWER`) enforced strictly at the API layer.
   - Team-isolated access control ensures users can only access items within their authorized teams.

5. **Complete Audit Trail & Soft Deletes:**
   - Automatic record of every field change, state transition, and assignment in `WorkItemHistory`.
   - Items are soft-deleted to maintain regulatory audit integrity.

6. **Modern Dark UI Design System:**
   - Built with custom CSS design tokens, glowing badges, smooth glassmorphism, responsive data grids, inline editing, and state transition buttons.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               React 18 + Vite Client                │
│  Dashboard │ Work Items │ Detail & Edit │ Teams     │
└────────────────────┬────────────────────────────────┘
                     │ REST API (Axios + JWT)
┌────────────────────▼────────────────────────────────┐
│               Express + Node.js Server              │
│  Auth Middleware │ RBAC │ Idempotency │ Controllers │
│  Optimistic Locking │ Audit Trail │ Error Handler   │
└────────────────────┬────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────▼────────────────────────────────┐
│               Database Layer                        │
│  SQLite (Zero-config dev) / PostgreSQL (Prod ready) │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Repository Setup & Dependencies

```bash
cd d:/newtonian/server
npm install

cd d:/newtonian/client
npm install
```

### 2. Database Setup & Seeding

```bash
cd d:/newtonian/server
npx prisma db push
npm run db:seed
```

### 3. Start Development Servers

**Backend API Server (Port 3001):**
```bash
cd d:/newtonian/server
npm start
```

**Frontend React Client (Port 5173):**
```bash
cd d:/newtonian/client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Accounts

All seeded demo accounts share the password: `password123`

| Email | Name | Default Team | Role |
|-------|------|--------------|------|
| `alice@newtonite.com` | Alice Johnson | Engineering | ADMIN |
| `bob@newtonite.com` | Bob Smith | Engineering | MEMBER |
| `charlie@newtonite.com` | Charlie Davis | Operations | ADMIN |
| `diana@newtonite.com` | Diana Patel | Compliance | ADMIN |
| `eve@newtonite.com` | Eve Rodriguez | Operations | MEMBER |

---

## Running Tests

Integration tests cover authentication, team authorization, work item CRUD, optimistic version locking (409 conflict detection), and comment creation.

```bash
cd d:/newtonian/server
npm test
```

---

## Project Structure

```
newtonian/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── index.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── config/
│   │   └── app.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── tests/
│   └── package.json
├── ENGINEERING_DECISIONS.md
├── PLAN.md
└── README.md
```
