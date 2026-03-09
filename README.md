# NDS Maintenance Tracker

A Next.js application for the NDS Asset Support Team to log, track, and manage maintenance tasks across Overstone properties.

Built with **Next.js 16**, **Supabase** (auth + database), **Tailwind CSS**, and **shadcn/ui**.

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)
- A [Supabase](https://supabase.com) project (see [SETUP.md](./SETUP.md) for how to create one)
- Git

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd NDSASTManagementSystem
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Then open `.env.local` and replace the placeholder values with the real ones from your Supabase project (**Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NDS Maintenance
```

> **Never commit `.env.local`** — it is already listed in `.gitignore`.

### 4. Run the database migrations

If you haven't set up the database yet, run the SQL migration files in order via the **Supabase SQL Editor**:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_seed_data.sql`

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
NDSASTManagementSystem/
├── app/                  # Next.js App Router pages and layouts
│   ├── (app)/            # Authenticated app routes
│   ├── (auth)/           # Login / magic link routes
│   └── report/           # Public report form (no login required)
├── components/           # Shared UI components
├── lib/                  # Supabase client, utilities
├── supabase/
│   └── migrations/       # SQL migration files
└── .env.example          # Environment variable template
```

---

## Full Setup & Deployment

See [SETUP.md](./SETUP.md) for complete instructions including:
- Creating and configuring the Supabase project
- Setting up authentication (magic links)
- Deploying to Vercel
- Creating the first user / AST Lead
