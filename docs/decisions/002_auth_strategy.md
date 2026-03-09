# ADR 002 — Authentication Strategy

**Date:** 2025 (Phase 1) / updated Phase 2
**Status:** Implemented

---

## Context

The application is invite-only — no public registration. Users are NDS volunteers, owners, leads, and trustees. The primary risk is adoption: if login is painful, volunteers won't use the app. A secondary risk is security: this system holds details of physical property vulnerabilities.

---

## Decisions

### Primary: Magic Link (Passwordless)

**Chosen:** `supabase.auth.signInWithOtp({ email })` — Supabase sends a one-click login link

**Rationale:**
- No password to forget — critical for older volunteers who may not use the app daily
- Supabase handles link generation, expiry, and delivery
- No password reset flow to build or maintain
- Links expire after 24 hours

**Flow:**
```
User enters email → Supabase sends magic link email
→ User clicks link → /auth/callback route
→ Session cookie set → redirect to /dashboard
```

---

### Secondary: Password Login (added Phase 2)

**Chosen:** `supabase.auth.signInWithPassword({ email, password })` — toggle on login form

**Rationale:**
- During development, clicking through a magic link email every time is slow
- Some users prefer password login for speed (they use the app frequently)
- Does not replace magic link — both options are available
- Password reset fully implemented (3 bugs fixed — see `DEV_NOTES.md` and phase 2 notes)

**Password reset flow:**
```
User clicks "Forgot password?" → enters email
→ Supabase sends recovery email (token_hash + type params)
→ app/page.tsx forwards params to /auth/callback
→ /auth/callback verifies OTP → sets recovery session
→ AuthStateListener detects recovery AMR claim → redirects to /auth/update-password
→ User sets new password → signOut() clears recovery session
→ Redirect to /login?message=password_reset → success banner shown
```

**Key gotcha — recovery session loop:**
After `updateUser({ password })`, the JWT's AMR (Authentication Methods Reference) claim still contains `{ method: 'recovery' }`. If the user is not signed out, `AuthStateListener` keeps redirecting them back to `/auth/update-password`. Fix: call `signOut()` immediately after `updateUser` succeeds.

---

### Invite-Only Registration

**Chosen:** `supabase.auth.admin.inviteUserByEmail({ email, options: { data: { full_name, role } } })` — ast_lead only

**Rationale:**
- No self-registration — only AST leads can add users
- Role is set at invite time via `raw_user_meta_data`
- The `handle_new_user` database trigger creates the `profiles` row automatically from this metadata

**Invite flow:**
```
AST lead fills InviteUserForm (email + role)
→ inviteUser() server action
→ supabase.auth.admin.inviteUserByEmail()
    (uses service-role client — admin API)
→ User receives invite email → clicks link → sets password or uses magic link
→ handle_new_user trigger creates profiles row with correct role
```

---

### Auth State Listener (Global)

**Component:** `components/auth/AuthStateListener.tsx`
**Mounted in:** Root layout (`app/layout.tsx`) — active on every page including login

**Why root layout:** The `PASSWORD_RECOVERY` event fires as soon as the auth session is established — potentially before the user navigates to any authenticated page. If the listener is only in the `(app)` layout (which requires auth), it won't fire on the login page. Moving it to the root layout ensures it catches the event wherever the user lands.

**Events handled:**
1. `PASSWORD_RECOVERY` — explicit event from Supabase
2. `INITIAL_SESSION` with recovery AMR — initial load with a recovery session
3. `SIGNED_IN` with recovery AMR — fallback for implicit flow

**Recovery AMR detection:**
```typescript
function isRecoverySession(session: Session | null): boolean {
  if (!session) return false
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]))
    return Array.isArray(payload.amr) &&
      payload.amr.some((m: { method: string }) => m.method === 'recovery')
  } catch { return false }
}
```

---

### Auth Callback Handling

Two Supabase email redirect types require different handling:

| Source | URL format | Handler |
|--------|-----------|---------|
| App "Forgot password?" button | `?code=` (PKCE) | `exchangeCodeForSession()` |
| Supabase dashboard invite/recovery | `?token_hash=&type=` (OTP) | `verifyOtp()` |
| Legacy implicit flow | `#access_token=...` (hash) | Client-side via `AuthStateListener` |

All Supabase emails redirect to the Site URL root (`/`). The root page (`app/page.tsx`) forwards the relevant query parameters to `/auth/callback`:
- `?code=` → `/auth/callback?code=...`
- `?token_hash=&type=` → `/auth/callback?token_hash=...&type=...`

---

## Consequences

- Users never need to remember a password (magic link as default)
- Frequent users can set a password for convenience
- All auth state is managed server-side (cookies) — no client-side JWT storage
- `AuthStateListener` in root layout adds a small cost to every page load (one Supabase subscription)
- The recovery session loop is prevented by `signOut()` after password update — this is a permanent design decision that must be maintained if the password reset flow is modified
