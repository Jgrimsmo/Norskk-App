# Norskk — Cloud Construction Management

A full-featured construction management platform built with **Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui**.

Brand color: Blue `#2563EB` · Dark sidebar + light content layout · Geist font

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, `src/` directory) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york style) |
| Icons | lucide-react |
| Dates | date-fns + react-day-picker |
| Signatures | react-signature-canvas |
| Toasts | sonner (via shadcn) |
| UI Primitives | Radix UI (via shadcn) |

---

## Pages — Current Status

All pages are fully styled and interactive on the client side.

| Page | Route | Status | Description |
|------|-------|--------|-------------|
| **Dashboard** | `/` | ✅ Complete | KPI cards (hours, projects, safety, equipment), charts, recent activity lists |
| **Time Tracking** | `/time-tracking` | ✅ Complete | Inline-editable table, 12 columns including Work Type, column filters, summary cards |
| **Dispatch** | `/dispatch` | ✅ Complete | Calendar board (day/week/month views), resource panel with search, availability display, duplicate prevention |
| **Projects** | `/projects` | ✅ Complete | CRUD table with status filters, summary cards (active/bidding/completed) |
| **Employees** | `/employees` | ✅ Complete | Inline-edit table, add/delete, summary cards |
| **Equipment** | `/equipment` | ✅ Complete | 3 sub-tables (equipment, attachments, tools), summary cards |
| **Daily Reports** | `/daily-reports` | ✅ Complete | List table with filters + full form dialog (weather, manpower, work performed, delays, materials, visitors, signatures) |
| **Safety** | `/safety` | ✅ Complete | Summary table + FLHA deep template (6 sections with signature pads via react-signature-canvas) |
| **Settings** | `/settings` | ⬜ Placeholder | Static cards only — no forms or functionality yet |

### Sidebar Navigation (grouped)

- **Overview:** Dashboard
- **Operations:** Time Tracking, Dispatch, Projects
- **Resources:** Employees, Equipment
- **Reporting:** Daily Reports, Safety
- **System:** Settings

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Route group — all pages with sidebar layout
│   │   ├── layout.tsx        # SidebarProvider + TooltipProvider + TopBar
│   │   ├── page.tsx          # Dashboard
│   │   ├── time-tracking/
│   │   ├── dispatch/
│   │   ├── projects/
│   │   ├── employees/
│   │   ├── equipment/
│   │   ├── daily-reports/
│   │   ├── safety/
│   │   └── settings/
│   ├── layout.tsx            # Root layout (Geist font, metadata)
│   └── globals.css           # Theme tokens (light + dark via oklch)
├── components/
│   ├── app-sidebar.tsx       # Dark sidebar with nav sections
│   ├── top-bar.tsx           # Breadcrumbs, search, notifications, user menu
│   ├── ui/                   # shadcn/ui components
│   ├── time-tracking/        # Column filter, date filter, time tracking table
│   ├── daily-reports/        # Daily report form dialog + table
│   ├── dispatch/             # Dispatch board component
│   ├── employees/            # Employees table
│   ├── equipment/            # Equipment table
│   ├── projects/             # Projects table
│   └── safety/               # Safety table + FLHA form dialog
├── hooks/                    # (empty — will hold Firebase hooks)
└── lib/
    ├── types/
    │   └── time-tracking.ts  # All TypeScript interfaces (272 lines)
    ├── data/
    │   ├── time-tracking-data.ts  # Hardcoded mock data (~814 lines)
    │   └── flha-defaults.ts       # Default FLHA hazard categories + PPE items
    └── utils.ts              # cn() utility
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/types/time-tracking.ts` | All TypeScript interfaces — maps 1:1 to future Firestore collections |
| `src/lib/data/time-tracking-data.ts` | Mock data arrays: employees, projects, costCodes, equipment, attachments, tools, timeEntries, safetyForms, dispatchAssignments, sampleDailyReports |
| `src/components/top-bar.tsx` | Hardcoded "Admin User" / "JG" avatar + non-functional Log out — needs auth wiring |
| `src/components/time-tracking/column-filter.tsx` | Reusable filter — props: `{ title, options: {id, label}[], selected: Set<string>, onChange }` |
| `src/components/time-tracking/date-column-filter.tsx` | Reusable date filter — props: `{ dateRange: DateRange \| undefined, onDateRangeChange }` |

---

## Current Limitations

- **No backend** — zero API routes, no database, no server actions
- **No authentication** — no auth library, no login page, no route protection
- **No data persistence** — all data is `useState(mockData)`, lost on refresh
- **No file uploads** — photo URLs referenced but no upload mechanism
- **No tests** — zero test files
- **No deployment config** — no `.env`, no CI/CD, no Vercel/Docker config
- **Non-functional UI elements:** TopBar search (all other buttons now show toast feedback)

---

## Phase 1 Roadmap — Firebase Backend

**Chosen stack:** Firebase (Firestore + Firebase Auth + Firebase Storage)

### Prerequisites

Before starting, create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com):

1. Create project (e.g., "Norskk")
2. Enable **Authentication** → Email/Password provider
3. Enable **Cloud Firestore** → Start in test mode
4. Enable **Storage** → For photos/file uploads
5. Project Settings → General → Add Web App → Copy config object

### Implementation Steps

| # | Task | Details |
|---|------|---------|
| 1 | **Install Firebase SDK** | `firebase`, `firebase-admin`, `react-firebase-hooks` |
| 2 | **Firebase config & init** | Create `src/lib/firebase/config.ts`, add `.env.local` with Firebase credentials |
| 3 | **Firestore service layer** | Create `src/lib/firebase/firestore.ts` — typed CRUD for collections: `employees`, `projects`, `costCodes`, `equipment`, `attachments`, `tools`, `timeEntries`, `safetyForms`, `dailyReports`, `dispatchAssignments` |
| 4 | **Auth context & provider** | Create `src/lib/firebase/auth.tsx` — wraps app, handles sign-in/sign-out/session |
| 5 | **React data hooks** | Create hooks in `src/hooks/` (`useEmployees()`, `useProjects()`, etc.) using Firestore real-time listeners |
| 6 | **Login page + route protection** | Create `src/app/login/page.tsx`, protect dashboard routes, wire "Log out" in TopBar |
| 7 | **Wire up all pages** | Replace mock data imports with Firebase hooks across all 9 pages |
| 8 | **Seed script** | Push existing mock data from `time-tracking-data.ts` into Firestore |
| 9 | **Build Settings page** | Functional forms: company profile, user management, cost codes, notifications |
| 10 | **Verify** | Zero errors, build passes, data persists across refreshes |

### Firestore Collections (mapped from types)

```
employees/        → Employee interface
projects/         → Project interface
costCodes/        → CostCode interface
equipment/        → Equipment interface
attachments/      → Attachment interface
tools/            → Tool interface
timeEntries/      → TimeEntry interface
safetyForms/      → SafetyForm interface (with nested flha?: FLHAData)
dailyReports/     → DailyReport interface (with nested arrays)
dispatchAssignments/ → DispatchAssignment interface
```

### Future Phases

**Phase 2 — Core Features:**
- Wire up Export buttons (CSV/PDF)
- Global search in TopBar
- File uploads for photos (Firebase Storage)
- Error/loading states (`error.tsx`, `loading.tsx`, `not-found.tsx`)

**Phase 3 — Polish & Deploy:**
- Dark mode toggle (theme tokens already exist)
- Notification system
- Testing (Vitest + Playwright)
- CI/CD & deployment (Vercel or Docker)
- Multi-tenant / company scoping
- Audit logging

---

## Resume Instructions

When continuing development, say:

> **"Let's continue with Firebase Phase 1"**

Then paste your Firebase config object and we'll pick up from step 1.
