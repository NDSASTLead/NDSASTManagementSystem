# ADR 001 — Technology Stack

**Date:** 2025 (project start)
**Status:** Implemented

---

## Context

We needed a web application for NDS volunteers to log and track maintenance tasks. Key constraints:
- Primary users are older volunteers who may be unfamiliar with apps
- Must work well on mobile phones (most volunteers don't use a laptop for this)
- Zero ongoing cost until the tool proves its value
- One developer (part-time), so stack must be productive with minimal boilerplate

---

## Decisions

### Framework: Next.js (App Router) on Vercel

**Chosen:** Next.js 16 with App Router
**Alternatives considered:** Remix, SvelteKit, plain React + Express

**Rationale:**
- Server Components reduce JavaScript sent to mobile browsers — critical for volunteers on slower connections
- Server Actions eliminate the need for a separate REST API layer for form submissions
- Vercel provides zero-config deployment from GitHub with free hosting
- App Router's `layout.tsx` hierarchy maps naturally to role-based UI shells (auth vs. app)

**Note on version:** Started as Next.js 14 in planning; upgraded to Next.js 16 during build. Next.js 16 makes Turbopack mandatory (no `--no-turbopack` flag). See ADR for Turbopack pin in coding-standards.md.

---

### Database + Auth: Supabase

**Chosen:** Supabase (managed PostgreSQL + Auth + Storage)
**Alternatives considered:** PlanetScale, Firebase, Neon + Auth0

**Rationale:**
- PostgreSQL with Row Level Security (RLS) provides database-level access control — security is enforced even if application code has bugs
- Magic link auth is built in — no need to build auth from scratch
- Storage is included — simplifies photo upload (single service, single billing)
- Supabase's free tier is generous enough for Phase 1–4 usage
- `@supabase/ssr` package provides clean Server Component + Server Action integration

**Trade-offs accepted:**
- Supabase is a single point of failure for both auth and data — acceptable for this use case
- Vendor lock-in on auth + RLS — acceptable given cost and simplicity benefits

---

### Styling: Tailwind CSS + shadcn/ui

**Chosen:** Tailwind CSS 4.0 with shadcn/ui component library
**Alternatives considered:** CSS Modules, styled-components, Chakra UI, MUI

**Rationale:**
- Tailwind eliminates the need for separate stylesheet files — all styles co-located with components
- shadcn/ui provides accessible Radix-based primitives (dialog, select, etc.) with zero runtime overhead
- shadcn copies component source into the project — no black-box dependency, fully customisable
- Tailwind v4's native `@import "tailwindcss"` replaces config file complexity

**Known issue — version pin:**
`tailwindcss` and `@tailwindcss/postcss` are pinned to exact `4.0.7` (no `^` caret).
Versions above 4.0.7 trigger a fatal Turbopack panic on Windows by generating a path ending in `\nul` (the Windows NUL reserved device name).
See [Next.js GitHub Discussion #88443](https://github.com/vercel/next.js/discussions/88443).

---

### Language: TypeScript

**Chosen:** TypeScript 5 (strict mode)
**Rationale:**
- Type safety across database types, server action payloads, and component props catches bugs at compile time
- Supabase types (`lib/supabase/types.ts`) are manually maintained to match the database schema
- The overhead of types pays off significantly when working across server/client boundaries

---

### Validation: Zod

**Chosen:** Zod v4
**Rationale:** Schema validation in server actions with descriptive error messages. Pairs with react-hook-form for client-side validation.

**Known issue:** Zod v4 upgraded UUID validation to RFC 9562 strict mode (version nibble must be 1–8). Seed data uses version-0 UUIDs. Solution: custom shape-only regex validator (see `lib/actions/tasks.ts` and `DEV_NOTES.md §3`).

---

### Email: Resend (Phase 3)

**Chosen:** Resend
**Rationale:** Simple API, good React Email template support, 3,000 emails/month free. Deferred to Phase 3.

---

### WhatsApp: Twilio (Phase 5)

**Chosen:** Twilio WhatsApp API
**Rationale:** Pay-per-use (~£2–5/month), opt-in only, simple API. Deferred to Phase 5.

---

## Consequences

- Stack is very productive for a solo developer
- Total monthly cost is £0 through Phase 4
- Turbopack version pin must be maintained when upgrading Next.js
- Supabase RLS is the security backbone — any schema changes require corresponding RLS policy updates
