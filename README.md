# ResidenceHub

Smart apartment building management platform built with Next.js, Supabase, and Vercel.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database & Auth:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling:** Tailwind CSS + shadcn/ui
- **i18n:** next-intl (English & Spanish)
- **Email:** Resend + React Email
- **Charts:** Recharts
- **Deployment:** Vercel

## Features

### Admin Panel (`/admin`)
- **Dashboard** — Analytics charts (collection rates, maintenance trends, occupancy, visitors)
- **Apartments** — Unit management with owner assignments
- **Owners** — Resident directory and profiles
- **Spaces** — Common area management and reservations
- **Fees & Payments** — Charge generation, payment tracking, overdue automation
- **Maintenance** — Request management with real-time updates
- **Visitors** — Visitor log with check-in/check-out tracking
- **Packages** — Package/delivery logging and notification
- **Polls & Voting** — Create polls (single/multiple choice), publish results
- **Announcements** — Building-wide announcements with email notifications
- **Documents** — Shared document management
- **Reports** — Financial and maintenance reports with CSV export
- **Audit Trail** — Activity log with filters by user, action, date range
- **Settings** — Building configuration

### Owner Portal (`/portal`)
- **Dashboard** — Summary cards (pending charges, maintenance, visitors, packages)
- **Pending Payments** — View and pay charges
- **Maintenance** — Submit and track maintenance requests
- **Visitors** — Register expected visitors
- **Packages** — View received packages
- **Polls** — Vote on active polls, view results
- **Spaces** — Reserve common areas
- **Documents** — Access shared documents
- **Announcements** — Read building announcements
- **Profile** — Update personal info and email notification preferences

### Platform Features
- **Real-time Updates** — Supabase Realtime subscriptions for live data
- **Email Notifications** — Transactional emails for charges, maintenance updates, announcements, overdue reminders, visitor check-ins, package arrivals
- **Automated Cron Jobs** — Daily overdue charge detection, reservation auto-cancellation
- **Global Search** — Cmd+K command palette searching across all entities
- **PWA Support** — Installable app with offline fallback
- **Role-Based Access** — super_admin, admin, owner, resident roles with RLS
- **i18n** — Full English and Spanish translations

## Getting Started

```bash
npm install
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (email)
RESEND_API_KEY=

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

### Database Migrations

Migrations are in `supabase/migrations/`. Apply them with:

```bash
npx supabase db push
```

## Project Structure

```
app/
  [locale]/
    (dashboard)/
      admin/          # Admin panel pages
      portal/         # Owner portal pages
  api/
    auth/             # Auth callbacks
    cron/             # Cron job endpoints
components/
  admin/              # Admin-specific components
  portal/             # Portal-specific components
  shared/             # Shared components (command palette, PWA)
  layout/             # Sidebar, header
  ui/                 # shadcn/ui primitives
lib/
  actions/            # Server actions
  email/              # Email templates and sending
  hooks/              # Real-time subscription hooks
  supabase/           # Supabase client utilities
messages/
  en/                 # English translations
  es/                 # Spanish translations
supabase/
  migrations/         # SQL migration files
types/                # TypeScript type definitions
```

## Deployment

Deployed on Vercel with automatic builds from `main`. Cron jobs configured in `vercel.json`.
