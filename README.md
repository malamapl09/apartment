# ResidenceHub

Smart apartment building management platform with multi-building support, built with Next.js, Supabase, and Vercel.

ResidenceHub provides building administrators with a complete toolset for managing apartments, residents, common spaces, maintenance, finances, and communications -- while giving owners and residents a self-service portal for their daily needs.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Security](#security)
- [Documentation](#documentation)
- [License](#license)

---

## Key Features

### Super Admin

- Multi-building management dashboard
- Create buildings and invite administrators
- View all buildings with user and admin statistics

### Building Admin

- **Dashboard** -- KPIs (apartments, owners, reservations, payments) and analytics charts (collection rate, occupancy, maintenance trends, visitor stats)
- **Apartments** -- Full CRUD for apartment units
- **Owners and Residents** -- Directory management with email invitations
- **Common Spaces** -- Amenity management (gym, pool, meeting rooms, etc.) with availability schedules, blackout dates, and photos
- **Reservations** -- Booking management with payment verification
- **Maintenance** -- Request tracking with status updates, comments, and internal notes
- **Visitors** -- Visitor management with auto-generated access codes
- **Packages** -- Package delivery tracking and notifications
- **Announcements** -- Targeted messaging (all, owners, residents)
- **Polls and Surveys** -- Single choice, multiple choice, yes/no question types with anonymous voting option
- **Documents** -- Management of rules, minutes, contracts, notices, and forms with versioning support
- **Fees and Payments** -- Fee type configuration, bulk charge generation, and payment recording
- **Audit Log** -- Complete logging of all system changes
- **Reports** -- Report generation with export capabilities
- **Settings** -- Building configuration (general info, bank account, timezone, payment deadline)

### Owner and Resident Portal

- **Dashboard** -- Apartment info, upcoming reservations, and announcements at a glance
- **Common Spaces** -- Browse and book spaces using a calendar and time slot picker
- **Maintenance** -- Create and track requests with photo attachments
- **Visitors** -- Register visitors with auto-generated access codes and recurring visit support
- **Documents** -- Access building documents
- **Polls** -- Vote on active polls and view results
- **Fees and Payments** -- Track charges, view payment history, and upload payment proofs
- **Profile** -- Manage personal info, password, avatar, and email notification preferences

### Platform Features

- **Real-time Updates** -- Supabase Realtime subscriptions for live data
- **Email Notifications** -- Transactional emails for charges, maintenance updates, announcements, overdue reminders, visitor check-ins, and package arrivals
- **Automated Cron Jobs** -- Daily overdue charge detection and reservation auto-cancellation
- **Global Search** -- Cmd+K command palette searching across all entities
- **PWA Support** -- Installable app with offline fallback
- **Internationalization** -- Full English and Spanish translations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Email | Resend + React Email |
| i18n | next-intl (EN, ES) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Deployment | Vercel |
| Testing | Vitest |

---

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (or local Supabase CLI)
- Resend account (for emails)

---

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd apartament
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in the required values:

```env
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-side only)
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=                  # Resend API key for emails
CRON_SECRET=                     # Secret for cron job authentication
```

### 3. Database Setup

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Seed demo data (optional)
npx supabase db reset
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Initial Setup

Navigate to [http://localhost:3000/setup](http://localhost:3000/setup) to create the first super admin account and building.

---

## Available Scripts

```
npm run dev            # Start development server
npm run build          # Production build
npm run start          # Start production server
npm run lint           # Run ESLint
npm run test           # Run tests (Vitest)
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

---

## Project Structure

```
apartament/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (auth, cron jobs)
│   └── [locale]/               # i18n routes
│       ├── (auth)/             # Login, forgot password, set password
│       ├── (dashboard)/        # Protected routes
│       │   ├── admin/          # Admin panel (28 pages)
│       │   └── portal/         # Owner/resident portal (18 pages)
│       ├── (setup)/            # First-time setup wizard
│       └── (super-admin)/      # Multi-building management
├── components/                 # React components
│   ├── admin/                  # Admin-specific (41 components)
│   ├── portal/                 # Portal-specific (19 components)
│   ├── layout/                 # Sidebar, header, navigation
│   ├── super-admin/            # Super admin components
│   ├── setup/                  # Setup wizard
│   ├── shared/                 # Shared components
│   └── ui/                     # shadcn/ui components (30)
├── lib/                        # Core logic
│   ├── actions/                # Server actions (35+ files)
│   ├── supabase/               # Supabase clients (server, client, admin)
│   ├── email/                  # Email templates and sending
│   ├── hooks/                  # Custom React hooks (realtime)
│   └── utils/                  # Utilities (currency, date, ICS)
├── types/                      # TypeScript types
├── messages/                   # i18n translations (en/, es/)
├── supabase/                   # Migrations and seed data
│   └── migrations/             # 17 SQL migration files
├── docs/                       # Documentation
└── public/                     # Static assets
```

---

## Security

- **Row-Level Security (RLS)** on every table
- **Building-based multi-tenancy** isolation between buildings
- **JWT custom claims** for building_id and user_role
- **UUID validation** on all ID parameters
- **Zod validation** on all server action inputs
- **Role-based access control** with four roles: super_admin, admin, owner, resident
- **Generic auth error messages** to prevent user enumeration
- **Invite-only auth model** with no public registration

---

## Documentation

See the `docs/` directory for detailed documentation:

- [Architecture](docs/architecture.md) -- System design, database schema, RLS policies
- [Features](docs/features.md) -- Complete feature reference
- [Development](docs/development.md) -- Local setup, migrations, i18n workflow
- [Deployment](docs/deployment.md) -- Vercel and Supabase configuration

---

## License

Private
