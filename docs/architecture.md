# ResidenceHub -- Architecture Document

**Version:** 1.0
**Last Updated:** 2026-03-10
**Status:** Living document -- updated as the system evolves

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Multi-Tenancy Model](#4-multi-tenancy-model)
5. [Authentication and Authorization](#5-authentication-and-authorization)
6. [Route Architecture](#6-route-architecture)
7. [Database Schema](#7-database-schema)
8. [Row-Level Security (RLS)](#8-row-level-security-rls)
9. [Supabase Client Architecture](#9-supabase-client-architecture)
10. [Server Action Patterns](#10-server-action-patterns)
11. [Real-Time Subscriptions](#11-real-time-subscriptions)
12. [Storage Architecture](#12-storage-architecture)
13. [Email System](#13-email-system)
14. [Cron Jobs and Background Processing](#14-cron-jobs-and-background-processing)
15. [Internationalization (i18n)](#15-internationalization-i18n)
16. [Audit Logging](#16-audit-logging)
17. [Security Model](#17-security-model)
18. [Deployment Architecture](#18-deployment-architecture)
19. [Performance Considerations](#19-performance-considerations)
20. [Appendices](#20-appendices)

---

## 1. Executive Summary

ResidenceHub is a multi-tenant apartment building management platform designed for the Dominican Republic market. It provides building administrators with tools to manage apartments, residents, finances, maintenance, amenity reservations, visitor access, polls, and document distribution. Residents and owners interact through a self-service portal.

The platform is built on Next.js 16 (App Router) deployed to Vercel, with Supabase providing the database (PostgreSQL), authentication, file storage, and real-time capabilities. Tenant isolation is enforced at the database level through PostgreSQL Row-Level Security (RLS), ensuring that users within one building can never access data belonging to another building.

Key architectural decisions:

- **Database-level tenant isolation** via RLS rather than application-level filtering, eliminating an entire class of data-leak bugs.
- **Invite-only user registration** to prevent unauthorized access to building data.
- **JWT claim injection** via a custom Supabase auth hook to avoid per-query profile lookups in RLS policies.
- **Server Actions** as the primary data mutation layer, with Zod validation and consistent error handling patterns.
- **Service-role admin client** reserved for privileged operations (setup, user creation, cross-tenant super-admin actions) that must bypass RLS.

---

## 2. System Overview

### High-Level Architecture

```
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|  Browser Client   | <---> |  Vercel Edge +    | <---> |  Supabase         |
|  (React 19)       |       |  Next.js 16       |       |  (PostgreSQL,     |
|                   |       |  Server Actions    |       |   Auth, Storage,  |
|                   |       |  API Routes        |       |   Realtime)       |
+-------------------+       +-------------------+       +-------------------+
                                     |
                                     v
                            +-------------------+
                            |  Resend           |
                            |  (Email delivery) |
                            +-------------------+
```

### Component Boundaries

| Layer | Responsibility | Technology |
|-------|---------------|------------|
| Presentation | UI rendering, client-side state, real-time subscriptions | React 19, shadcn/ui, Tailwind CSS v4 |
| Routing + Middleware | Locale resolution, session refresh, route protection | Next.js App Router, next-intl |
| Business Logic | Input validation, authorization, data mutations | Server Actions, Zod |
| Data Access | Query building, RLS enforcement, file storage | Supabase client SDK |
| Database | Schema, RLS policies, triggers, functions | PostgreSQL (Supabase) |
| Infrastructure | Hosting, CDN, cron scheduling | Vercel |
| Notifications | Transactional email delivery | Resend, React Email |

---

## 3. Technology Stack

### Core Runtime

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16 | Full-stack React framework (App Router) |
| React | 19 | UI rendering with Server Components and Suspense |
| TypeScript | 5 | Type safety across the entire codebase |
| Node.js | 22+ | Server-side runtime (Vercel serverless functions) |

### Backend Services

| Service | Purpose |
|---------|---------|
| Supabase (PostgreSQL) | Primary database with RLS-based multi-tenancy |
| Supabase Auth | User authentication, session management, JWT issuance |
| Supabase Storage | File uploads (photos, documents, payment proofs) |
| Supabase Realtime | WebSocket-based change data capture for live UI updates |
| Resend | Transactional email delivery |
| Vercel | Hosting, serverless functions, cron job scheduling |

### Frontend Libraries

| Library | Purpose |
|---------|---------|
| shadcn/ui (new-york style) | Component library (in `components/ui/`) |
| Tailwind CSS v4 | Utility-first CSS (configured via `@theme` in `app/globals.css`) |
| next-themes | Dark mode support |
| next-intl | Internationalization (English + Spanish) |
| Zod | Runtime schema validation |
| sonner | Toast notifications |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Vitest | Unit and integration testing |
| Supabase CLI | Local development, migrations |

---

## 4. Multi-Tenancy Model

ResidenceHub uses a **shared-database, shared-schema** multi-tenancy model with row-level isolation. Every tenant is a building, and every data table includes a `building_id` foreign key that identifies which building owns the row.

### Isolation Mechanism

Tenant isolation is enforced at the PostgreSQL level through Row-Level Security (RLS). This means that even if application code contains a bug that fails to filter by `building_id`, the database will refuse to return rows belonging to other tenants.

Two `SECURITY DEFINER` helper functions power the RLS policies:

```sql
-- Returns the authenticated user's building_id from the profiles table
CREATE OR REPLACE FUNCTION public.get_my_building_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$ SELECT building_id FROM public.profiles WHERE id = auth.uid() $$;

-- Returns the authenticated user's role from the profiles table
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;
```

These functions are marked `SECURITY DEFINER` so they execute with the function owner's privileges, allowing them to query the `profiles` table regardless of the caller's RLS context. The `SET search_path = ''` clause prevents search-path hijacking attacks.

### JWT Claim Injection

To avoid repeated profile lookups on every RLS policy evaluation, a custom Supabase auth hook injects `building_id` and `user_role` directly into the JWT:

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_building_id uuid;
  user_role text;
BEGIN
  claims := event->'claims';
  SELECT p.building_id, p.role INTO user_building_id, user_role
  FROM public.profiles p WHERE p.id = (event->>'user_id')::uuid;
  IF user_building_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{building_id}', to_jsonb(user_building_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

This hook is registered in the Supabase dashboard under Authentication > Hooks. Permissions are tightly scoped: only `supabase_auth_admin` can execute it; `authenticated`, `anon`, and `public` roles are explicitly denied.

### Tenant Lifecycle

1. **Creation**: The first building is created atomically during the setup wizard. Subsequent buildings can be created by super admins.
2. **User binding**: Every user profile is linked to exactly one `building_id`. This binding is immutable at the RLS level (see Section 8).
3. **Cross-tenant access**: Only super admins can operate across buildings, and they do so through the service-role admin client which bypasses RLS entirely.

---

## 5. Authentication and Authorization

### Authentication Flow

ResidenceHub uses Supabase Auth with email/password credentials. There is no social login or magic-link authentication.

#### Initial Setup (First User)

1. User navigates to the application root (`/`).
2. The root page calls `has_any_buildings()` RPC. If no buildings exist, user is redirected to `/setup`.
3. The setup wizard collects: email, password, full name, building name, address, total units, timezone.
4. `completeSetup()` server action executes atomically via the admin client:
   - Creates an `auth.users` entry with `email_confirm: true` (skips verification).
   - Creates a `buildings` row.
   - Creates a `profiles` row with `role: super_admin`.
   - Creates default `email_preferences`.
   - Signs the user in automatically.
   - On any failure, previously created resources are cleaned up (manual rollback).
5. The `has_any_buildings()` function is `SECURITY DEFINER` and callable by `anon`, allowing unauthenticated users to check if setup is needed.

**Race condition guard**: `completeSetup()` re-checks `has_any_buildings()` before proceeding, preventing a TOCTOU race if two users attempt setup simultaneously.

#### User Invitation

All subsequent users are created through admin invitation. There is no public registration form.

1. Admin calls `inviteOwner()` server action with the user's email, name, and target apartment.
2. The action uses `adminClient.auth.admin.inviteUserByEmail()` to create the auth user and send an invitation email.
3. A `profiles` row and `apartment_owners` link are created atomically.
4. The invited user receives an email with a link to `/set-password`, where they set their password.
5. On any failure during the multi-step creation, previously created resources are cleaned up.

#### Login

Standard email/password login via `supabase.auth.signInWithPassword()`. The login action returns a generic error message ("Invalid email or password") regardless of whether the email exists, preventing user enumeration (OWASP A07:2021).

#### Password Reset

1. User submits email on `/forgot-password`.
2. `forgotPassword()` calls `supabase.auth.resetPasswordForEmail()` with a redirect to `/set-password`.
3. The response always indicates success, even if the email does not exist (anti-enumeration).
4. User clicks the email link, arrives at `/set-password`, and sets a new password via `supabase.auth.updateUser()`.

#### Session Management

Sessions are managed through HTTP-only cookies set by the Supabase SSR client library. The middleware pipeline refreshes the session on every request:

```
Request
  -> next-intl middleware (locale resolution)
  -> updateSession() (Supabase cookie refresh + user extraction)
  -> Route protection logic
  -> Response (with merged cookies from both middleware layers)
```

### Authorization Model

Authorization is role-based with four tiers:

| Role | Scope | Capabilities |
|------|-------|-------------|
| `super_admin` | All buildings | Full platform management, building CRUD, cross-tenant visibility |
| `admin` | Single building | Building settings, user management, all feature administration |
| `owner` | Single building | Portal access, reservations, maintenance requests, visitor management |
| `resident` | Single building | Portal access, same capabilities as owner |

#### Enforcement Points

Authorization is enforced at three levels:

1. **Database (RLS)**: Tenant isolation and role-based write access are enforced by PostgreSQL policies. This is the primary security boundary.

2. **Server Actions**: Every mutation begins with an auth check via `getAuthProfile()` or `getAdminProfile()` from `lib/actions/helpers.ts`. These functions verify both authentication and role:

   ```typescript
   export async function getAdminProfile() {
     const result = await getAuthProfile();
     if (result.error || !result.profile) return result;
     if (!["admin", "super_admin"].includes(result.profile.role)) {
       return { error: "Unauthorized", supabase: result.supabase, user: null, profile: null };
     }
     return result;
   }
   ```

3. **Layout Guards**: Role-based route protection is enforced in layout components, not middleware:
   - `app/[locale]/(dashboard)/layout.tsx` -- Requires authenticated user.
   - `app/[locale]/(dashboard)/admin/layout.tsx` -- Requires `admin` or `super_admin` role.
   - `app/[locale]/(super-admin)/layout.tsx` -- Requires `super_admin` role.

   Middleware only handles the coarse-grained authenticated-vs-unauthenticated distinction.

---

## 6. Route Architecture

### Directory Structure

```
app/
  [locale]/                          # Dynamic locale segment (en, es)
    (auth)/                          # Public authentication routes
      login/page.tsx
      forgot-password/page.tsx
      set-password/page.tsx
    (setup)/                         # First-time setup wizard
      setup/page.tsx
    (dashboard)/                     # Protected routes (all authenticated users)
      layout.tsx                     # Auth guard
      admin/                         # Admin panel
        layout.tsx                   # Admin role guard
        page.tsx                     # Admin dashboard
        apartments/                  # CRUD for apartments
        users/                       # User invitation and management
        reservations/                # Reservation management + payment verification
        spaces/                      # Public space configuration
        announcements/               # Building announcements
        documents/                   # Document management
        maintenance/                 # Maintenance request management
        visitors/                    # Visitor access management
        fees/                        # Fee type configuration
        charges/                     # Charge generation and tracking
        payments/                    # Payment recording
        packages/                    # Package reception tracking
        polls/                       # Poll creation and management
        settings/                    # Building settings
        audit/                       # Audit log viewer
        reports/                     # Financial and occupancy reports
      portal/                        # Owner/resident portal
        page.tsx                     # Portal dashboard
        reservations/                # View and create reservations
        maintenance/                 # Submit and track maintenance requests
        visitors/                    # Register visitors, generate access codes
        announcements/               # View building announcements
        documents/                   # View and download documents
        charges/                     # View charges and payment status
        packages/                    # View package notifications
        polls/                       # Participate in polls
        profile/                     # Edit own profile
        notifications/               # Notification center
    (super-admin)/                   # Super admin panel
      layout.tsx                     # Super admin role guard
      super-admin/page.tsx           # Cross-building management
    page.tsx                         # Root: role-based redirect dispatcher
    layout.tsx                       # Root layout (providers, fonts)
    error.tsx                        # Global error boundary
    not-found.tsx                    # 404 page
  api/
    auth/callback/                   # Supabase auth callback handler
    cron/
      auto-cancel/route.ts          # Reservation auto-cancellation
      overdue-charges/route.ts       # Charge overdue marking
```

### Middleware Pipeline

The middleware (`middleware.ts`) processes every request that matches `/((?!api|trpc|_next|_vercel|.*\\..*).*)`:

1. **Locale resolution**: `next-intl` middleware determines the locale from the URL prefix, cookies, or `Accept-Language` header. The `localePrefix: "as-needed"` setting means the default locale (`en`) does not require a URL prefix.

2. **Session refresh**: `updateSession()` creates a Supabase server client scoped to the request, calls `supabase.auth.getUser()` to validate and refresh the session, and writes updated cookies to the response.

3. **Route protection**:
   - Unauthenticated users accessing dashboard routes (`/admin/*`, `/portal/*`, `/super-admin/*`) are redirected to `/login`.
   - Authenticated users accessing auth routes (`/login`, `/forgot-password`, `/set-password`, `/setup`) are redirected to `/`.
   - The root path (`/`) is excluded from the unauthenticated redirect to allow the root page component to handle its own redirect logic.

4. **Cookie merging**: Supabase sets session cookies on its response. These cookies are merged into the `next-intl` response so both middleware layers' effects are preserved in the final response.

### Root Page Routing

The root page (`app/[locale]/page.tsx`) acts as a role-based redirect dispatcher:

1. Calls `checkBuildingsExist()` -- if no buildings, redirects to `/setup`.
2. Checks `supabase.auth.getUser()` -- if unauthenticated, redirects to `/login`.
3. Fetches the user's profile role:
   - `super_admin` -> `/super-admin`
   - `admin` -> `/admin`
   - `owner` or `resident` -> `/portal`

### Next.js 16 Params Pattern

All page components receive `params` as a Promise (a Next.js 16 requirement):

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  // ...
}
```

---

## 7. Database Schema

The database consists of 22 tables organized into functional domains. All tables use UUID primary keys generated by `gen_random_uuid()`. Timestamps use `timestamptz` and default to `now()`. Tables with mutable data have `updated_at` columns maintained by the `set_updated_at()` trigger function.

### Entity Relationship Overview

```
buildings (1) ---< profiles (N)
buildings (1) ---< apartments (N)
buildings (1) ---< public_spaces (N)
buildings (1) ---< reservations (N)
buildings (1) ---< announcements (N)
buildings (1) ---< documents (N)
buildings (1) ---< maintenance_requests (N)
buildings (1) ---< visitors (N)
buildings (1) ---< fee_types (N)
buildings (1) ---< charges (N)
buildings (1) ---< payments (N)
buildings (1) ---< packages (N)
buildings (1) ---< polls (N)
buildings (1) ---< audit_logs (N)

apartments (1) ---< apartment_owners (N) >--- profiles (1)
apartments (1) ---< maintenance_requests (N)
apartments (1) ---< visitors (N)
apartments (1) ---< charges (N)
apartments (1) ---< packages (N)

public_spaces (1) ---< availability_schedules (N)
public_spaces (1) ---< blackout_dates (N)
public_spaces (1) ---< reservations (N)

profiles (1) ---< notifications (N)
profiles (1) ---< email_preferences (1)

fee_types (1) ---< charges (N)
charges (1) ---< payments (N)

polls (1) ---< poll_options (N)
polls (1) ---< poll_votes (N)
poll_options (1) ---< poll_votes (N)

maintenance_requests (1) ---< maintenance_comments (N)
```

### Core Tables

#### buildings

The root entity for multi-tenancy. Every other table references back to a building directly or transitively.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | text | NOT NULL | Display name |
| address | text | | Physical address |
| total_units | integer | | Expected unit count |
| bank_account_info | jsonb | | `{bank_name, account_number, account_type, holder_name}` |
| payment_deadline_hours | integer | DEFAULT 48 | Hours to submit payment proof for reservations |
| timezone | text | DEFAULT 'America/Santo_Domingo' | Building's local timezone |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | Auto-updated via trigger |

#### profiles

Extends `auth.users` with application-specific data. The `id` is a foreign key to `auth.users(id)` with `ON DELETE CASCADE`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, FK -> auth.users(id) CASCADE | Matches Supabase auth user ID |
| building_id | uuid | NOT NULL, FK -> buildings(id) | Tenant binding (immutable via RLS) |
| role | text | NOT NULL, CHECK IN ('super_admin', 'admin', 'owner', 'resident') | Authorization tier |
| full_name | text | NOT NULL | |
| email | text | NOT NULL | |
| phone | text | | |
| national_id | text | | Dominican cedula or passport |
| emergency_contact | jsonb | | `{name, phone}` |
| avatar_url | text | | Storage bucket URL |
| preferred_locale | text | DEFAULT 'es' | 'en' or 'es' |
| is_active | boolean | DEFAULT true | Soft-delete flag |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | Auto-updated via trigger |

**Indexes**: `idx_profiles_building(building_id)`, `idx_profiles_role(building_id, role)`

#### apartments

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| unit_number | text | NOT NULL, UNIQUE(building_id, unit_number) | Display identifier |
| floor | integer | | |
| area_sqm | numeric(8,2) | | |
| bedrooms | integer | | |
| bathrooms | integer | | |
| status | text | DEFAULT 'vacant', CHECK IN ('occupied', 'vacant') | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**: `idx_apartments_building(building_id)`

#### apartment_owners

Junction table linking apartments to profiles (many-to-many). An apartment can have multiple owners (primary and secondary). An owner can own multiple apartments.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| apartment_id | uuid | NOT NULL, FK -> apartments(id) CASCADE | |
| profile_id | uuid | NOT NULL, FK -> profiles(id) CASCADE | |
| is_primary | boolean | DEFAULT true | Primary contact flag |
| move_in_date | date | | |
| move_out_date | date | | |
| | | UNIQUE(apartment_id, profile_id) | |

### Amenity Reservation Tables

#### public_spaces

Configurable amenity spaces with scheduling rules, pricing, and quiet-hour enforcement.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| name | text | NOT NULL | e.g., "Rooftop Terrace", "Party Room" |
| description | text | | |
| capacity | integer | | Maximum occupancy |
| photos | text[] | | Array of storage URLs |
| hourly_rate | numeric(10,2) | DEFAULT 0 | Reservation cost per hour |
| deposit_amount | numeric(10,2) | DEFAULT 0 | Refundable deposit |
| requires_approval | boolean | DEFAULT false | Admin must approve reservations |
| min_advance_hours | integer | DEFAULT 24 | Minimum booking lead time |
| max_advance_days | integer | DEFAULT 30 | Maximum booking horizon |
| max_duration_hours | integer | DEFAULT 8 | Maximum reservation length |
| max_monthly_per_owner | integer | DEFAULT 4 | Rate-limiting per user |
| gap_minutes | integer | DEFAULT 60 | Buffer between reservations |
| quiet_hours_start | time | | |
| quiet_hours_end | time | | |
| cancellation_hours | integer | DEFAULT 24 | Free cancellation window |
| is_active | boolean | DEFAULT true | Soft-delete flag |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

#### availability_schedules

Weekly recurring availability windows for each space. One entry per day of week per space.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| space_id | uuid | NOT NULL, FK -> public_spaces(id) CASCADE | |
| day_of_week | integer | NOT NULL, CHECK 0-6 | 0 = Sunday, 6 = Saturday |
| start_time | time | NOT NULL | |
| end_time | time | NOT NULL | |
| | | UNIQUE(space_id, day_of_week) | |

#### blackout_dates

Override dates when a space is unavailable (holidays, maintenance, etc.).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| space_id | uuid | NOT NULL, FK -> public_spaces(id) CASCADE | |
| date | date | NOT NULL, UNIQUE(space_id, date) | |
| reason | text | | |

#### reservations

Tracks the full lifecycle of a space reservation, from creation through payment verification to completion.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| space_id | uuid | NOT NULL, FK -> public_spaces(id) | |
| user_id | uuid | NOT NULL, FK -> profiles(id) | Reservation creator |
| start_time | timestamptz | NOT NULL | |
| end_time | timestamptz | NOT NULL | |
| status | text | NOT NULL, DEFAULT 'pending_payment' | See status machine below |
| reference_code | text | UNIQUE, NOT NULL | Auto-generated 'RH-YYYY-XXXX' |
| payment_amount | numeric(10,2) | | Total cost |
| payment_proof_url | text | | Storage URL for uploaded receipt |
| payment_verified_by | uuid | FK -> profiles(id) | Admin who verified payment |
| payment_verified_at | timestamptz | | |
| payment_rejected_reason | text | | |
| payment_deadline | timestamptz | | Auto-cancel if payment not submitted |
| cancellation_reason | text | | |
| cancelled_by | uuid | FK -> profiles(id) | |
| notes | text | | |
| version | integer | DEFAULT 1 | Optimistic concurrency control |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Reservation Status Machine:**

```
pending_payment --> payment_submitted --> confirmed --> completed
       |                   |                  |
       v                   v                  v
   cancelled           rejected           cancelled
                           |
                           v
                    pending_payment (resubmit)
```

- `pending_payment`: Created, awaiting payment proof upload. Auto-cancelled if deadline passes.
- `payment_submitted`: Owner uploaded proof, awaiting admin verification.
- `confirmed`: Admin verified payment. Reservation is active.
- `completed`: Past end time. Set by system.
- `cancelled`: Cancelled by user or auto-cancelled by cron.
- `rejected`: Admin rejected payment proof. Can transition back to pending_payment.

**Indexes**: `idx_reservations_space_time(space_id, start_time, end_time)`, `idx_reservations_building_status(building_id, status)`, `idx_reservations_user(user_id, status)`, `idx_reservations_deadline(payment_deadline) WHERE status = 'pending_payment'`

### Financial Tables

#### fee_types

Building-specific fee categories. These define the kinds of charges that can be generated.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| name | text | NOT NULL | e.g., "Monthly Maintenance" |
| category | text | | maintenance_fee, common_area, parking, special_assessment, other |
| default_amount | numeric | NOT NULL | |
| is_recurring | boolean | NOT NULL | |
| description | text | | |
| is_active | boolean | DEFAULT true | |

#### charges

Individual charges assigned to apartments for specific billing periods.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| apartment_id | uuid | NOT NULL, FK -> apartments(id) | |
| fee_type_id | uuid | NOT NULL, FK -> fee_types(id) | |
| amount | numeric | NOT NULL | |
| due_date | date | NOT NULL | |
| period_month | integer | 1-12 | |
| period_year | integer | | |
| status | text | | pending, paid, overdue, partial |
| | | UNIQUE(apartment_id, fee_type_id, period_month, period_year) | Prevents duplicate charges |

#### payments

Records of payments made against charges.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| charge_id | uuid | NOT NULL, FK -> charges(id) | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| apartment_id | uuid | NOT NULL, FK -> apartments(id) | |
| amount | numeric | NOT NULL | |
| payment_date | date | NOT NULL | |
| payment_method | text | | bank_transfer, cash, check, other |
| reference_number | text | | Bank reference or receipt number |
| proof_url | text | | Storage URL |
| recorded_by | uuid | NOT NULL, FK -> profiles(id) | Admin who recorded the payment |

### Maintenance Tables

#### maintenance_requests

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| apartment_id | uuid | NOT NULL, FK -> apartments(id) | |
| requested_by | uuid | NOT NULL, FK -> profiles(id) | |
| title | text | NOT NULL | Short description |
| description | text | NOT NULL | Detailed explanation |
| category | text | | plumbing, electrical, hvac, structural, pest_control, general |
| priority | text | | low, medium, high, urgent |
| status | text | | open, in_progress, waiting_parts, resolved, closed |
| photos | text[] | | Storage URLs |
| assigned_to | text | | Free-text (external contractor name) |
| reference_code | text | UNIQUE | Auto-generated 'MR-YYYY-XXXX' |

#### maintenance_comments

Threaded comments on maintenance requests. Supports internal (admin-only) comments.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| request_id | uuid | NOT NULL, FK -> maintenance_requests(id) CASCADE | |
| user_id | uuid | NOT NULL, FK -> profiles(id) | |
| body | text | NOT NULL | |
| is_internal | boolean | DEFAULT false | True = visible only to admins |

### Communication Tables

#### announcements

Building-wide announcements with audience targeting.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| title | text | NOT NULL | |
| body | text | NOT NULL | |
| target | text | DEFAULT 'all' | all, owners, residents |
| created_by | uuid | FK -> profiles(id) | |
| published_at | timestamptz | DEFAULT now() | |
| expires_at | timestamptz | | Auto-hide after this time |

#### notifications

In-app notification inbox. Supports typed notifications with arbitrary metadata.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| user_id | uuid | NOT NULL, FK -> profiles(id) CASCADE | |
| type | text | NOT NULL | Notification category |
| title | text | NOT NULL | |
| body | text | | |
| data | jsonb | | Arbitrary metadata (links, IDs, etc.) |
| read_at | timestamptz | | NULL = unread |
| created_at | timestamptz | DEFAULT now() | |

**Index**: `idx_notifications_user(user_id, read_at)`

#### polls

Community polls with configurable voting types and anonymity.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| title | text | NOT NULL | |
| description | text | | |
| poll_type | text | | single_choice, multiple_choice, yes_no |
| target | text | | all, owners, residents |
| created_by | uuid | FK -> profiles(id) | |
| starts_at | timestamptz | | |
| ends_at | timestamptz | | |
| is_anonymous | boolean | DEFAULT false | |
| status | text | | draft, active, closed |

#### poll_options / poll_votes

| Table | Key Columns | Constraints |
|-------|------------|-------------|
| poll_options | id, poll_id (FK CASCADE), label, sort_order | |
| poll_votes | id, poll_id (FK CASCADE), option_id (FK CASCADE), user_id (FK), apartment_id (FK) | UNIQUE(poll_id, user_id, option_id) |

### Visitor Management Tables

#### visitors

Pre-registered visitor entries with auto-generated access codes.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| apartment_id | uuid | NOT NULL, FK -> apartments(id) | |
| registered_by | uuid | NOT NULL, FK -> profiles(id) | |
| visitor_name | text | NOT NULL | |
| visitor_id_number | text | | |
| visitor_phone | text | | |
| vehicle_plate | text | | |
| vehicle_description | text | | |
| purpose | text | | |
| access_code | text | UNIQUE | Auto-generated 8-char hex |
| valid_from | timestamptz | NOT NULL | |
| valid_until | timestamptz | NOT NULL | |
| is_recurring | boolean | DEFAULT false | |
| recurrence_pattern | text | | daily, weekly, monthly |
| recurrence_end_date | date | | |
| status | text | | expected, checked_in, checked_out, expired, cancelled |

### Document Management

#### documents

Versioned document distribution with audience targeting.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| title | text | NOT NULL | |
| description | text | | |
| category | text | | rules, minutes, contracts, notices, forms |
| file_url | text | NOT NULL | Storage URL |
| file_name | text | NOT NULL | |
| file_size | bigint | NOT NULL | Bytes |
| mime_type | text | NOT NULL | |
| version | integer | DEFAULT 1 | |
| previous_version_id | uuid | FK -> documents(id) | Version chain |
| target | text | | all, owners, residents |
| uploaded_by | uuid | FK -> profiles(id) | |
| is_active | boolean | DEFAULT true | |

### Package Tracking

#### packages

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | NOT NULL, FK -> buildings(id) | |
| apartment_id | uuid | NOT NULL, FK -> apartments(id) | |
| tracking_number | text | | |
| carrier | text | | |
| description | text | | |
| received_by | uuid | FK -> profiles(id) | Admin/doorman who received it |
| picked_up_by | uuid | FK -> profiles(id) | Resident who collected it |
| picked_up_at | timestamptz | | |
| status | text | | pending, notified, picked_up |

### Supporting Tables

#### audit_logs

Immutable audit trail for all mutations.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| building_id | uuid | FK -> buildings(id) | |
| user_id | uuid | FK -> profiles(id) | |
| action | text | NOT NULL | create, update, delete |
| table_name | text | NOT NULL | |
| record_id | uuid | | |
| old_data | jsonb | | Previous state |
| new_data | jsonb | | New state |
| created_at | timestamptz | DEFAULT now() | |

#### email_preferences

Per-user email notification opt-in/opt-out settings.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| user_id | uuid | FK -> profiles(id) CASCADE, UNIQUE | |
| new_charges | boolean | DEFAULT true | |
| maintenance_updates | boolean | DEFAULT true | |
| visitor_checkins | boolean | DEFAULT true | |
| new_announcements | boolean | DEFAULT true | |
| overdue_reminders | boolean | DEFAULT true | |

### Database Functions

| Function | Purpose | Characteristics |
|----------|---------|----------------|
| `get_my_building_id()` | Returns current user's building_id | SECURITY DEFINER, STABLE |
| `get_my_role()` | Returns current user's role | SECURITY DEFINER, STABLE |
| `has_any_buildings()` | Checks if any buildings exist (setup wizard) | SECURITY DEFINER, STABLE, callable by anon |
| `custom_access_token_hook(event)` | Injects building_id + user_role into JWT claims | SECURITY DEFINER, STABLE |
| `check_space_availability(space_id, start, end, exclude_id)` | Checks for overlapping reservations | STABLE, uses OVERLAPS operator |
| `generate_reference_code()` | Produces 'RH-YYYY-XXXX' reservation codes | VOLATILE, loop-until-unique |
| `generate_maintenance_reference_code()` | Produces 'MR-YYYY-XXXX' codes | VOLATILE, loop-until-unique |
| `generate_visitor_access_code()` | Produces 8-char hex access codes | VOLATILE, loop-until-unique |
| `set_updated_at()` | Trigger: sets `updated_at = now()` on UPDATE | Trigger function |

### Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `set_buildings_updated_at` | buildings | BEFORE UPDATE | `set_updated_at()` |
| `set_profiles_updated_at` | profiles | BEFORE UPDATE | `set_updated_at()` |
| `set_apartments_updated_at` | apartments | BEFORE UPDATE | `set_updated_at()` |
| `set_public_spaces_updated_at` | public_spaces | BEFORE UPDATE | `set_updated_at()` |
| `set_reservations_updated_at` | reservations | BEFORE UPDATE | `set_updated_at()` |
| `set_reservation_reference` | reservations | BEFORE INSERT | `set_reservation_reference_code()` |

---

## 8. Row-Level Security (RLS)

RLS is enabled on every table. Policies follow consistent patterns with notable security hardening applied in migration `20260310000005_rls_fixes.sql`.

### Policy Patterns

**Pattern 1 -- Building-scoped SELECT (most tables):**
```sql
CREATE POLICY "Building members can view [table]"
  ON [table] FOR SELECT
  USING (building_id = public.get_my_building_id());
```

**Pattern 2 -- Admin-only mutations:**
```sql
CREATE POLICY "Admins can insert [table]"
  ON [table] FOR INSERT
  WITH CHECK (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );
```

**Pattern 3 -- Owner-of-record access (notifications, own profile):**
```sql
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());
```

**Pattern 4 -- Transitive building check (apartment_owners, availability_schedules, blackout_dates):**
```sql
CREATE POLICY "Building members can view apartment owners"
  ON apartment_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = apartment_owners.apartment_id
        AND apartments.building_id = public.get_my_building_id()
    )
  );
```

### Security Fixes (Critical)

Five vulnerabilities were identified and patched in the RLS policies:

#### 1. Profile Self-Elevation Prevention

The original profile UPDATE policy (`USING (id = auth.uid())`) allowed a user to modify their own `role`, `building_id`, or `is_active` fields via a raw Supabase client call. The fix adds a `WITH CHECK` that locks these fields to their current database values:

```sql
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role       = (SELECT p.role        FROM profiles p WHERE p.id = auth.uid())
    AND building_id = (SELECT p.building_id FROM profiles p WHERE p.id = auth.uid())
    AND is_active  = (SELECT p.is_active   FROM profiles p WHERE p.id = auth.uid())
  );
```

#### 2. Notification Insert Restriction

The original `WITH CHECK (true)` on notifications INSERT allowed any authenticated user to create notifications for any user. Removed entirely; notifications are now inserted only via the service-role admin client.

#### 3. Audit Log Insert Restriction

Same issue and fix as notifications.

#### 4. Reservation Update Status Restriction

The original reservation UPDATE policy had no status filter, allowing users to transition reservations to any state (including `confirmed`, which should be admin-only). The fix:

- **USING**: Only allows updates on rows owned by the user in `pending_payment` or `payment_submitted` status.
- **WITH CHECK**: Only allows the new status to be `pending_payment`, `payment_submitted`, or `cancelled`.

This prevents a non-admin from self-confirming a reservation.

#### 5. Payment Proof Storage Path Fix

The original storage policy used a suffix match (`LIKE '%' || name`) which could allow cross-user file access. Fixed to use folder-prefix ownership: `auth.uid()::text = (storage.foldername(name))[1]`.

### Audit Log and Notification Access

Both `audit_logs` and `notifications` have no INSERT policy for regular users. All inserts are performed through the admin client (service role), which bypasses RLS entirely. This is by design: these tables are system-managed.

Audit logs are readable only by admins within their building. Notifications are readable only by the owning user.

---

## 9. Supabase Client Architecture

The application uses three distinct Supabase client configurations, each with different security postures:

### Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: { getAll, setAll }
  });
}
```

- **Used in**: Server Components, Server Actions, Route Handlers.
- **Auth context**: Inherits the authenticated user's session from cookies.
- **RLS**: Fully enforced. All queries are scoped to the user's building.
- **When to use**: Default choice for all data access.

### Browser Client (`lib/supabase/client.ts`)

- **Used in**: Client Components (real-time subscriptions, auth state listeners).
- **Auth context**: Inherits session from cookies set by the server.
- **RLS**: Fully enforced.
- **When to use**: Real-time channel subscriptions, client-side auth checks.

### Admin Client (`lib/supabase/admin.ts`)

```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
```

- **Used in**: Setup wizard, user invitation, super-admin operations, notification/audit inserts, cron jobs.
- **Auth context**: Service role -- operates as the database owner.
- **RLS**: **Bypassed entirely**. All tables are accessible without restriction.
- **When to use**: Operations that require cross-tenant access or system-level inserts (notifications, audit logs). Use sparingly and never expose to client-side code.

### Middleware Client (`lib/supabase/middleware.ts`)

A specialized server client that operates on the raw `NextRequest`/`NextResponse` objects (not the `cookies()` API). It refreshes the session on every request and returns the authenticated user.

---

## 10. Server Action Patterns

All data mutations go through Next.js Server Actions defined in `lib/actions/`. Every action follows a consistent structure:

```typescript
"use server";

export async function doSomething(input) {
  // 1. Authentication + Authorization
  const { error, supabase, profile } = await getAdminProfile();
  if (error) return { error };

  // 2. Input Validation (Zod)
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // 3. Database Operation (via RLS-enforced client)
  const { data, error: dbError } = await supabase.from("table")...;
  if (dbError) return { error: dbError.message };

  // 4. Side Effects (audit log, email notification)
  await logAuditEvent({ action: "create", tableName: "table", recordId: data.id });

  // 5. Cache Invalidation
  revalidatePath("/admin/...");

  // 6. Return Result
  return { data };
}
```

### Key Conventions

- **Never throw**: Actions return `{ error: string }` or `{ data: T }`. The caller handles errors via conditional checks, not try/catch.
- **UUID validation**: Dynamic route parameters that represent UUIDs are validated against `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` before querying.
- **Auth helpers**:
  - `getAuthProfile()` -- For any authenticated user action.
  - `getAdminProfile()` -- For admin-only actions (rejects non-admin roles).
  - `getSuperAdminProfile()` -- For super-admin-only actions (in `lib/actions/super-admin.ts`).
- **Admin client usage**: The admin client (`createAdminClient()`) is used only when RLS must be bypassed: user creation, notification inserts, audit log inserts, cross-tenant queries.
- **Cleanup on failure**: Multi-step operations (e.g., user invitation: create auth user -> create profile -> link apartment) include manual rollback logic that deletes previously created resources on failure.

### Server Action Inventory

| File | Domain | Key Actions |
|------|--------|-------------|
| `auth.ts` | Authentication | login, signOut, forgotPassword, setPassword, updateMyProfile |
| `setup.ts` | Initial setup | checkBuildingsExist, completeSetup |
| `admin-users.ts` | User management | inviteOwner |
| `apartments.ts` | Apartment CRUD | createApartment, updateApartment, deleteApartment |
| `spaces.ts` | Space CRUD | createSpace, updateSpace, deleteSpace |
| `schedules.ts` | Availability | setSchedule |
| `blackout-dates.ts` | Blackout dates | addBlackoutDate, removeBlackoutDate |
| `reservations.ts` | Portal reservations | createReservation, cancelReservation, submitPaymentProof |
| `admin-reservations.ts` | Admin reservations | verifyPayment, rejectPayment |
| `announcements.ts` | Announcements | createAnnouncement, updateAnnouncement, deleteAnnouncement |
| `documents.ts` | Documents | uploadDocument, updateDocument, deleteDocument |
| `maintenance.ts` | Portal maintenance | createMaintenanceRequest, addComment |
| `admin-maintenance.ts` | Admin maintenance | updateRequestStatus, addInternalComment, assignRequest |
| `visitors.ts` | Portal visitors | registerVisitor, cancelVisitor |
| `admin-visitors.ts` | Admin visitors | checkInVisitor, checkOutVisitor |
| `fees.ts` | Fee types | createFeeType, updateFeeType |
| `admin-fees.ts` | Charges/payments | generateCharges, recordPayment |
| `packages.ts` | Portal packages | (view-only from portal) |
| `admin-packages.ts` | Admin packages | logPackage, markPickedUp |
| `polls.ts` | Portal polls | castVote |
| `admin-polls.ts` | Admin polls | createPoll, closePoll |
| `notifications.ts` | Notifications | markAsRead, markAllAsRead |
| `email-preferences.ts` | Email prefs | updateEmailPreferences |
| `building-settings.ts` | Settings | updateBuildingSettings |
| `owners.ts` | Owner management | linkOwner, unlinkOwner |
| `analytics.ts` | Dashboard data | getDashboardStats |
| `reports.ts` | Reports | getFinancialReport, getOccupancyReport |
| `search.ts` | Global search | searchBuilding |
| `admin-audit.ts` | Audit logs | getAuditLogs |
| `super-admin.ts` | Super admin | getSuperAdminProfile, listBuildings, createBuilding |

---

## 11. Real-Time Subscriptions

The application uses Supabase Realtime (powered by PostgreSQL logical replication via `pg_notify`) to push live updates to connected clients. All real-time hooks are in `lib/hooks/`:

| Hook | Channel Pattern | Table | Event | Filter |
|------|----------------|-------|-------|--------|
| `useRealtimeNotifications` | `notifications-{userId}` | notifications | INSERT | `user_id=eq.{userId}` |
| `useRealtimeAvailability` | `availability-{spaceId}` | reservations | INSERT, UPDATE, DELETE | `space_id=eq.{spaceId}` |
| `useRealtimeMaintenance` | `maintenance-{buildingId}` | maintenance_requests | INSERT, UPDATE | `building_id=eq.{buildingId}` |
| `useRealtimePayments` | `payments-{buildingId}` | payments | INSERT | `building_id=eq.{buildingId}` |
| `useRealtimeVisitors` | `visitors-{buildingId}` | visitors | UPDATE | `building_id=eq.{buildingId}` |

### Implementation Pattern

All hooks follow the same structure:

1. Memoize a browser Supabase client.
2. In a `useEffect`, subscribe to a `postgres_changes` channel with a table/event/filter combination.
3. On change, call a callback (typically a state refresh function).
4. On cleanup, remove the channel.

```typescript
useEffect(() => {
  if (!userId) return;
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    }, () => { onNewNotification(); })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [userId, onNewNotification]);
```

### Additional Hook

`useUser` (`lib/hooks/use-user.ts`) provides the current authenticated user context to client components.

---

## 12. Storage Architecture

Supabase Storage is used for all file uploads. Five buckets are configured with distinct access controls:

| Bucket | Visibility | Max Size | Allowed MIME Types | Use Case |
|--------|-----------|----------|-------------------|----------|
| `space-photos` | Public | 10 MB | JPEG, PNG, WebP, GIF | Amenity space gallery images |
| `payment-proofs` | Private | 10 MB | JPEG, PNG, WebP, PDF | Reservation payment receipts |
| `documents` | Private | 50 MB | PDF, DOCX, XLSX | Building documents |
| `avatars` | Public | 5 MB | JPEG, PNG, WebP | User profile pictures |
| `maintenance-photos` | Private | 10 MB | JPEG, PNG, WebP, GIF | Maintenance request evidence |

### Storage Policy Patterns

**Admin-managed buckets** (space-photos, documents): Admins can upload/update/delete. All building members can read.

**User-owned buckets** (avatars, payment-proofs): Files are stored in `{user_id}/{filename}` paths. Ownership is verified by comparing the first folder segment to `auth.uid()`:

```sql
auth.uid()::text = (storage.foldername(name))[1]
```

This pattern prevents one user from accessing another user's files, while admins retain full access via role check.

**Unrestricted upload with restricted read** (payment-proofs INSERT): Any authenticated user can upload to the payment-proofs bucket, but reading is restricted to the file owner or admins.

---

## 13. Email System

### Service

Email is sent via [Resend](https://resend.com) using React Email templates for consistent, maintainable HTML email generation.

### Architecture

```
Server Action / Cron Job
  -> sendNotificationEmail({ userId, type, templateProps })
    -> Check email_preferences (is this type enabled for user?)
    -> Fetch user profile (email, full_name)
    -> Build React Email template
    -> sendEmail({ to, subject, react })
      -> Resend API
```

### Notification Types

| Type | Trigger | Template |
|------|---------|----------|
| `new_charges` | Admin generates charges | `new-charge.tsx` |
| `maintenance_updates` | Status change on maintenance request | `maintenance-update.tsx` |
| `visitor_checkins` | Visitor is checked in by admin | `visitor-checkin.tsx` |
| `new_announcements` | New announcement published | `new-announcement.tsx` |
| `overdue_reminders` | Cron marks charge as overdue | `overdue-reminder.tsx` |
| `package_received` | Admin logs a package | `package-received.tsx` |

### Additional Templates (Direct Send, Not Preference-Gated)

| Template | Purpose |
|----------|---------|
| `invitation.tsx` | User invitation email |
| `payment-submitted-admin.tsx` | Notifies admin of payment proof upload |
| `payment-rejected.tsx` | Notifies user of rejected payment |
| `payment-reminder.tsx` | Upcoming payment deadline reminder |
| `reservation-confirmed.tsx` | Reservation confirmation |
| `reservation-cancelled.tsx` | Reservation cancellation |
| `reservation-reminder.tsx` | Upcoming reservation reminder |

### Design Decisions

- **Fire-and-forget**: Email sends do not block the response to the user. Failures are logged but do not cause action failures.
- **Preference-respecting**: Each notification type maps to a column in `email_preferences`. If a user has disabled a type, the email is silently skipped.
- **Admin client for preference lookup**: The email system uses the admin client to bypass RLS when reading another user's email preferences.
- **Exhaustive type checking**: The `buildTemplate` function uses a discriminated union with `never` check to ensure all notification types have a corresponding template at compile time.

---

## 14. Cron Jobs and Background Processing

Two cron jobs are configured in `vercel.json` and execute as Vercel Cron Functions:

### auto-cancel (Daily at 08:00 UTC)

**Path**: `/api/cron/auto-cancel`

**Purpose**: Automatically cancels reservations that have passed their payment deadline without receiving a payment proof.

**Logic**:
1. Authenticates the request using `CRON_SECRET` header.
2. Queries reservations where `status = 'pending_payment'` and `payment_deadline < now()`.
3. Updates matching reservations to `status = 'cancelled'` with a system cancellation reason.

### overdue-charges (Daily at 09:00 UTC)

**Path**: `/api/cron/overdue-charges`

**Purpose**: Marks charges past their due date as overdue and sends email reminders to affected apartment owners.

**Logic**:
1. Authenticates using `CRON_SECRET`.
2. Queries charges where `status = 'pending'` and `due_date < today`.
3. Updates matching charges to `status = 'overdue'`.
4. For each overdue charge, sends an `overdue_reminders` notification email to the apartment's primary owner (respecting email preferences).

### Security

Both cron endpoints validate the `Authorization: Bearer {CRON_SECRET}` header. Requests without a valid secret receive a 401 response. Vercel injects this header automatically for scheduled invocations.

---

## 15. Internationalization (i18n)

### Configuration

Internationalization is handled by `next-intl` with the following setup:

```typescript
// i18n/routing.ts
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",  // "en" has no prefix, "es" gets /es/...
});
```

### Message Files

Translation strings are organized by domain in `messages/{locale}/`:

| File | Domain |
|------|--------|
| `common.json` | Shared UI strings (buttons, labels, errors) |
| `auth.json` | Login, registration, password reset |
| `admin.json` | Admin panel strings |
| `portal.json` | Owner/resident portal strings |
| `setup.json` | Setup wizard |
| `superAdmin.json` | Super admin panel |

### Usage Patterns

**Server Components**:
```typescript
const t = await getTranslations("admin");
setRequestLocale(locale);
```

**Client Components**:
```typescript
const t = useTranslations("portal");
const locale = useLocale();
```

### User Preference

Each user has a `preferred_locale` field in their profile (default: `es`). This preference is respected when generating emails and can be changed from the profile settings page.

---

## 16. Audit Logging

All significant data mutations are recorded in the `audit_logs` table via the `logAuditEvent()` function in `lib/audit/log.ts`.

### Implementation

```typescript
export async function logAuditEvent(params: {
  action: string;        // "create", "update", "delete"
  tableName: string;     // Target table name
  recordId?: string;     // Affected row UUID
  oldData?: Record<string, unknown>;  // Previous state (for updates)
  newData?: Record<string, unknown>;  // New state
}) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const profile = await supabase.from("profiles").select("building_id")...;
  await supabase.from("audit_logs").insert({ ... });
}
```

### Access Control

- **Write**: Audit logs are inserted via the regular client. Since the `WITH CHECK (true)` INSERT policy was removed in the RLS fixes, inserts must go through the admin client if the regular client's RLS context does not permit it. In the current implementation, `logAuditEvent()` uses the regular server client (which has the user's session), and the absence of an INSERT policy means the insert will fail silently for non-admin users. This is a known design trade-off: only admin-initiated actions produce audit logs.
- **Read**: Only admins can view audit logs for their building.

### Viewing

Audit logs are viewable in the admin panel at `/admin/audit`. The UI allows filtering by action type, table, user, and date range.

---

## 17. Security Model

### Defense-in-Depth Layers

1. **Network**: All traffic is TLS-encrypted via Vercel and Supabase.
2. **Authentication**: Supabase Auth with HTTP-only session cookies. No JWT exposed to JavaScript.
3. **Authorization**: Three layers -- RLS policies (database), Server Action guards (application), Layout guards (routing).
4. **Input Validation**: All inputs validated with Zod schemas before reaching the database.
5. **Multi-Tenancy Isolation**: RLS ensures data never crosses building boundaries.

### OWASP Mitigations

| Vulnerability | Mitigation |
|--------------|------------|
| A01: Broken Access Control | RLS policies enforce tenant isolation and role-based access at the database level |
| A02: Cryptographic Failures | Passwords hashed by Supabase Auth (bcrypt). TLS everywhere. |
| A03: Injection | Supabase SDK uses parameterized queries. No raw SQL in application code. |
| A04: Insecure Design | Invite-only registration. No public signup. |
| A07: Identification Failures | Generic error messages prevent user enumeration on login and password reset. |
| A08: Software Integrity | Vercel deployment with immutable builds. |
| A09: Logging Failures | Audit log records all admin mutations with old/new state. |

### Specific Security Measures

- **Self-elevation prevention**: RLS `WITH CHECK` on profile updates locks `role`, `building_id`, and `is_active` to their current values.
- **Reservation status tampering prevention**: Non-admins can only transition reservations to `pending_payment`, `payment_submitted`, or `cancelled` states.
- **Storage path injection prevention**: Payment proof ownership uses folder-prefix matching (`auth.uid()::text = (storage.foldername(name))[1]`) instead of URL suffix matching.
- **Setup race condition guard**: `completeSetup()` re-checks `has_any_buildings()` before proceeding.
- **UUID validation**: All UUID route parameters are validated against a regex pattern before database queries.
- **SECURITY DEFINER safety**: All `SECURITY DEFINER` functions use `SET search_path = ''` to prevent search-path hijacking.
- **Cron endpoint protection**: API routes for cron jobs validate `CRON_SECRET` before processing.

### Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS -- never exposed to client |
| `NEXT_PUBLIC_APP_URL` | Public | Application base URL (for email links) |
| `RESEND_API_KEY` | Server only | Resend email service key |
| `CRON_SECRET` | Server only | Vercel cron job authentication |

---

## 18. Deployment Architecture

### Platform: Vercel

The application is deployed on Vercel with the following configuration:

- **Framework**: Next.js 16 (auto-detected)
- **Build command**: `next build`
- **Runtime**: Node.js serverless functions
- **Plan**: Hobby (affects cron scheduling granularity)

### Infrastructure Topology

```
                    Vercel Edge Network (CDN)
                           |
            +--------------+--------------+
            |              |              |
      Static Assets   Serverless     Cron Functions
      (JS, CSS,       Functions      (auto-cancel,
       images)        (SSR, API,      overdue-charges)
                      Server Actions)
                           |
                    Supabase Cloud
                    +------+------+
                    |      |      |
                PostgreSQL Auth  Storage
                    |
                 Realtime
                 (WebSocket)
```

### Build Pipeline

1. Push to `main` triggers Vercel build.
2. `next build` compiles the application (Server Components, Client Components, Server Actions, API Routes).
3. Static pages are pre-rendered. Dynamic pages use serverless functions.
4. Environment variables are injected from Vercel project settings.

### Cron Schedule

Both cron jobs run daily (the maximum frequency for Vercel Hobby plan):

- `auto-cancel`: `0 8 * * *` (08:00 UTC daily)
- `overdue-charges`: `0 9 * * *` (09:00 UTC daily)

---

## 19. Performance Considerations

### Database Indexes

The schema includes targeted indexes for the most common query patterns:

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_profiles_building` | profiles | building_id | Tenant-scoped profile lookups |
| `idx_profiles_role` | profiles | building_id, role | Role-filtered user lists |
| `idx_apartments_building` | apartments | building_id | Tenant-scoped apartment lists |
| `idx_reservations_space_time` | reservations | space_id, start_time, end_time | Availability conflict detection |
| `idx_reservations_building_status` | reservations | building_id, status | Admin reservation dashboards |
| `idx_reservations_user` | reservations | user_id, status | User's own reservation list |
| `idx_reservations_deadline` | reservations | payment_deadline (partial: WHERE status = 'pending_payment') | Cron auto-cancel query |
| `idx_notifications_user` | notifications | user_id, read_at | Notification inbox + unread count |
| `idx_announcements_building` | announcements | building_id, published_at | Chronological announcement feeds |

Additional indexes were added in migration `20260310000001_dashboard_indexes.sql` and `20260310000002_audit_indexes.sql` for dashboard analytics and audit log filtering.

### RLS Function Caching

The `get_my_building_id()` and `get_my_role()` functions are marked `STABLE`, telling PostgreSQL they return the same result within a single transaction. This allows the planner to cache the result when a single query triggers multiple RLS policy evaluations.

### Cache Invalidation

Server Actions use `revalidatePath()` to invalidate Next.js route caches after mutations. This ensures that subsequent page loads reflect the latest data without requiring a full page reload.

### Real-Time Channel Scoping

Real-time subscriptions use filters (e.g., `user_id=eq.{userId}`) to minimize the volume of change events pushed to each client. This reduces WebSocket traffic and client-side processing.

---

## 20. Appendices

### A. Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `20260209000000_initial_schema.sql` | 2026-02-09 | Core tables, indexes, functions, triggers |
| `20260209000001_rls_policies.sql` | 2026-02-09 | RLS helper functions and all initial policies |
| `20260209000002_auth_hook.sql` | 2026-02-09 | JWT claim injection hook |
| `20260209000003_storage.sql` | 2026-02-09 | Storage buckets and policies |
| `20260309000000_documents.sql` | 2026-03-09 | Documents table and policies |
| `20260309000001_maintenance_requests.sql` | 2026-03-09 | Maintenance requests and comments |
| `20260309000002_visitors.sql` | 2026-03-09 | Visitor management |
| `20260309000003_expenses.sql` | 2026-03-09 | Fee types, charges, payments |
| `20260310000000_email_preferences.sql` | 2026-03-10 | Email notification preferences |
| `20260310000001_dashboard_indexes.sql` | 2026-03-10 | Performance indexes for dashboard |
| `20260310000002_audit_indexes.sql` | 2026-03-10 | Indexes for audit log queries |
| `20260310000003_packages.sql` | 2026-03-10 | Package tracking table |
| `20260310000004_polls.sql` | 2026-03-10 | Polls, options, votes |
| `20260310000005_rls_fixes.sql` | 2026-03-10 | Five critical RLS vulnerability fixes |
| `20260310000006_visitor_access_fix.sql` | 2026-03-10 | Visitor access code generation fix |
| `20260310000007_super_admin_setup.sql` | 2026-03-10 | has_any_buildings() RPC for setup |

### B. Component Directory Structure

```
components/
  admin/          # Admin panel components (tables, forms, dialogs)
  portal/         # Portal components (cards, lists, forms)
  layout/         # Shared layout components (sidebar, header, breadcrumbs)
  notifications/  # Notification bell, dropdown, list
  setup/          # Setup wizard steps
  shared/         # Components used across admin and portal
  super-admin/    # Super admin panel components
  ui/             # shadcn/ui primitives (DO NOT MODIFY)
  theme-provider.tsx  # next-themes provider
```

### C. File Naming Conventions

| Pattern | Convention | Example |
|---------|-----------|---------|
| Pages | `page.tsx` in route directory | `app/[locale]/(dashboard)/admin/apartments/page.tsx` |
| Layouts | `layout.tsx` in route directory | `app/[locale]/(dashboard)/admin/layout.tsx` |
| Server Actions | `{domain}.ts` in `lib/actions/` | `lib/actions/reservations.ts` |
| Admin Actions | `admin-{domain}.ts` in `lib/actions/` | `lib/actions/admin-reservations.ts` |
| Hooks | `use-{name}.ts` in `lib/hooks/` | `lib/hooks/use-realtime-notifications.ts` |
| Email Templates | `{name}.tsx` in `lib/email/templates/` | `lib/email/templates/new-charge.tsx` |
| i18n Messages | `{namespace}.json` in `messages/{locale}/` | `messages/en/admin.json` |
| Migrations | `{YYYYMMDDHHMMSS}_{description}.sql` | `20260209000000_initial_schema.sql` |
| Types | `types/index.ts` (app types), `types/database.ts` (auto-generated) | |

### D. Glossary

| Term | Definition |
|------|-----------|
| Building | A tenant in the multi-tenancy model. Represents a physical apartment building. |
| Profile | A user record extending `auth.users` with application-specific fields. |
| RLS | Row-Level Security. PostgreSQL feature that filters query results at the database level. |
| SECURITY DEFINER | A PostgreSQL function modifier that executes with the function owner's privileges. |
| Admin Client | The Supabase client using the service role key, bypassing all RLS policies. |
| Anon Key | The Supabase public key safe for client-side use. Limited by RLS policies. |
| Service Role Key | The Supabase privileged key that bypasses RLS. Server-only. |
| Server Action | A Next.js feature that allows defining server-side functions callable from client components. |
| Reference Code | Auto-generated human-readable identifiers (e.g., RH-2026-A3F1 for reservations). |
| Access Code | 8-character hex code generated for visitor entry verification. |

---

*This document was generated from codebase analysis on 2026-03-10. It reflects the state of the system as of commit `e53c78e`.*
