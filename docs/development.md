# Development Guide

## Prerequisites
- Node.js 18+
- npm
- Supabase CLI (`npx supabase`)
- Git

## Local Setup

### 1. Clone and Install
```bash
git clone <repo-url>
cd apartament
npm install
```

### 2. Environment Variables
Create `.env.local` from the example:
```bash
cp .env.example .env.local
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=<your Resend API key>
CRON_SECRET=<any secret string for local testing>
```

### 3. Start Local Supabase
```bash
npx supabase start
```
This starts PostgreSQL, Auth, Storage, and Realtime locally. Note the anon key and service role key from the output.

### 4. Apply Migrations
```bash
npx supabase db push
```

### 5. Seed Demo Data (Optional)
```bash
npx supabase db reset
```
This drops all data, re-applies migrations, and runs `supabase/seed.sql` which creates:
- Demo building "Torre Residencial Demo" (50 units)
- 10 sample apartments
- 4 public spaces with availability schedules (Event Hall, BBQ Terrace, Meeting Room, Gym)

### 6. Start Development Server
```bash
npm run dev
```
Visit http://localhost:3000. You'll be redirected to `/setup` to create the first super admin.

## Database Migrations

### Creating a New Migration
```bash
npx supabase migration new <description>
```
This creates a timestamped SQL file in `supabase/migrations/`.

### Migration Naming Convention
Format: `YYYYMMDDHHMMSS_description.sql`
Example: `20260310000008_add_parking_spots.sql`

### Migration Best Practices
- Always enable RLS on new tables: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
- Add RLS policies for SELECT (building members), INSERT/UPDATE/DELETE (admins)
- Use `get_my_building_id()` and `get_my_role()` in policies
- Add appropriate indexes for filtered columns
- Include `building_id` column for multi-tenancy
- Add `created_at` and `updated_at` timestamps with trigger:
  ```sql
  CREATE TRIGGER set_table_updated_at
    BEFORE UPDATE ON new_table
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  ```

### Applying Migrations
```bash
# Local
npx supabase db push

# Production (via Supabase dashboard or CLI)
npx supabase db push --linked
```

## Adding a New Feature

### 1. Database (if needed)
Create a migration with new table/columns.

### 2. Types
Update `types/index.ts` with new interfaces. If using Supabase codegen:
```bash
npx supabase gen types typescript --local > types/database.ts
```

### 3. Server Actions
Create `lib/actions/<feature>.ts`:
```typescript
"use server";

import { getAdminProfile } from "./helpers";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({
  name: z.string().min(1).max(200),
});

export async function createThing(formData: FormData) {
  const { error, supabase } = await getAdminProfile();
  if (error) return { error };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation failed" };

  const { data, error: dbError } = await supabase
    .from("things")
    .insert({ ...parsed.data, building_id: (await getAdminProfile()).profile!.building_id })
    .select()
    .single();

  if (dbError) return { error: "Failed to create" };

  revalidatePath("/admin/things");
  return { data };
}
```

### 4. Components
- Admin components -> `components/admin/<feature>-*.tsx`
- Portal components -> `components/portal/<feature>-*.tsx`
- Use shadcn/ui components from `components/ui/`

### 5. Pages
Create page files in the appropriate route group:
- Admin: `app/[locale]/(dashboard)/admin/<feature>/page.tsx`
- Portal: `app/[locale]/(dashboard)/portal/<feature>/page.tsx`

Page template:
```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.feature");

  // fetch data...

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      {/* content */}
    </div>
  );
}
```

### 6. Navigation
Add to sidebar in `components/layout/sidebar.tsx`:
```typescript
const adminItems: NavItem[] = [
  // ...existing items
  {
    titleKey: "feature",
    href: "/admin/feature",
    icon: IconName,
    roles: ["super_admin", "admin"],
  },
];
```

### 7. Translations
Add keys to both `messages/en/admin.json` and `messages/es/admin.json` (or appropriate namespace).

## Internationalization (i18n)

### How It Works
- next-intl handles locale routing (URL prefix for non-default locale)
- Default locale: `en` (no URL prefix)
- Spanish: `/es/...` URL prefix
- Locale config: `i18n/routing.ts`

### Adding Translation Keys
1. Add to `messages/en/<namespace>.json`
2. Add to `messages/es/<namespace>.json`
3. Use in server components: `const t = await getTranslations("namespace.section");`
4. Use in client components: `const t = useTranslations("namespace.section");`

### Adding a New Message File
1. Create `messages/en/newNamespace.json` and `messages/es/newNamespace.json`
2. Import in `i18n/request.ts`:
```typescript
const newNamespace = (await import(`../../messages/${locale}/newNamespace.json`)).default;
// Add to messages object
```

### Translation Key Conventions
- Use nested keys: `"section.subsection.key"`
- Form labels: `"fieldName"`, `"fieldNamePlaceholder"`
- Actions: `"save"`, `"saving"`, `"cancel"`, `"delete"`, `"edit"`
- Status: `"success"`, `"error"`, `"loading"`

## Testing

### Running Tests
```bash
npm run test           # Run all tests once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

### Test Framework
- Vitest (configured in `vitest.config.ts`)
- Test files in `__tests__/` directory

## Code Style

### TypeScript
- Strict mode enabled
- Use interfaces for object shapes (in `types/index.ts`)
- No `any` types
- Path alias: `@/*` maps to project root

### Components
- Server components by default (no "use client" unless needed)
- Client components start with `"use client";`
- Use `cn()` from `lib/utils` for conditional Tailwind classes
- Toast notifications via `sonner`: `toast.success()`, `toast.error()`

### Forms
- Use `useTransition` + `startTransition` for form submissions (shows pending state)
- Hidden `<input>` for shadcn Select values (Select doesn't submit in FormData)
- Zod validation on server side

### File Naming
- Components: `kebab-case.tsx` (e.g., `building-settings-form.tsx`)
- Actions: `kebab-case.ts` (e.g., `building-settings.ts`)
- Types: `camelCase` for interfaces, `snake_case` for database column names
