# CLAUDE.md -- ResidenceHub

Apartment building management platform.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Tailwind CSS v4 (via @tailwindcss/postcss, NO tailwind.config.ts)
- shadcn/ui (new-york style, components in `components/ui/`)
- next-intl for i18n (EN + ES)
- Zod for validation
- Resend for email

## Build & Test Commands

```
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (run all tests)
npm run test:watch   # Vitest watch mode
```

## File Structure

- Pages: `app/[locale]/(group)/route/page.tsx`
- Server actions: `lib/actions/<feature>.ts` (always `"use server"`)
- Components: `components/<section>/<component-name>.tsx`
- UI primitives: `components/ui/` (shadcn -- do not modify)
- Types: `types/index.ts` (main types), `types/database.ts` (auto-generated)
- i18n messages: `messages/en/*.json` and `messages/es/*.json`
- Supabase clients: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/admin.ts`
- Hooks: `lib/hooks/`
- Constants: `lib/constants.ts`

## Route Groups

- `(auth)` -- Login, forgot-password, set-password (public)
- `(dashboard)` -- Protected admin + portal routes
- `(setup)` -- First-time setup wizard (public if no buildings exist)
- `(super-admin)` -- Super admin panel (super_admin role only)

## Params Pattern (Next.js 16)

All page components receive `params` as a Promise:

```tsx
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

## i18n

- Server components: `getTranslations("namespace")` + `setRequestLocale(locale)`
- Client components: `useTranslations("namespace")` + `useLocale()`
- Always add keys to BOTH `messages/en/*.json` and `messages/es/*.json`
- Message files: common.json, auth.json, admin.json, portal.json, setup.json, superAdmin.json
- New message files must be imported in `i18n/request.ts`

## Server Actions

- Always start with `"use server"`
- Use `getAuthProfile()` or `getAdminProfile()` from `lib/actions/helpers.ts` for auth
- Super admin actions use `getSuperAdminProfile()` from `lib/actions/super-admin.ts`
- Validate inputs with Zod schemas
- Use `createAdminClient()` (service role) only when bypassing RLS is needed
- Return `{ error: string }` or `{ data: T }` -- never throw
- Use `revalidatePath()` after mutations
- Validate UUID params with regex before querying: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

## Database & Supabase

- Every table has `building_id` for multi-tenancy
- RLS policies use `get_my_building_id()` and `get_my_role()` helper functions
- RLS is enforced on the regular client; `createAdminClient()` bypasses RLS
- Migrations: `supabase/migrations/` with timestamp prefix `YYYYMMDDHHMMSS_description.sql`
- Always enable RLS on new tables
- Use `SECURITY DEFINER` sparingly and set `search_path = ''`
- **FK hints required**: When a table has multiple FKs to the same target (e.g. `reservations` → `profiles` via `user_id`, `payment_verified_by`, `cancelled_by`), use explicit FK hints in `.select()`: `profiles!user_id(id, full_name)`. Without hints, PostgREST throws "ambiguous relationship" errors.
  - `reservations` → `profiles`: use `profiles!user_id(...)`
  - `visitors` → `profiles`: use `profiles!registered_by(...)`
  - `packages` → `profiles`: use `profiles!packages_received_by_fkey(...)` / `profiles!packages_picked_up_by_fkey(...)`

## Components

- Use shadcn/ui components from `components/ui/`
- Forms: use hidden `<input>` for shadcn Select values (Select does not put value in FormData)
- Toast notifications via `sonner`: `toast.success()`, `toast.error()`
- Use `useTransition` + `startTransition` for form submissions
- Admin components in `components/admin/`, portal in `components/portal/`

## User Roles

- `super_admin` -- Cross-building management, platform-level access
- `admin` -- Single building management
- `owner` -- Apartment owner with full portal access
- `resident` -- Resident with portal access

## Styling

- Tailwind CSS v4 with CSS variables for theming
- Dark mode via `next-themes`
- No tailwind.config.ts -- config is in `app/globals.css` via `@theme` block
- Use `cn()` from `lib/utils` for conditional classes

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
CRON_SECRET
```

## Common Patterns

- Shared timezone list: import `TIMEZONES` from `lib/constants.ts`
- Audit logging: `logAudit()` from `lib/audit/log.ts`
- Email notifications: `sendNotificationEmail()` from `lib/email/send-notification-email.ts`
- Currency formatting: `lib/utils/currency.ts`
- Date formatting: `lib/utils/date.ts`
