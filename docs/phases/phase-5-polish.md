# Phase 5 — WhatsApp, PWA & Polish

**Status:** 📋 Planned
**Goal:** Maximum convenience for volunteers and a professional finish.

---

## Planned Deliverables

### WhatsApp Notifications (Twilio)
- [ ] Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` env vars
- [ ] `lib/notifications/whatsapp.ts` — Twilio API wrapper
- [ ] Opt-in settings per user (`whatsapp_opt_in` column already exists on profiles)
- [ ] WhatsApp message templates for key events (assigned, overdue, etc.)
- [ ] ~£2–5/month pay-per-use

### Custom Domain
- [ ] Purchase/connect domain (e.g. `maintenance.ndsscouts.org.uk`)
- [ ] Update Vercel project domain
- [ ] Update Supabase Site URL + redirect URLs
- [ ] ~£1/month

### PWA (Add to Home Screen)
- [ ] `public/manifest.json` — app name, icons, theme colour
- [ ] Service worker for offline detection
- [ ] "Add to home screen" prompt on first visit
- [ ] Splash screen on iOS/Android

### Camera-First Photo Capture
- [ ] Improve mobile photo UX — direct camera button (not file picker)
- [ ] `capture="environment"` attribute already set — polish the surrounding UI

### QR Code Management
- [ ] `/admin/qr-codes` page listing all sites + buildings
- [ ] One-click printable A5 card (QR code + "Spot a problem?" text)
- [ ] QR code regeneration if site slug changes

### Bulk Operations (ast_lead)
- [ ] Multi-select on task list
- [ ] Bulk assign, bulk status update, bulk export

### Quick Complete from Email
- [ ] Magic link in task assignment email → tapping marks it in-progress without visiting the app
- [ ] Requires Resend webhook support (Phase 3 prerequisite)

---

## Verification

```
✓ User opts into WhatsApp → receives message on task assignment
✓ User visits on mobile → "Add to home screen" prompt shown
✓ App installed → shows custom icon + name on home screen
✓ Visit custom domain → app loads, auth works, emails use correct domain
✓ AST lead → /admin/qr-codes → downloads printable A5 card
✓ Bulk select 3 tasks → assign all to same person in one action
```
