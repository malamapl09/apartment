# Deployment Guide

## Platform
ResidenceHub is designed for deployment on **Vercel** (frontend) + **Supabase** (backend).

## Vercel Setup

### 1. Connect Repository
1. Go to vercel.com and import your GitHub repository
2. Set the framework to "Next.js"
3. Deploy

### 2. Environment Variables
Set these in Vercel project settings (Settings > Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g., `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your production URL (e.g., `https://yourdomain.com`) |
| `RESEND_API_KEY` | Yes | Resend API key for sending emails |
| `CRON_SECRET` | Yes | Secret string for authenticating cron job requests |

### 3. Cron Jobs
Cron jobs are configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-cancel",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/overdue-charges",
      "schedule": "0 9 * * *"
    }
  ]
}
```
- **auto-cancel**: Runs daily at 8 AM UTC. Cancels reservations past their payment deadline.
- **overdue-charges**: Runs daily at 9 AM UTC. Marks past-due charges as overdue and sends email notifications.

Note: Vercel Hobby plan supports only daily cron jobs. Pro plan supports more frequent schedules.

Both endpoints verify the `Authorization: Bearer <CRON_SECRET>` header.

## Supabase Setup

### 1. Create Project
1. Go to supabase.com and create a new project
2. Note your project URL, anon key, and service role key

### 2. Apply Migrations
Option A: Link and push
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Option B: Run migrations manually via Supabase SQL Editor (copy each migration file)

### 3. Configure Auth
In Supabase Dashboard > Authentication > Settings:

1. **Site URL**: Set to your production URL (e.g., `https://yourdomain.com`)
2. **Redirect URLs**: Add:
   - `https://yourdomain.com/api/auth/callback`
   - `https://yourdomain.com/set-password`
   - `http://localhost:3000/api/auth/callback` (for local dev)
3. **Email Templates**: Customize invite and password reset email templates as needed
4. **SMTP**: Configure custom SMTP if needed (Supabase has rate limits on default SMTP)

### 4. Configure Auth Hook (JWT Claims)
The migration `20260209000002_auth_hook.sql` creates the `custom_access_token_hook` function. You need to enable it:

1. Go to Supabase Dashboard > Authentication > Hooks
2. Enable "Customize Access Token (JWT) Claims"
3. Select the `custom_access_token_hook` function

This injects `building_id` and `user_role` into JWT claims, which RLS policies depend on.

### 5. Storage Buckets
The migration `20260209000003_storage.sql` creates storage buckets automatically. Verify they exist:
- `space-photos` (public)
- `payment-proofs` (private)
- `documents` (private)
- `avatars` (public)
- `maintenance-photos` (private)

### 6. Realtime
Enable Realtime for tables that need live updates:
1. Go to Supabase Dashboard > Database > Replication
2. Enable replication for: `reservations`, `maintenance_requests`, `notifications`, `visitors`, `payments`

## Resend (Email) Setup

### 1. Create Account
Sign up at resend.com

### 2. Verify Domain
Add and verify your sending domain in Resend dashboard.

### 3. Get API Key
Create an API key and set it as `RESEND_API_KEY` in Vercel.

### 4. Email Types
The app sends these notification types:
- New charges
- Maintenance updates
- Visitor check-ins
- New announcements
- Overdue reminders
- Package received
- Admin invitation emails

## Custom Domain

### Vercel
1. Go to Vercel project > Settings > Domains
2. Add your domain and follow DNS instructions

### Supabase
Update `NEXT_PUBLIC_APP_URL` in Vercel to match your custom domain.
Update the Site URL and redirect URLs in Supabase Auth settings.

## Post-Deployment Checklist

1. Verify environment variables are set in Vercel
2. Verify Supabase migrations are applied
3. Verify auth hook is enabled in Supabase
4. Verify storage buckets exist
5. Verify Realtime is enabled for required tables
6. Verify Resend domain is verified
7. Verify cron jobs are running (check Vercel > Cron Jobs tab)
8. Navigate to `/setup` to create the first super admin
9. Test email sending (invite an admin, check email delivery)
10. Test login flow
11. Test real-time updates (open two browser tabs)

## Monitoring

### Vercel
- Deployment logs: Vercel Dashboard > Deployments
- Runtime logs: Vercel Dashboard > Logs
- Cron job logs: Vercel Dashboard > Cron Jobs

### Supabase
- Database: Supabase Dashboard > Table Editor
- Auth: Supabase Dashboard > Authentication > Users
- Storage: Supabase Dashboard > Storage
- Logs: Supabase Dashboard > Logs (Postgres, Auth, Storage, Realtime)
- Performance: Supabase Dashboard > Reports

## Scaling Considerations

- **Database**: Supabase scales with your plan. Add read replicas for heavy read workloads.
- **Storage**: Supabase storage has per-plan limits. Monitor usage.
- **Email**: Resend has per-plan rate limits. Monitor sends.
- **Cron Jobs**: Vercel Hobby plan supports daily crons only. Upgrade for more frequent schedules.
- **Edge Functions**: Consider Supabase Edge Functions for heavy background processing.
- **CDN**: Vercel's Edge Network handles static asset caching automatically.
