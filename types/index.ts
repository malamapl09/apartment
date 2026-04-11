export type UserRole = "super_admin" | "admin" | "owner" | "resident";

export type ApartmentStatus = "occupied" | "vacant";

export type ReservationStatus =
  | "pending_payment"
  | "payment_submitted"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rejected";

export type SpaceActivityStatus = "active" | "cancelled";

export type AnnouncementTarget = "all" | "owners" | "residents";

export interface Building {
  id: string;
  name: string;
  address: string | null;
  total_units: number | null;
  bank_account_info: BankAccountInfo | null;
  payment_deadline_hours: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccountInfo {
  bank_name: string;
  account_number: string;
  account_type: string;
  holder_name: string;
}

export interface Profile {
  id: string;
  building_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  national_id: string | null;
  emergency_contact: EmergencyContact | null;
  avatar_url: string | null;
  preferred_locale: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Apartment {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number | null;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: ApartmentStatus;
  created_at: string;
  updated_at: string;
}

export interface ApartmentOwner {
  id: string;
  apartment_id: string;
  profile_id: string;
  is_primary: boolean;
  move_in_date: string | null;
  move_out_date: string | null;
}

export interface PublicSpace {
  id: string;
  building_id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  photos: string[];
  hourly_rate: number;
  deposit_amount: number;
  allow_reservations: boolean;
  min_advance_hours: number;
  max_advance_days: number;
  max_duration_hours: number;
  max_monthly_per_owner: number;
  gap_minutes: number;
  max_hours_per_day_per_user: number | null;
  max_hours_per_week_per_user: number | null;
  max_hours_per_month_per_user: number | null;
  cancellation_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySchedule {
  id: string;
  space_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface BlackoutDate {
  id: string;
  space_id: string;
  date: string;
  reason: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface RecurringBlackout {
  id: string;
  space_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export type InfractionSeverity = "minor" | "major" | "severe";

export interface Infraction {
  id: string;
  building_id: string;
  profile_id: string | null;
  space_id: string | null;
  occurred_at: string;
  severity: InfractionSeverity;
  description: string;
  created_by: string;
  created_at: string;
}

export interface UserRestriction {
  id: string;
  building_id: string;
  profile_id: string | null;
  space_id: string | null;
  infraction_id: string | null;
  reason: string;
  starts_at: string;
  ends_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  created_by: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  building_id: string;
  space_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  reference_code: string;
  payment_amount: number | null;
  payment_proof_url: string | null;
  payment_verified_by: string | null;
  payment_verified_at: string | null;
  payment_rejected_reason: string | null;
  payment_deadline: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SpaceActivity {
  id: string;
  building_id: string;
  space_id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: SpaceActivityStatus;
  cancelled_by: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_end_date: string | null;
  recurrence_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceActivityWithUser extends SpaceActivity {
  profiles: Pick<Profile, "id" | "full_name">;
}

export interface Announcement {
  id: string;
  building_id: string;
  title: string;
  body: string;
  target: AnnouncementTarget;
  created_by: string | null;
  published_at: string;
  expires_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  building_id: string | null;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

// Document Sharing
export type DocumentCategory = "rules" | "minutes" | "contracts" | "notices" | "forms";
export type DocumentTarget = "all" | "owners" | "residents";

export interface Document {
  id: string;
  building_id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  previous_version_id: string | null;
  target: DocumentTarget;
  uploaded_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithUploader extends Document {
  profiles: Pick<Profile, "id" | "full_name"> | null;
}

// Maintenance Requests
export type MaintenanceCategory = "plumbing" | "electrical" | "hvac" | "structural" | "pest_control" | "general";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "in_progress" | "waiting_parts" | "resolved" | "closed";

export interface MaintenanceRequest {
  id: string;
  building_id: string;
  apartment_id: string | null;
  requested_by: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  photos: string[];
  assigned_to: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  reference_code: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceComment {
  id: string;
  request_id: string;
  user_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  profiles: Pick<Profile, "id" | "full_name" | "email">;
  apartments: Pick<Apartment, "id" | "unit_number"> | null;
  maintenance_comments: (MaintenanceComment & { profiles: Pick<Profile, "id" | "full_name"> })[];
}

// Visitor Management
export type VisitorStatus = "expected" | "checked_in" | "checked_out" | "expired" | "cancelled";
export type RecurrencePattern = "daily" | "weekly" | "monthly";

export interface Visitor {
  id: string;
  building_id: string;
  apartment_id: string;
  registered_by: string;
  visitor_name: string;
  visitor_id_number: string | null;
  visitor_phone: string | null;
  vehicle_plate: string | null;
  vehicle_description: string | null;
  purpose: string | null;
  access_code: string;
  valid_from: string;
  valid_until: string;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_end_date: string | null;
  status: VisitorStatus;
  checked_in_at: string | null;
  checked_out_at: string | null;
  checked_in_by: string | null;
  checked_out_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitorWithDetails extends Visitor {
  profiles: Pick<Profile, "id" | "full_name">;
  apartments: Pick<Apartment, "id" | "unit_number">;
}

export interface VisitorCompanion {
  id: string;
  visitor_id: string;
  position: number;
  name: string;
  id_number: string | null;
  phone: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_out_at: string | null;
  checked_out_by: string | null;
  created_at: string;
}

export interface VisitorWithCompanions extends VisitorWithDetails {
  visitor_companions: VisitorCompanion[];
}

// Expense/Fee Tracking
export type FeeCategory = "maintenance_fee" | "common_area" | "parking" | "special_assessment" | "other";
export type ChargeStatus = "pending" | "paid" | "overdue" | "partial";
export type PaymentMethod = "bank_transfer" | "cash" | "check" | "other";

export interface FeeType {
  id: string;
  building_id: string;
  name: string;
  category: FeeCategory;
  default_amount: number;
  is_recurring: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Charge {
  id: string;
  building_id: string;
  apartment_id: string;
  fee_type_id: string;
  amount: number;
  due_date: string;
  period_month: number;
  period_year: number;
  status: ChargeStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChargeWithDetails extends Charge {
  fee_types: FeeType;
  apartments: Pick<Apartment, "id" | "unit_number">;
  payments: Payment[];
}

export interface Payment {
  id: string;
  charge_id: string;
  building_id: string;
  apartment_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | null;
  reference_number: string | null;
  proof_url: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

// Extended types with joins
export interface ApartmentWithOwners extends Apartment {
  apartment_owners: (ApartmentOwner & { profiles: Profile })[];
}

export interface ReservationWithDetails extends Reservation {
  public_spaces: PublicSpace;
  profiles: Profile;
}

// Polls & Voting
export type PollType = "single_choice" | "multiple_choice" | "yes_no";
export type PollStatus = "draft" | "active" | "closed";

export interface Poll {
  id: string;
  building_id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  target: "all" | "owners" | "residents";
  created_by: string | null;
  starts_at: string;
  ends_at: string;
  is_anonymous: boolean;
  status: PollStatus;
  created_at: string;
  updated_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  apartment_id: string | null;
  created_at: string;
}

export interface PollWithDetails extends Poll {
  poll_options: PollOption[];
  poll_votes: PollVote[];
  created_by_profile?: { full_name: string } | null;
}

export interface PollListItem extends Poll {
  poll_options: PollOption[];
  poll_votes: { count: number }[];
  created_by_profile?: { full_name: string } | null;
}

// Package/Delivery Tracking
export type PackageStatus = "pending" | "notified" | "picked_up";

export interface Package {
  id: string;
  building_id: string;
  apartment_id: string;
  tracking_number: string | null;
  carrier: string | null;
  description: string;
  received_by: string | null;
  received_at: string;
  picked_up_by: string | null;
  picked_up_at: string | null;
  status: PackageStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageWithDetails extends Package {
  apartments: { id: string; unit_number: string };
  received_by_profile?: { id: string; full_name: string } | null;
  picked_up_by_profile?: { id: string; full_name: string } | null;
}

// Email Preferences
export interface EmailPreferences {
  id: string;
  user_id: string;
  new_charges: boolean;
  maintenance_updates: boolean;
  visitor_checkins: boolean;
  new_announcements: boolean;
  overdue_reminders: boolean;
}

export interface BuildingWithStats extends Building {
  user_count: number;
  admin_count: number;
}
