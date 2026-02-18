# Norskk App

Construction operations app built with Next.js, TypeScript, Tailwind, and Firebase.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Firebase Auth + Firestore + Storage
- Firebase Admin SDK for server-side privileged actions

## Quick Start

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill values.

### Client Firebase config

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Server Admin config (required for invite API)

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY` (escaped newlines like `\\n`)

### Optional

- `NEXT_PUBLIC_ENABLE_SEED_PAGE=true` to enable `/seed` in non-production environments.

## Security & Access

### Server-side invite flow

- Endpoint: `POST /api/admin/invite-user`
- Uses Firebase Admin SDK (`src/lib/firebase/admin.ts`)
- Verifies caller ID token
- Enforces Admin role from Firestore employee record
- Creates Auth user + employee document server-side

### Client-side authorization

- `usePermissions` is fail-closed (unknown role => no permissions)
- Hardcoded email-based admin escalation removed

### Firebase rules

Rules files in repo:

- `firestore.rules`
- `storage.rules`
- `firebase.json`

Deploy rules:

```bash
firebase deploy --only firestore:rules,storage
```

## Quality & Release Gates

### Local checks

```bash
npm run lint
npx tsc --noEmit
```

### Preflight

```bash
npm run preflight
```

Strict mode (fails on warnings):

```bash
npm run preflight:strict
```

`preflight` checks:

1. Required environment variables
2. Lint
3. Typecheck
4. Production build

## Key Paths

- Auth context: `src/lib/firebase/auth-context.tsx`
- Firestore helpers: `src/lib/firebase/firestore.ts`
- Admin bootstrap: `src/lib/firebase/admin.ts`
- Invite API: `src/app/api/admin/invite-user/route.ts`
- Permissions model: `src/hooks/use-permissions.ts`
- Permission templates: `src/lib/constants/permissions.ts`

## Production Notes

- Keep seed page disabled in production (`NEXT_PUBLIC_ENABLE_SEED_PAGE=false`)
- Set all Admin SDK env vars in your hosting platform
- Deploy Firestore/Storage rules before first production release
- Run `npm run preflight:strict` as a release gate
