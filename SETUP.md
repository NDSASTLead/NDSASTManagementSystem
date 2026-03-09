# NDS Maintenance Tracker — Setup Guide

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in / create a free account
2. Click **New project**
3. Name it `nds-maintenance`, choose region **West Europe (eu-west-2)**
4. Set a strong database password and save it somewhere safe
5. Wait ~2 minutes for the project to spin up

---

## Step 2: Run the Database Migrations

In your Supabase project, go to **SQL Editor** and run these files **in order**. For each one, paste the full file contents and click **Run**.

| # | File | What it creates |
|---|---|---|
| 1 | `supabase/migrations/001_initial_schema.sql` | All tables, indexes, triggers |
| 2 | `supabase/migrations/002_rls_policies.sql` | Row Level Security policies |
| 3 | `supabase/migrations/003_seed_data.sql` | Overstone site + buildings + asset categories |
| 4 | `supabase/migrations/004_attachments.sql` | Photo attachments table + storage bucket |

> ⚠️ If migration 004 gives an error on the `INSERT INTO storage.buckets` line, the bucket may already exist — safe to ignore. Everything else in that file should still run.

---

## Step 3: Configure Supabase Auth

1. In Supabase, go to **Authentication → Settings**
2. Under **Email**, ensure **Enable email confirmations** is turned **OFF** (the app uses magic links)
3. Under **URL Configuration**, set the following — you'll update the Site URL again after deploying to Vercel:

   | Setting | Value |
   |---|---|
   | **Site URL** | `http://localhost:3000` (update to Vercel URL after deploy) |
   | **Redirect URLs** | Add `http://localhost:3000/**` |

---

## Step 4: Get Your API Keys

In Supabase, go to **Settings → API**. You'll need these in Steps 5 and 6:

| Key | Where to find it | Environment variable |
|---|---|---|
| Project URL | Top of the API settings page | `NEXT_PUBLIC_SUPABASE_URL` |
| anon / public | Under "Project API keys" | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role | Under "Project API keys" — click Reveal | `SUPABASE_SERVICE_ROLE_KEY` ⚠️ secret |

---

## Step 5: Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (`node -v` to check)
- npm v9 or later (`npm -v` to check)
- Git

### Steps

1. **Clone the repo**

   ```bash
   git clone <your-repo-url>
   cd NDSASTManagementSystem
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and fill in your values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=NDS Maintenance
   ```

   > **Never commit `.env.local`** — it's in `.gitignore` and contains secrets.

4. **Start the dev server**

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

---

## Step 6: Deploy to Vercel

> The trickiest part is that you need a Vercel URL to finish configuring Supabase, but you need Supabase configured before deploying. Follow these steps in order to avoid the chicken-and-egg problem.

### 6a — Push to GitHub

If you haven't already, push the project to a GitHub repository.

> Make sure `.env.local` is **not** committed — it should be in `.gitignore`.

### 6b — Create the Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repository
4. When prompted to configure the project:
   - Leave **Root Directory** blank (app is at repo root)
   - Framework will be detected as **Next.js** automatically

### 6c — Add environment variables

Before clicking Deploy, add the following environment variables. Click **Add** for each one:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (from Step 4) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon/public key (from Step 4) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key (from Step 4) |
| `NEXT_PUBLIC_APP_URL` | Leave as `https://your-app.vercel.app` for now — **you'll update this after the first deploy** |
| `NEXT_PUBLIC_APP_NAME` | `NDS Maintenance` |

### 6d — Deploy

Click **Deploy**. Vercel will build and deploy the app. Once complete, you'll get a URL like `https://nds-maintenance-abc123.vercel.app`.

### 6e — Update with your real Vercel URL

Now that you have the real URL, update two places:

**In Vercel:**
1. Go to your project → **Settings → Environment Variables**
2. Edit `NEXT_PUBLIC_APP_URL` and set it to your actual URL, e.g. `https://nds-maintenance-abc123.vercel.app`
3. Go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**

**In Supabase:**
1. Go to **Authentication → Settings → URL Configuration**
2. Update **Site URL** to your Vercel URL: `https://nds-maintenance-abc123.vercel.app`
3. Under **Redirect URLs**, add: `https://nds-maintenance-abc123.vercel.app/**`
4. Click **Save**

> ⚠️ If you skip this step, magic link emails will redirect to `localhost` instead of your live site.

---

## Step 7: Create the First User (AST Lead)

1. In Supabase, go to **Authentication → Users**
2. Click **Invite user** and enter the AST lead's email
3. They'll receive an email — they click the link and are signed in
4. Go to **Table Editor → profiles**, find their record and set `role` to `ast_lead`

From that point on, the AST lead can invite other users from inside the app under **People**.

### Setting a password (optional but useful for dev)

If you want to log in without waiting for a magic link email:

1. In Supabase → **Authentication → Users** → click your user
2. Click **Send password recovery**
3. Set a password via the emailed link
4. On the login page, click **"Sign in with password"**

---

## Step 8: Add More Users

From inside the app:
1. Sign in as an AST lead
2. Go to **People**
3. Invite volunteers and owners by email — they'll receive a magic link

---

## Public Report Form

The public report form (no login required) is at:

```
https://your-app.vercel.app/report/overstone
```

Anyone can submit a maintenance issue — ideal for a QR code on a laminated card in each building. After submitting, they'll be prompted to add photos.

---

## Troubleshooting

**Magic link goes to localhost instead of the live site**
→ You haven't updated the Site URL and Redirect URLs in Supabase (Step 6e). Fix those and send a new magic link.

**404 on `/auth/callback` after clicking magic link**
→ The callback route exists at `app/auth/callback/route.ts`. If you're seeing this, check that your Vercel deployment includes that file and redeploy.

**"Database error saving new user" on first sign-in**
→ Migrations haven't been run, or the `handle_new_user` trigger failed. Run migrations 001–004 in the Supabase SQL Editor. If already run, re-run just the trigger function from `DEV_NOTES.md`.

**"Invalid UUID" when submitting a task or report**
→ This is a known Zod v4 issue — already fixed in the codebase. If you see it, check `lib/actions/tasks.ts` uses the permissive `uuidSchema` regex (not `z.string().uuid()`).

**Blank page after sign-in**
→ The `profiles` table is missing a record for your user. The trigger should create one automatically. If not, insert manually in Supabase Table Editor: `profiles` → **Insert row** with your user's `id` (from the `auth.users` table), an email, a name, and role `volunteer`.

**RLS errors in the browser console**
→ The user's `role` in the `profiles` table is wrong or missing. Check it in **Table Editor → profiles**.

**Photos not uploading**
→ Make sure migration 004 has been run (creates the `task_attachments` table and `task-photos` storage bucket). Check **Storage** in the Supabase dashboard — the `task-photos` bucket should exist.

**Build fails on Vercel**
→ Check the build logs. The most common cause is a missing environment variable. Make sure all 5 variables from Step 6c are set.
