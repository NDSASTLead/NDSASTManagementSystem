# NDS Maintenance Tracker — Documentation

This folder contains all project documentation for the NDS Maintenance Tracker.

---

## Contents

### 📐 Architecture
Technical documentation of how the system is built.

| Document | Description |
|----------|-------------|
| [architecture/overview.md](architecture/overview.md) | System overview, tech stack, request flow |
| [architecture/database.md](architecture/database.md) | Full database schema, tables, indexes, triggers |
| [architecture/permissions.md](architecture/permissions.md) | Role-based access control matrix |

---

### 🗂 Phases
Project roadmap and delivery status.

| Document | Description |
|----------|-------------|
| [phases/README.md](phases/README.md) | Roadmap overview and current status |
| [phases/phase-1-mvp.md](phases/phase-1-mvp.md) | Phase 1 — MVP (✅ Complete) |
| [phases/phase-2-enhancements.md](phases/phase-2-enhancements.md) | Phase 2 — Enhancements (✅ Complete) |
| [phases/phase-3-scheduling.md](phases/phase-3-scheduling.md) | Phase 3 — Scheduling & Notifications (🔜 Next) |
| [phases/phase-4-reporting.md](phases/phase-4-reporting.md) | Phase 4 — Trustee Reporting (📋 Planned) |
| [phases/phase-5-polish.md](phases/phase-5-polish.md) | Phase 5 — WhatsApp & Polish (📋 Planned) |

---

### 🧠 Decisions
Architecture Decision Records (ADRs) — why we built it this way.

| Document | Decision |
|----------|----------|
| [decisions/001_tech_stack.md](decisions/001_tech_stack.md) | Technology choices (Next.js, Supabase, Vercel) |
| [decisions/002_auth_strategy.md](decisions/002_auth_strategy.md) | Authentication design (magic links + passwords) |
| [decisions/003_edit_ticket.md](decisions/003_edit_ticket.md) | Edit ticket feature — role-based field access |
| [decisions/004_smtp_provider.md](decisions/004_smtp_provider.md) | SMTP provider selection — Resend vs M365 vs alternatives |

---

### 📏 Standards
Coding conventions and patterns used throughout the project.

| Document | Description |
|----------|-------------|
| [standards/coding-standards.md](standards/coding-standards.md) | TypeScript, React, naming, patterns |

---

### 📊 Progress

| Document | Purpose |
|----------|---------|
| [PROGRESS.md](PROGRESS.md) | **Living progress tracker** — scope of all phases, per-item checklist |
| [PLAN.md](PLAN.md) | Original pre-build plan (historical record) |

---

## Quick Reference

**Local dev:**
```bash
cd maintenance-tracker
npm run dev   # → http://localhost:3000
```

**Useful URLs:**
- App: http://localhost:3000
- Public report form: http://localhost:3000/report/overstone
- Login: http://localhost:3000/login

**Key files:**
- Database schema: `supabase/migrations/001_initial_schema.sql`
- RLS policies: `supabase/migrations/002_rls_policies.sql`
- Types: `lib/supabase/types.ts`
- Server actions: `lib/actions/`

**Development notes:**
- `DEV_NOTES.md` — Gotchas and fixes found during development
- `SETUP.md` — Step-by-step setup guide for new environments
