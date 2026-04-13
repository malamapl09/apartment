import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { NewChargeEmail } from "@/lib/email/templates/new-charge";
import { MaintenanceUpdateEmail } from "@/lib/email/templates/maintenance-update";
import { VisitorCheckinEmail } from "@/lib/email/templates/visitor-checkin";
import { NewAnnouncementEmail } from "@/lib/email/templates/new-announcement";
import { OverdueReminderEmail } from "@/lib/email/templates/overdue-reminder";
import { PackageReceivedEmail } from "@/lib/email/templates/package-received";
import { DocumentAcknowledgmentRequiredEmail } from "@/lib/email/templates/document-acknowledgment-required";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app";

type NotificationType =
  | "new_charges"
  | "maintenance_updates"
  | "visitor_checkins"
  | "new_announcements"
  | "overdue_reminders"
  | "package_received"
  | "document_ack_required";

interface NewChargeProps {
  fullName: string;
  amount: string;
  feeType: string;
  dueDate: string;
  apartmentUnit: string;
  appUrl: string;
}

interface MaintenanceUpdateProps {
  fullName: string;
  referenceCode: string;
  title: string;
  newStatus: string;
  requestId?: string;
  appUrl: string;
}

interface VisitorCheckinProps {
  fullName: string;
  visitorName: string;
  buildingName: string;
  checkedInAt: string;
  appUrl: string;
}

interface NewAnnouncementProps {
  fullName: string;
  announcementTitle: string;
  announcementBody: string;
  buildingName: string;
  appUrl: string;
}

interface OverdueReminderProps {
  fullName: string;
  amount: string;
  feeType: string;
  dueDate: string;
  apartmentUnit: string;
  appUrl: string;
}

interface PackageReceivedProps {
  fullName: string;
  unitNumber: string;
  description: string;
  carrier: string;
  buildingName: string;
  receivedAt: string;
  appUrl: string;
}

interface DocumentAckRequiredProps {
  fullName: string;
  documentTitle: string;
  buildingName: string;
  appUrl: string;
}

type NotificationPayload =
  | { type: "new_charges"; props: NewChargeProps }
  | { type: "maintenance_updates"; props: MaintenanceUpdateProps }
  | { type: "visitor_checkins"; props: VisitorCheckinProps }
  | { type: "new_announcements"; props: NewAnnouncementProps }
  | { type: "overdue_reminders"; props: OverdueReminderProps }
  | { type: "package_received"; props: PackageReceivedProps }
  | { type: "document_ack_required"; props: DocumentAckRequiredProps };

interface SendNotificationEmailOptions {
  userId: string;
  type: NotificationType;
  templateProps: Record<string, string>;
}

const subjectMap: Record<NotificationType, (props: Record<string, string>) => string> = {
  new_charges: (props) => `New Charge: $${props.amount} for ${props.feeType}`,
  maintenance_updates: (props) =>
    `Maintenance Update: ${props.referenceCode} - ${props.newStatus}`,
  visitor_checkins: (props) => `Visitor Checked In: ${props.visitorName}`,
  new_announcements: (props) => `New Announcement: ${props.announcementTitle}`,
  overdue_reminders: (props) =>
    `Overdue Reminder: $${props.amount} for ${props.feeType}`,
  package_received: (props) =>
    `Package Received for Apartment ${props.unitNumber}`,
  document_ack_required: (props) =>
    `Action required: Please acknowledge "${props.documentTitle}"`,
};

function buildTemplate(payload: NotificationPayload): React.ReactElement {
  switch (payload.type) {
    case "new_charges":
      return NewChargeEmail(payload.props);
    case "maintenance_updates":
      return MaintenanceUpdateEmail(payload.props);
    case "visitor_checkins":
      return VisitorCheckinEmail(payload.props);
    case "new_announcements":
      return NewAnnouncementEmail(payload.props);
    case "overdue_reminders":
      return OverdueReminderEmail(payload.props);
    case "package_received":
      return PackageReceivedEmail(payload.props);
    case "document_ack_required":
      return DocumentAcknowledgmentRequiredEmail(payload.props);
    default: {
      const _exhaustive: never = payload;
      throw new Error(`Unknown notification type: ${(payload as { type: string }).type}`);
    }
  }
}

export async function sendNotificationEmail({
  userId,
  type,
  templateProps,
}: SendNotificationEmailOptions) {
  try {
    const supabase = createAdminClient();

    // Get or create email preferences
    let { data: prefs } = await supabase
      .from("email_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!prefs) {
      const { data: newPrefs } = await supabase
        .from("email_preferences")
        .insert({ user_id: userId })
        .select()
        .single();
      prefs = newPrefs;
    }

    if (!prefs) {
      console.error("Failed to get/create email preferences for user:", userId);
      return;
    }

    // Check if this notification type is enabled
    const preferenceKey = type as keyof typeof prefs;
    if (prefs[preferenceKey] === false) {
      return; // User has disabled this notification type
    }

    // Get user's email from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      console.error("No email found for user:", userId);
      return;
    }

    // Build template with user's name and app URL
    const propsWithName = {
      fullName: profile.full_name,
      ...templateProps,
      appUrl: APP_URL,
    };
    const subject = subjectMap[type](propsWithName);
    const react = buildTemplate({ type, props: propsWithName } as NotificationPayload);

    await sendEmail({ to: profile.email, subject, react });
  } catch (error) {
    console.error(`Failed to send ${type} notification to user ${userId}:`, error);
  }
}
