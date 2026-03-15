# ResidenceHub -- Features Reference

> Complete feature reference for the ResidenceHub apartment building management platform.
> Every feature is documented with its route, server actions, key components, and runtime behavior.

---

## Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [Authentication](#2-authentication)
3. [Super Admin Panel](#3-super-admin-panel)
4. [Admin Panel](#4-admin-panel)
5. [Owner/Resident Portal](#5-ownerresident-portal)
6. [Cross-Cutting Features](#6-cross-cutting-features)
7. [API Routes and Cron Jobs](#7-api-routes-and-cron-jobs)
8. [Middleware and Route Protection](#8-middleware-and-route-protection)

---

## 1. Initial Setup

### 1.1 Setup Wizard

| Property | Value |
|---|---|
| **Route** | `/setup` |
| **Guard** | Only accessible when no buildings exist (verified via `has_any_buildings()` Supabase RPC). Fails closed -- if the RPC errors, the guard assumes buildings exist and blocks access. |
| **Component** | `components/setup/setup-wizard.tsx` |
| **Server Action** | `lib/actions/setup.ts` -- `completeSetup(formData)` |
| **Helper** | `lib/actions/setup.ts` -- `checkBuildingsExist()` |

**Validation Schema** (Zod):

- `email` -- valid email format, required
- `password` -- minimum 8 characters, required
- `full_name` -- 2 to 200 characters, required
- `building_name` -- 1 to 200 characters, required
- `address` -- up to 500 characters, optional (defaults to empty string)
- `total_units` -- integer between 1 and 9999, coerced from string
- `timezone` -- non-empty string, required

**Flow**:

1. **Step 1 -- Create Admin Account**: The user enters their full name, email, password, and password confirmation.
2. **Step 2 -- Create First Building**: The user enters the building name, address, total number of units, and timezone.
3. **Step 3 -- Success**: The wizard displays a confirmation screen and redirects to the super admin dashboard.

**Behavior**:

- A race condition guard double-checks that no buildings exist before proceeding.
- The action creates the following resources atomically using the Supabase admin client:
  1. Auth user (with `email_confirm: true` so the user is immediately verified)
  2. Building record
  3. Profile with `super_admin` role, linked to the building
  4. Email preferences record for the new user
- If any step fails, previous steps are rolled back (auth user is deleted, building is deleted as needed).
- After successful creation, the user is automatically signed in via `supabase.auth.signInWithPassword`.
- On completion, the action redirects to the root route.

---

## 2. Authentication

### 2.1 Login

| Property | Value |
|---|---|
| **Route** | `/login` |
| **Server Action** | `lib/actions/auth.ts` -- `login(formData)` |

**Validation Schema** (Zod):

- `email` -- valid email format
- `password` -- minimum 8 characters

**Behavior**:

- Validates input with Zod. If validation fails, returns a generic "Invalid credentials" message.
- Calls `supabase.auth.signInWithPassword` with the provided email and password.
- On success, redirects to `/` (the root route, which the middleware resolves based on user role).
- On failure, returns the generic error "Invalid email or password" to prevent user enumeration (per OWASP A07:2021).

### 2.2 Forgot Password

| Property | Value |
|---|---|
| **Route** | `/forgot-password` |
| **Server Action** | `lib/actions/auth.ts` -- `forgotPassword(formData)` |

**Behavior**:

- Accepts an email address from the form data.
- Calls `supabase.auth.resetPasswordForEmail` with a redirect URL pointing to `/set-password`.
- Always returns `{ success: true }` regardless of whether the email exists, to prevent email enumeration.
- If the email is registered, Supabase sends a password reset link.

### 2.3 Set Password

| Property | Value |
|---|---|
| **Route** | `/set-password` |
| **Server Action** | `lib/actions/auth.ts` -- `setPassword(formData)` |

**Behavior**:

- Used for both password resets (via the forgot-password flow) and initial password setting (for invited users).
- Validates that the password is at least 8 characters and matches the confirmation field.
- Calls `supabase.auth.updateUser` to set the new password.

### 2.4 Self-Service Registration

| Property | Value |
|---|---|
| **Route** | `/register` |
| **Server Action** | `lib/actions/register.ts` -- `registerBuilding(formData)` |
| **Component** | `components/register/register-wizard.tsx` |
| **i18n** | `messages/{locale}/register.json` |

**3-Step Wizard**:

1. **Account** (Step 1): Full name, email, password, confirm password.
2. **Building** (Step 2): Building name, address (optional), total units, timezone.
3. **Complete** (Step 3): Success confirmation with "Go to Dashboard" button.

**Validation**:

- Step 1: Full name ≥ 2 chars, valid email, password ≥ 8 chars, passwords match.
- Step 2: Building name required, total units ≥ 1, timezone required.
- Server-side: Zod schema validates all fields again.

**Server Action Behavior** (`registerBuilding`):

1. Creates auth user via `adminClient.auth.admin.createUser()` with `email_confirm: true`.
2. Creates a building record.
3. Creates a profile with `role: "admin"` (never `super_admin`).
4. Creates default email preferences.
5. Signs in the user automatically.
6. **Atomic rollback**: If any step fails, previously created records are cleaned up (user, building).
7. **Error sanitization**: Auth errors like "User already registered" are mapped to a generic message to prevent enumeration.

### 2.5 Sign Out

| Property | Value |
|---|---|
| **Route** | `POST /api/auth/signout` |
| **Server Action** | `lib/actions/auth.ts` -- `signOut()` |

**Behavior**:

- Calls `supabase.auth.signOut()` to clear the session.
- Redirects the user to `/login`.

### 2.5 Auth Callback

| Property | Value |
|---|---|
| **Route** | `GET /api/auth/callback` |
| **File** | `app/api/auth/callback/route.ts` |

**Behavior**:

- OAuth callback handler.
- Exchanges the auth code from the query string for a session.
- Used by Supabase for email confirmation links and password reset flows.

---

## 3. Super Admin Panel

The super admin panel is accessible to users with the `super_admin` role. It provides oversight across all buildings in the system.

### 3.1 Dashboard

| Property | Value |
|---|---|
| **Route** | `/super-admin` |
| **Server Action** | `lib/actions/super-admin.ts` -- `getAllBuildings()` |
| **Components** | `components/super-admin/building-card.tsx` |

**Displays**:

- **Stat cards**: Total buildings, total users, total admins across all buildings.
- **Building cards grid**: Each card shows the building name, address, unit count, user count, admin count, and creation date.

### 3.2 Buildings List

| Property | Value |
|---|---|
| **Route** | `/super-admin/buildings` |
| **Server Action** | `lib/actions/super-admin.ts` -- `getAllBuildings()` |

**Displays**:

- All buildings rendered in a card grid layout.
- Each card includes: building name, address, total units, number of users, number of admins, and date created.

### 3.3 Create Building

| Property | Value |
|---|---|
| **Route** | `/super-admin/buildings/new` |
| **Component** | `components/super-admin/create-building-form.tsx` |
| **Server Action** | `lib/actions/super-admin.ts` -- `createBuildingWithAdmin(formData)` |

**Fields**:

- Building name
- Address
- Total units
- Timezone
- Admin email
- Admin full name

**Behavior**:

- Creates the building record.
- Creates an auth user for the admin (which sends an invitation email).
- Creates a profile with the `admin` role linked to the new building.
- Creates email preferences for the new admin.
- If any step fails, all previously created resources are rolled back.

### 3.4 Building Detail

| Property | Value |
|---|---|
| **Route** | `/super-admin/buildings/[id]` |
| **Component** | `components/super-admin/building-detail.tsx` |
| **Server Actions** | `lib/actions/super-admin.ts` -- `getBuildingDetail(id)`, `updateBuilding(id, formData)` |

**Displays**:

- Building information (name, address, total units, timezone) in an editable form.
- Users table showing all users associated with the building, including their roles and status.

**Features**:

- Inline edit mode with save and cancel controls.
- The building detail view provides a complete overview of the building and its occupants.

---

## 4. Admin Panel

The admin panel is the primary management interface for building administrators. It covers all operational aspects of running a residential building.

### 4.1 Dashboard

| Property | Value |
|---|---|
| **Route** | `/admin` |
| **Server Actions** | `lib/actions/analytics.ts` |

**KPI Cards**:

- Total apartments count
- Total owners count
- Upcoming reservations (next 7 days)
- Pending payments (outstanding charges)

**Charts** (6-month historical data):

| Chart | Component |
|---|---|
| Collection rate by month | `components/admin/charts/collection-rate-chart.tsx` |
| Occupancy rate | `components/admin/charts/occupancy-chart.tsx` |
| Maintenance request trends | `components/admin/charts/maintenance-trend-chart.tsx` |
| Visitor statistics | `components/admin/charts/visitor-stats-chart.tsx` |

**Quick Actions**:

- New apartment
- Invite owner
- Manage reservations

### 4.2 Apartments

| Property | Value |
|---|---|
| **Routes** | `/admin/apartments`, `/admin/apartments/new`, `/admin/apartments/[id]` |
| **Components** | `components/admin/apartment-table.tsx`, `components/admin/apartment-form.tsx` |
| **Server Actions** | `lib/actions/apartments.ts` -- `getApartments(search?)`, `getApartment(id)`, `createApartment(formData)`, `updateApartment(id, formData)`, `deleteApartment(id)` |

**Fields**:

- Unit number (unique within building)
- Floor
- Area (square meters)
- Number of bedrooms
- Number of bathrooms
- Status: `occupied` or `vacant`

**Features**:

- Search apartments by unit number.
- Full CRUD operations (create, read, update, delete).
- Apartment table with sortable columns.

### 4.3 Owners

| Property | Value |
|---|---|
| **Routes** | `/admin/owners`, `/admin/owners/invite`, `/admin/owners/[id]` |
| **Components** | `components/admin/owner-table.tsx`, `components/admin/invite-owner-form.tsx` |
| **Server Actions** | `lib/actions/owners.ts` (list, detail), `lib/actions/admin-users.ts` -- `inviteOwner(formData)` |

**Invite Flow**:

The owner invitation is a multi-step transactional process:

1. **Create auth user**: Uses the Supabase admin client to create a new user account. This automatically sends an invitation email with a link to set their password.
2. **Create profile**: Creates a profile record with the `owner` role, linked to the building.
3. **Link to apartment**: Associates the new owner with their apartment via the `apartment_owners` join table. Updates the apartment status to `occupied`.

If any step fails, cleanup runs in reverse order (apartment link removed, profile deleted, auth user deleted).

### 4.4 Common Spaces

| Property | Value |
|---|---|
| **Routes** | `/admin/spaces`, `/admin/spaces/new`, `/admin/spaces/[id]` |
| **Components** | `components/admin/space-card.tsx`, `components/admin/space-form.tsx`, `components/admin/availability-editor.tsx`, `components/admin/blackout-dates-manager.tsx` |
| **Server Actions** | `lib/actions/spaces.ts` -- `getSpaces()`, `getSpace(id)`, `createSpace(formData)`, `updateSpace(id, formData)`, `toggleSpaceActive(id, isActive)`, `updateSpacePhotos(id, photos[])` |

**Configuration Fields**:

| Field | Description |
|---|---|
| Capacity | Maximum number of people allowed |
| Hourly rate | Cost per hour of usage (0 for free spaces) |
| Deposit | Refundable deposit amount |
| Approval required | Whether admin must approve reservations |
| Advance booking limit | How far in advance reservations can be made |
| Max duration | Maximum booking duration in hours |
| Monthly limit per owner | Maximum bookings per owner per month |
| Gap between bookings | Required buffer time between consecutive bookings |
| Quiet hours | Time range during which the space cannot be booked |
| Cancellation policy | Free cancellation window in hours |

**Availability Schedule**:

- Defined per day of the week (Monday through Sunday).
- Each day can have its own open and close times, or be marked as unavailable.
- Managed via the `components/admin/availability-editor.tsx` component.
- Server actions: `lib/actions/schedules.ts`.

**Blackout Dates**:

- Specific dates when the space is unavailable (e.g., holidays, maintenance).
- Each blackout date includes an optional reason.
- Managed via `components/admin/blackout-dates-manager.tsx`.
- Server actions: `lib/actions/blackout-dates.ts`.

### 4.5 Reservations

| Property | Value |
|---|---|
| **Routes** | `/admin/reservations`, `/admin/reservations/pending` |
| **Components** | `components/admin/reservation-table.tsx`, `components/admin/reservation-filters.tsx`, `components/admin/payment-verification.tsx`, `components/admin/reservation-details-dialog.tsx`, `components/admin/cancel-reservation-dialog.tsx`, `components/shared/reservation-status-badge.tsx` |
| **Server Actions** | `lib/actions/admin-reservations.ts` (list, detail, status updates) |

**Filters**:

- Status (pending_payment, confirmed, cancelled, completed)
- Space (filter by specific common area)
- Date range

**Payment Verification Flow**:

1. Owner uploads a payment proof (receipt or transfer confirmation) from the portal.
2. Admin reviews the uploaded proof in the `payment-verification.tsx` component.
3. Admin either confirms or rejects the reservation.
4. Status updates trigger email notifications to the owner.

### 4.6 Maintenance

| Property | Value |
|---|---|
| **Routes** | `/admin/maintenance`, `/admin/maintenance/[id]` |
| **Components** | `components/admin/maintenance-table.tsx`, `components/admin/maintenance-filters.tsx`, `components/admin/maintenance-status-update.tsx`, `components/admin/realtime-refresh-wrapper.tsx` |
| **Server Actions** | `lib/actions/admin-maintenance.ts` -- `getMaintenanceRequests(filters)`, `updateMaintenanceStatus(id, status, assignedTo?)`, `addInternalNote(requestId, body)`, `getMaintenanceStats()` |

**Filters**:

- Status (open, in_progress, waiting_parts, resolved, closed)
- Priority (low, medium, high, urgent)
- Category

**Features**:

- **Status updates**: When an admin changes the status of a maintenance request, an email notification is sent to the requestor (respecting their email preferences).
- **Internal notes**: Admins can add internal notes that are not visible to the resident who submitted the request. These are useful for coordination between maintenance staff.
- **Assignment**: Requests can be assigned to specific maintenance personnel.
- **Real-time updates**: The maintenance list uses a real-time refresh wrapper (`realtime-refresh-wrapper.tsx`) that subscribes to Supabase Realtime for live updates when requests change.
- **Statistics**: `getMaintenanceStats()` provides aggregate data for the admin dashboard charts.

### 4.7 Visitors

| Property | Value |
|---|---|
| **Routes** | `/admin/visitors`, `/admin/visitors/[id]` |
| **Components** | `components/admin/visitor-table.tsx`, `components/admin/visitor-lookup.tsx`, `components/shared/visitor-access-code.tsx` |
| **Server Actions** | `lib/actions/admin-visitors.ts` |

**Features**:

- **Search**: Look up visitors by name or apartment number.
- **Today's visitors**: Badge indicator showing number of expected visitors for the current day.
- **Check-in/check-out tracking**: Front desk can record when visitors arrive and leave.
- **Access code display**: Each visitor has a unique access code that can be verified at entry.

### 4.8 Announcements

| Property | Value |
|---|---|
| **Routes** | `/admin/announcements`, `/admin/announcements/new` |
| **Component** | `components/admin/announcement-form.tsx` |
| **Server Actions** | `lib/actions/announcements.ts` -- `createAnnouncement(formData)`, `getAnnouncements()`, `deleteAnnouncement(id)` |

**Target Options**:

- `all` -- All building members
- `owners` -- Owners only
- `residents` -- Residents only

**Behavior**:

- When an announcement is created, email notifications are sent to all eligible members based on the target audience.
- Email delivery respects each user's email preferences (users who have disabled announcement notifications will not receive the email).
- Announcements can be deleted but not edited after creation.

### 4.9 Polls

| Property | Value |
|---|---|
| **Routes** | `/admin/polls`, `/admin/polls/new`, `/admin/polls/[id]` |
| **Components** | `components/admin/poll-form.tsx`, `components/admin/poll-table.tsx`, `components/admin/poll-results.tsx` |
| **Server Actions** | `lib/actions/admin-polls.ts` |

**Poll Types**:

- Single choice (radio buttons)
- Multiple choice (checkboxes)
- Yes/No (binary)

**Configuration**:

- Target audience (all, owners, residents)
- Anonymous voting option (when enabled, votes cannot be traced to individual users)
- Start date and end date
- Status lifecycle: `draft` -> `active` -> `closed`

**Features**:

- Admins can create polls in draft status and publish them later.
- Poll results are viewable in real time as votes come in.
- Polls automatically close when the end date passes.

### 4.10 Documents

| Property | Value |
|---|---|
| **Routes** | `/admin/documents`, `/admin/documents/upload` |
| **Components** | `components/admin/document-table.tsx`, `components/admin/document-upload-form.tsx` |
| **Server Actions** | `lib/actions/documents.ts` -- `uploadDocument(formData)`, `getDocuments(category?)`, `deleteDocument(id)`, `uploadNewVersion(documentId, formData)` |

**Categories**:

- Rules (building rules and regulations)
- Minutes (meeting minutes)
- Contracts (legal agreements)
- Notices (official notices)
- Forms (downloadable forms for residents)

**Features**:

- **Target audience**: Documents can be targeted to `all`, `owners`, or `residents`. Users only see documents intended for their role.
- **Versioning**: Documents support version chains. When a new version is uploaded via `uploadNewVersion`, it is linked to the original document, preserving the full version history.
- **Soft delete**: Documents are soft-deleted (marked as deleted but not physically removed from storage).
- **Category filtering**: Documents can be filtered by category.

### 4.11 Packages

| Property | Value |
|---|---|
| **Route** | `/admin/packages` |
| **Components** | `components/admin/package-table.tsx`, `components/admin/package-log-form.tsx` |
| **Server Actions** | `lib/actions/admin-packages.ts` |

**Fields**:

- Tracking number
- Carrier (e.g., FedEx, UPS, DHL, USPS, other)
- Description
- Apartment (which unit the package is for)
- Status: `pending` -> `notified` -> `picked_up`

**Behavior**:

- When a package arrives, the admin logs it with tracking details and the destination apartment.
- The system notifies the apartment owner that a package is waiting.
- When the owner picks up the package, the admin updates the status to `picked_up`.

### 4.12 Fees and Financial Management

| Property | Value |
|---|---|
| **Route** | `/admin/fees` |
| **Components** | `components/admin/fees-dashboard.tsx`, `components/admin/fee-type-form.tsx`, `components/admin/fee-type-table.tsx`, `components/admin/generate-charges-form.tsx`, `components/admin/record-payment-form.tsx`, `components/admin/charges-table.tsx`, `components/admin/financial-summary.tsx` |
| **Server Actions** | `lib/actions/admin-fees.ts` |

**Fee Types**:

| Type | Description |
|---|---|
| `maintenance_fee` | Monthly building maintenance fee |
| `common_area` | Common area usage charges |
| `parking` | Parking space rental |
| `special_assessment` | One-time special assessments |
| `other` | Miscellaneous fees |

**Features**:

- **Define fee types**: Admins create fee type definitions with a name, category, and default amount.
- **Bulk charge generation**: Generate charges for all apartments for a given period (month/year). Each apartment receives a charge record based on the selected fee type and amount.
- **Manual payment recording**: Record payments received via bank transfer, cash, check, or other methods. Each payment is linked to a specific charge.
- **Charge status tracking**: Charges progress through statuses: `pending` -> `paid`, or `pending` -> `overdue` -> `paid`. Partial payments are tracked with `partial` status.
- **Financial summary**: Dashboard view showing collection rates (percentage of charges paid), total outstanding amounts, and trends over time.

### 4.13 Audit Log

| Property | Value |
|---|---|
| **Route** | `/admin/audit` |
| **Components** | `components/admin/audit-log-table.tsx`, `components/admin/audit-filters.tsx` |
| **Server Actions** | `lib/actions/admin-audit.ts` -- `getAuditLogs(filters)`, `getAuditUsers()` |

**Filters**:

- Action type: `create`, `update`, `delete`
- Table name (which database table was affected)
- User (who performed the action)
- Date range

**Features**:

- Paginated list of all auditable actions in the system.
- Each audit log entry includes the old data and new data, allowing admins to see exactly what changed.
- `getAuditUsers()` returns a list of users who have performed auditable actions, used to populate the user filter dropdown.

### 4.14 Reports

| Property | Value |
|---|---|
| **Route** | `/admin/reports` |
| **Component** | `components/admin/report-generator.tsx` |
| **Server Actions** | `lib/actions/reports.ts` |

**Features**:

- Custom report generation covering financial, occupancy, and maintenance data.
- Reports can be filtered by date range and category.

### 4.15 Building Settings

| Property | Value |
|---|---|
| **Route** | `/admin/settings` |
| **Component** | `components/admin/building-settings-form.tsx` |
| **Server Actions** | `lib/actions/building-settings.ts` -- `getBuildingSettings()`, `updateBuildingSettings(formData)` |

**Sections**:

**General Settings**:

- Building name
- Address
- Total units
- Payment deadline (hours) -- how long owners have to submit payment proof after making a reservation
- Timezone

**Bank Account Settings**:

- Bank name
- Account number
- Account type (`checking` or `savings`)
- Account holder name

These bank details are displayed to owners when they need to make payments, so they know where to transfer funds.

---

## 5. Owner/Resident Portal

The portal is the resident-facing interface where apartment owners and residents can manage their day-to-day interactions with the building.

### 5.1 Dashboard

| Property | Value |
|---|---|
| **Route** | `/portal` |
| **Components** | `components/portal/summary-cards.tsx`, `components/portal/announcements-feed.tsx` |

**Displays**:

- Welcome message with user name
- Apartment information (unit number, floor, area)
- Summary cards: financial overview (outstanding balance), active reservations count
- Quick action buttons for common tasks
- Upcoming reservations (top 5 nearest future bookings)
- Recent announcements feed (latest building announcements)

### 5.2 Browse Spaces

| Property | Value |
|---|---|
| **Routes** | `/portal/spaces`, `/portal/spaces/[id]` |
| **Server Actions** | `lib/actions/spaces.ts` |

**Displays**:

- Grid of all active common spaces.
- Each space card shows: photos, name, capacity, hourly rate, amenities list.
- A "Reserve" button on each card leads to the booking flow.

### 5.3 Reservations

| Property | Value |
|---|---|
| **Routes** | `/portal/reservations`, `/portal/reservations/[id]`, `/portal/reservations/new/[spaceId]` |
| **Components** | `components/portal/booking-flow.tsx`, `components/portal/reservation-calendar.tsx`, `components/portal/time-slot-picker.tsx`, `components/portal/payment-upload.tsx` |
| **Server Actions** | `lib/actions/reservations.ts` -- `createReservation(data)`, `getMyReservations(filter)`, `getReservation(id)`, `uploadPaymentProof(reservationId, fileUrl)`, `cancelReservation(reservationId, reason?)` |

**Booking Flow**:

1. **Select date**: The owner picks a date on the reservation calendar. The calendar shows available dates based on the space's schedule and blackout dates. Each day displays a colored occupancy dot indicator: green (some bookings, < 50% occupied), amber (mostly booked, 50-90%), or red (fully booked, 90%+). Hovering a dot shows a tooltip with the occupancy level. Below the calendar, a **daily timeline bar** visualizes the selected day's schedule with green (available) and red (occupied) blocks, hour markers, and tooltips showing exact reservation times. Occupancy data updates in real-time via Supabase Realtime.
2. **Choose time slot**: Available time slots for the selected date are displayed via the `time-slot-picker.tsx` component. Slots already booked by others are greyed out.
3. **Confirm booking**: A summary of the booking details is shown (space, date, time, duration, cost breakdown).
4. **Upload payment proof**: If the space has an hourly rate greater than zero, the owner must upload proof of payment (bank transfer receipt, etc.). If the space is free (hourly rate = 0), the reservation is auto-confirmed.

**Validation Rules**:

- Space must be active.
- Selected date must not be a blackout date.
- Selected time must fall within the space's schedule for that day of the week.
- Selected time must not overlap with existing reservations (including the gap buffer).
- Quiet hours are respected (cannot book during quiet hours).
- Monthly booking limit per owner is enforced.
- Advance booking limit is enforced (cannot book too far into the future).
- Maximum duration is enforced.

**Cost Calculation**:

```
Total = (duration_in_hours * hourly_rate) + deposit
```

If the total is zero, the reservation status is set to `confirmed` immediately. Otherwise, it is set to `pending_payment` and the owner has until the payment deadline (configured in building settings) to upload proof.

**Cancellation**:

- Owners can cancel their own reservations with an optional reason.
- The cancellation policy (configured per space) determines whether a refund applies.

### 5.4 Maintenance Requests

| Property | Value |
|---|---|
| **Routes** | `/portal/maintenance`, `/portal/maintenance/new`, `/portal/maintenance/[id]` |
| **Components** | `components/portal/maintenance-request-form.tsx`, `components/shared/maintenance-comments.tsx` |
| **Server Actions** | `lib/actions/maintenance.ts` -- `createMaintenanceRequest(data)`, `getMyMaintenanceRequests(filter)`, `getMaintenanceRequest(id)`, `addComment(requestId, body)` |

**Fields** (when creating a request):

- Title
- Description
- Category (plumbing, electrical, structural, appliance, pest_control, other)
- Priority (low, medium, high, urgent)
- Photos (optional, uploaded via `components/shared/image-upload.tsx`)

**Filters**:

- Open: Shows requests with status `open`, `in_progress`, or `waiting_parts`
- Resolved: Shows requests with status `resolved` or `closed`
- All: Shows all requests regardless of status

**Features**:

- Owners can track the status of their requests in real time.
- A comment thread (`maintenance-comments.tsx`) allows back-and-forth communication between the owner and building management.
- Internal notes added by admins are not visible to the owner.

### 5.5 Visitors

| Property | Value |
|---|---|
| **Routes** | `/portal/visitors`, `/portal/visitors/new` |
| **Components** | `components/portal/visitor-register-form.tsx`, `components/shared/visitor-access-code.tsx` |
| **Server Actions** | `lib/actions/visitors.ts` -- `registerVisitor(data)`, `getMyVisitors(filter)`, `cancelVisitor(id)` |

**Features**:

- **Access code generation**: When a visitor is registered, the system generates a unique 8-character hexadecimal access code. This code can be shared with the visitor and verified by building security.
- **Recurring visitors**: Support for recurring visit schedules with frequencies of `daily`, `weekly`, or `monthly`.
- **Date range**: Each visitor registration has a `valid_from` and `valid_until` date, defining the window during which the access code is active.
- **Cancellation**: Owners can cancel a visitor registration, which invalidates the access code.

### 5.6 Fees and Payments

| Property | Value |
|---|---|
| **Routes** | `/portal/fees`, `/portal/fees/history` |
| **Components** | `components/portal/my-balance-card.tsx`, `components/portal/my-charges-list.tsx` |
| **Server Actions** | `lib/actions/fees.ts` -- `getMyCharges(filter)`, `getMyPayments()`, `getMyBalance()` |

**Filters**:

- Pending: Shows charges with status `pending`, `overdue`, or `partial`
- Paid: Shows charges with status `paid`
- All: Shows all charges

**Features**:

- **Balance card**: Displays the owner's current outstanding balance (sum of all unpaid charges).
- **Charges list**: Itemized list of all charges with fee type, amount, due date, and status.
- **Payment history**: Complete record of all payments made by the owner.

### 5.7 Documents

| Property | Value |
|---|---|
| **Route** | `/portal/documents` |
| **Component** | `components/portal/document-browser.tsx` |
| **Server Actions** | `lib/actions/documents.ts` -- `getDocuments(category?)` |

**Features**:

- Browse documents by category (rules, minutes, contracts, notices, forms).
- Download documents directly.
- The document list respects the target audience: owners see documents targeted to `all` and `owners`; residents see documents targeted to `all` and `residents`.

### 5.8 Polls

| Property | Value |
|---|---|
| **Routes** | `/portal/polls`, `/portal/polls/[id]` |
| **Components** | `components/portal/poll-vote-form.tsx`, `components/portal/poll-results-display.tsx` |
| **Server Actions** | `lib/actions/polls.ts` -- `getActivePolls()`, `castVote(pollId, optionIds[])`, `getPollResults(pollId)` |

**Features**:

- View and vote on active polls that target the user's role.
- For single-choice polls, only one option can be selected. For multiple-choice, multiple options are allowed.
- After voting, the user can see the current results.
- For closed polls, only results are displayed.
- When anonymous voting is enabled, the results page does not show who voted for what.

### 5.9 Packages

| Property | Value |
|---|---|
| **Route** | `/portal/packages` |
| **Component** | `components/portal/my-packages-list.tsx` |
| **Server Actions** | `lib/actions/packages.ts` -- `getMyPackages()` |

**Features**:

- View all packages addressed to the user's apartment(s).
- Each package shows: tracking number, carrier, description, date received, and current status.
- Status indicators: `pending` (waiting at front desk), `notified` (owner has been notified), `picked_up` (collected).

### 5.10 Profile

| Property | Value |
|---|---|
| **Route** | `/portal/profile` |
| **Components** | `components/portal/profile-form.tsx`, `components/portal/change-password-form.tsx`, `components/portal/email-preferences-form.tsx` |
| **Server Actions** | `lib/actions/auth.ts` -- `updateMyProfile(values)`, `setPassword(formData)`; `lib/actions/email-preferences.ts` -- `getEmailPreferences()`, `updateEmailPreferences(prefs)` |

**Profile Fields**:

- Full name
- Phone number
- National ID
- Emergency contact name
- Emergency contact phone
- Preferred locale (`en` for English, `es` for Spanish)
- Avatar (profile picture)

**Password Change**:

- Current password (not required for users who signed up via invitation and haven't set a password)
- New password (minimum 8 characters)
- Confirm new password

**Email Preferences** (toggles):

| Preference | Description |
|---|---|
| Charges | Notifications when new charges are generated |
| Maintenance | Updates on maintenance request status changes |
| Visitors | Notifications when visitors check in |
| Announcements | Building announcement emails |
| Overdue reminders | Reminders for overdue payment charges |

---

## 6. Cross-Cutting Features

These features span multiple areas of the application and are not tied to a single route.

### 6.1 Notifications

| Property | Value |
|---|---|
| **Server Actions** | `lib/actions/notifications.ts` |
| **Component** | `components/notifications/notification-list.tsx` |
| **Hook** | `use-realtime-notifications.ts` |

**In-App Notifications**:

- A notification bell icon in the header displays unread notification count.
- Clicking the bell opens a dropdown list of recent notifications.
- Notifications are delivered in real time via Supabase Realtime subscriptions.
- Each notification links to the relevant resource (e.g., a maintenance request, a reservation).

**Email Notifications** (via Resend):

- Sent for key events: new charges, maintenance updates, visitor check-ins, announcements, overdue reminders.
- Delivery respects each user's email preferences. If a user has disabled a notification category, the email is not sent.
- Email templates are localized based on the user's preferred locale.

### 6.2 Command Palette

| Property | Value |
|---|---|
| **Component** | `components/shared/command-palette.tsx` |
| **Server Actions** | `lib/actions/search.ts` |

**Features**:

- Global search and command palette accessible via keyboard shortcut.
- Searches across apartments, owners, spaces, and other entities.
- Provides quick navigation to any section of the admin panel or portal.

### 6.3 PWA Support

| Property | Value |
|---|---|
| **Component** | `components/shared/pwa-register.tsx` |
| **Offline Page** | `app/offline/page.tsx` |

**Features**:

- The application is a Progressive Web App and can be installed on mobile devices and desktops.
- A service worker is registered for offline support.
- When the user is offline, the application displays a dedicated offline page.

### 6.4 Theme Support

| Property | Value |
|---|---|
| **Component** | `components/layout/theme-toggle.tsx` |
| **Provider** | `components/theme-provider.tsx` |

**Features**:

- Light and dark mode toggle.
- System preference detection (automatically matches the operating system's theme).
- Theme preference is persisted across sessions.
- Implemented using the `next-themes` library.

### 6.5 Internationalization (i18n)

| Property | Value |
|---|---|
| **Component** | `components/layout/language-switcher.tsx` |
| **Message Files** | `messages/en.json`, `messages/es.json` |
| **Routing** | `i18n/routing.ts` |
| **Middleware** | `middleware.ts` (uses `next-intl` middleware) |

**Supported Languages**:

- English (`en`)
- Spanish (`es`)

**Features**:

- Language switcher in the application header.
- All UI text is externalized into message files.
- Routes are locale-prefixed (e.g., `/en/admin`, `/es/portal`).
- The user's preferred locale (set in their profile) determines the default language.
- Email notifications are sent in the user's preferred locale.

### 6.6 Real-Time Updates

Real-time functionality is implemented via Supabase Realtime subscriptions. The following data channels support live updates:

| Channel | Description |
|---|---|
| Space availability | Reflects booking changes immediately on the calendar |
| Maintenance requests | Admin sees new requests and status changes without refreshing |
| Notifications | In-app notification bell updates in real time |
| Payment status | Reservation payment status changes appear live |
| Visitor check-in/out | Front desk sees visitor arrivals and departures in real time |

---

## 7. API Routes and Cron Jobs

### 7.1 Auth Callback

| Property | Value |
|---|---|
| **Route** | `GET /api/auth/callback` |
| **File** | `app/api/auth/callback/route.ts` |

Handles OAuth callback from Supabase. Exchanges the authorization code in the query string for a session cookie.

### 7.2 Sign Out

| Property | Value |
|---|---|
| **Route** | `POST /api/auth/signout` |
| **File** | `app/api/auth/signout/route.ts` |

Signs out the current user and redirects to `/login`.

### 7.3 Auto-Cancel Reservations (Cron)

| Property | Value |
|---|---|
| **Route** | `GET /api/cron/auto-cancel` |
| **File** | `app/api/cron/auto-cancel/route.ts` |
| **Schedule** | Daily at 08:00 UTC (`0 8 * * *`) |
| **Auth** | Bearer token via `CRON_SECRET` environment variable |

**Behavior**:

1. Queries the `reservations` table for all records with status `pending_payment` where the `payment_deadline` timestamp has passed.
2. Updates all matching reservations to status `cancelled` with the reason "Payment deadline exceeded".
3. Returns a JSON response with the count of cancelled reservations.

**Error Handling**:

- Returns 401 if the authorization header does not match the `CRON_SECRET`.
- Returns 500 with the error message if any database query fails.
- Returns `{ cancelled: 0 }` if no expired reservations are found.

### 7.4 Overdue Charges (Cron)

| Property | Value |
|---|---|
| **Route** | `GET /api/cron/overdue-charges` |
| **File** | `app/api/cron/overdue-charges/route.ts` |
| **Schedule** | Daily at 09:00 UTC (`0 9 * * *`) |
| **Auth** | Bearer token via `CRON_SECRET` environment variable |

**Behavior**:

1. Queries the `charges` table for all records with status `pending` where the `due_date` is before today.
2. Updates all matching charges to status `overdue`.
3. For each overdue charge, looks up the apartment owners and sends an overdue reminder email via `sendNotificationEmail`.
4. Email sending is fire-and-forget (errors are caught and silently ignored to avoid blocking the cron job).
5. Returns a JSON response with the count of charges marked overdue.

**Optimization**:

- Fee types and apartment owners are fetched in batch queries (one query per entity type) rather than per-charge, minimizing database round trips.
- Lookup maps are built in memory for efficient cross-referencing.

---

## 8. Middleware and Route Protection

| Property | Value |
|---|---|
| **File** | `middleware.ts` |
| **Matcher** | `/((?!api|trpc|_next|_vercel|.*\\..*).*)` |

**Public Paths** (accessible without authentication):

- `/login`
- `/forgot-password`
- `/set-password`
- `/setup`

**Protected Paths** (require authentication):

- `/admin/*` -- Admin panel routes
- `/portal/*` -- Owner/resident portal routes
- `/super-admin/*` -- Super admin routes
- `/` -- Root route (redirects based on role)

**Middleware Chain**:

1. **Internationalization**: The `next-intl` middleware runs first, handling locale detection and URL prefixing.
2. **Session refresh**: The Supabase middleware refreshes the session token if needed.
3. **Cookie merging**: Cookies from the Supabase response are merged into the intl response.
4. **Route protection**:
   - Unauthenticated users accessing dashboard routes are redirected to `/login`.
   - Authenticated users accessing auth routes (login, forgot-password, etc.) are redirected to `/`.

**Locale Handling**:

- Routes are locale-prefixed (e.g., `/en/admin/apartments`, `/es/portal/maintenance`).
- The middleware strips the locale prefix before evaluating route protection rules.
- Supported locales are defined in `i18n/routing.ts`.

---

## Appendix A: Server Action Files Reference

| File | Domain |
|---|---|
| `lib/actions/admin-audit.ts` | Audit log queries and filters |
| `lib/actions/admin-fees.ts` | Fee type management, charge generation, payment recording |
| `lib/actions/admin-maintenance.ts` | Maintenance request management (admin side) |
| `lib/actions/admin-packages.ts` | Package logging and status updates |
| `lib/actions/admin-polls.ts` | Poll creation and management |
| `lib/actions/admin-reservations.ts` | Reservation management and payment verification |
| `lib/actions/admin-users.ts` | Owner invitation and user management |
| `lib/actions/admin-visitors.ts` | Visitor management (admin side) |
| `lib/actions/analytics.ts` | Dashboard analytics and KPI data |
| `lib/actions/announcements.ts` | Announcement creation and delivery |
| `lib/actions/apartments.ts` | Apartment CRUD operations |
| `lib/actions/auth.ts` | Authentication, profile updates, password management |
| `lib/actions/blackout-dates.ts` | Space blackout date management |
| `lib/actions/building-settings.ts` | Building configuration |
| `lib/actions/documents.ts` | Document upload, versioning, and retrieval |
| `lib/actions/email-preferences.ts` | User email preference management |
| `lib/actions/fees.ts` | Owner-facing charge and payment queries |
| `lib/actions/helpers.ts` | Shared utility functions for actions |
| `lib/actions/maintenance.ts` | Maintenance requests (owner/resident side) |
| `lib/actions/notifications.ts` | In-app notification management |
| `lib/actions/owners.ts` | Owner listing and detail queries |
| `lib/actions/packages.ts` | Owner-facing package queries |
| `lib/actions/polls.ts` | Voting and poll result queries |
| `lib/actions/reports.ts` | Report generation |
| `lib/actions/reservations.ts` | Reservation booking, payment upload, cancellation |
| `lib/actions/schedules.ts` | Space availability schedule management |
| `lib/actions/search.ts` | Global search for command palette |
| `lib/actions/setup.ts` | Initial setup wizard |
| `lib/actions/spaces.ts` | Common space CRUD and configuration |
| `lib/actions/super-admin.ts` | Building management and super admin operations |
| `lib/actions/visitors.ts` | Visitor registration (owner/resident side) |

## Appendix B: Component Directory Structure

```
components/
  admin/
    apartment-form.tsx
    apartment-table.tsx
    announcement-form.tsx
    audit-filters.tsx
    audit-log-table.tsx
    availability-editor.tsx
    blackout-dates-manager.tsx
    building-settings-form.tsx
    cancel-reservation-dialog.tsx
    charges-table.tsx
    charts/
      collection-rate-chart.tsx
      maintenance-trend-chart.tsx
      occupancy-chart.tsx
      visitor-stats-chart.tsx
    document-table.tsx
    document-upload-form.tsx
    fee-type-form.tsx
    fee-type-table.tsx
    fees-dashboard.tsx
    financial-summary.tsx
    generate-charges-form.tsx
    invite-owner-form.tsx
    maintenance-filters.tsx
    maintenance-status-update.tsx
    maintenance-table.tsx
    owner-table.tsx
    package-log-form.tsx
    package-table.tsx
    payment-verification.tsx
    poll-form.tsx
    poll-results.tsx
    poll-table.tsx
    realtime-refresh-wrapper.tsx
    record-payment-form.tsx
    report-generator.tsx
    reservation-details-dialog.tsx
    reservation-filters.tsx
    reservation-table.tsx
    space-card.tsx
    space-form.tsx
    visitor-lookup.tsx
    visitor-table.tsx
  layout/
    header.tsx
    language-switcher.tsx
    sidebar.tsx
    super-admin-sidebar.tsx
    theme-toggle.tsx
  notifications/
    notification-list.tsx
  portal/
    announcements-feed.tsx
    booking-flow.tsx
    change-password-form.tsx
    document-browser.tsx
    email-preferences-form.tsx
    maintenance-request-form.tsx
    my-balance-card.tsx
    my-charges-list.tsx
    my-packages-list.tsx
    payment-upload.tsx
    poll-results-display.tsx
    poll-vote-form.tsx
    profile-form.tsx
    reservation-calendar.tsx
    summary-cards.tsx
    time-slot-picker.tsx
    visitor-register-form.tsx
  shared/
    command-palette.tsx
    image-upload.tsx
    maintenance-comments.tsx
    pwa-register.tsx
    reservation-status-badge.tsx
    visitor-access-code.tsx
  super-admin/
    building-card.tsx
    create-building-form.tsx
  theme-provider.tsx
  ui/
    (shadcn/ui primitives)
```

## Appendix C: Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Base URL of the application (used in email links) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin operations) |
| `CRON_SECRET` | Bearer token for authenticating cron job requests |
| `RESEND_API_KEY` | API key for the Resend email service |
