# NDS Maintenance Tracker — Dev Notes

A record of fixes and gotchas discovered during development.

> For structured documentation see [`docs/`](docs/README.md).
> Key decisions are in [`docs/decisions/`](docs/decisions/).
> Architecture is in [`docs/architecture/`](docs/architecture/).

---

## 1. Auth callback route was unreachable (404)

**Problem:** Magic link emails pointed to `/auth/callback` but the route handler lived at `app/(auth)/callback/route.ts`. In Next.js App Router, parenthesised folders are layout groups — they don't contribute a URL segment. So the route was actually at `/callback`, not `/auth/callback`.

**Fix:** Created `app/auth/callback/route.ts` at the correct path. The old file at `app/(auth)/callback/route.ts` is harmless but unreachable.

---

## 2. "Database error saving new user" on sign-in

**Problem:** Supabase returned this error when attempting to send a magic link to a new email. The `on_auth_user_created` trigger (`handle_new_user`) was failing because the `SECURITY DEFINER` function ran without an explicit `search_path`, so it couldn't resolve the `profiles` table.

**Fix:** Re-created the function with `SET search_path = public` and fully-qualified the table name as `public.profiles`:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'volunteer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

Run this in the Supabase SQL Editor if setting up a fresh environment.

---

## 3. "Invalid UUID" on form submission

**Problem:** Submitting the task/report form returned "Invalid UUID". Zod v4 upgraded its UUID validator to RFC 9562 strict mode, which requires the version nibble (3rd segment, 1st character) to be `1–8`. The seed data used a hand-crafted UUID `a1b2c3d4-0000-0000-0000-000000000001` with version `0`, which Zod v4 correctly rejects.

**Fix:** Replaced `z.string().uuid()` with a shape-only regex validator that accepts any 8-4-4-4-12 hex pattern without enforcing version/variant bits:

```typescript
const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID'
)
```

The seed data UUID has been updated to `a1b2c3d4-cafe-4000-a000-000000000001` (RFC-compliant) for future fresh installs. Existing databases with the old UUID do not need to be migrated — the permissive validator accepts both.

Also added `z.preprocess` wrappers for optional UUID and text fields to robustly coerce empty strings and nulls (from unselected shadcn `<Select>` components) to `undefined` before Zod validation runs.

---

## 4. Password login added

**Problem:** The only login method was magic link email, making repeated local dev logins slow.

**Fix:** Added a password login option to `LoginForm.tsx`. The form defaults to magic link but has a toggle to switch to email + password (`supabase.auth.signInWithPassword`).

**To set a password for your account:**
1. Supabase → Authentication → Users → your user
2. Click **Send password recovery**
3. Set your password via the emailed link

---

## 5. Middleware deprecation warning

**Non-breaking.** Next.js 16 deprecated the `middleware.ts` filename convention in favour of `proxy.ts`. The warning appears on server start but does not affect functionality. Rename `middleware.ts` → `proxy.ts` when convenient.

---

## Local dev quick-start (after initial setup)

```bash
cd maintenance-tracker
npm run dev
# → http://localhost:3000
```

Sign in at `/login` using email + password (fastest) or a magic link.
Public report form (no login): `/report/overstone`
