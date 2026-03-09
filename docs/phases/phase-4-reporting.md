# Phase 4 — Trustee Reporting

**Status:** 📋 Planned
**Goal:** Give trustees clear visibility of property health and compliance status without overwhelming them.

---

## Objectives

Trustees currently have no structured view of maintenance health. They need:
- A single-screen RAG (Red/Amber/Green) status per property
- Statutory compliance visibility (last completion dates vs. required frequency)
- Exportable data for board meetings

---

## Planned Deliverables

### Trustee Dashboard (`/reports`)
- [ ] RAG status cards per site (Red = overdue compliance, Amber = upcoming, Green = all current)
- [ ] Compliance summary table (task type, last done, next due, status)
- [ ] Open task counts by priority across all sites
- [ ] "Completed this month/quarter" summary

### Compliance View
- [ ] Filter to compliance-only tasks (`is_compliance = true`)
- [ ] Show `legislation_ref` next to each item
- [ ] Highlight any overdue compliance items in red
- [ ] Time-to-completion averages

### Export
- [ ] CSV export of compliance history
- [ ] PDF export (browser print stylesheet — no PDF library needed)
- [ ] Date range filter for exports

### Monthly Digest Email
- [ ] Auto-sent to trustees + ast_leads on 1st of each month
- [ ] Summary: compliance status, overdue tasks, completed tasks, upcoming schedule

---

## No New Tables Needed
All data already exists in `tasks` and `task_attachments`. The trustee dashboard is purely a different view of existing data, filtered by `is_compliance` and role.

---

## Verification

```
✓ Log in as trustee → see /reports with RAG status
✓ Red site → click through to see specific overdue items
✓ Export CSV → contains all compliance tasks with dates
✓ Trustee cannot access /tasks/new or /admin/users
✓ Monthly email sent on 1st with correct summary
```
