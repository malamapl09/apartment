export type UserRole = "super_admin" | "admin" | "owner" | "resident";

export type ApartmentStatus = "occupied" | "vacant";

export type ReservationStatus =
  | "pending_payment"
  | "payment_submitted"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rejected";

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
  requires_approval: boolean;
  min_advance_hours: number;
  max_advance_days: number;
  max_duration_hours: number;
  max_monthly_per_owner: number;
  gap_minutes: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
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

// Extended types with joins
export interface ApartmentWithOwners extends Apartment {
  apartment_owners: (ApartmentOwner & { profiles: Profile })[];
}

export interface ReservationWithDetails extends Reservation {
  public_spaces: PublicSpace;
  profiles: Profile;
}
