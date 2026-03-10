import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface OverdueReminderEmailProps {
  fullName: string;
  amount: string;
  feeType: string;
  dueDate: string;
  apartmentUnit: string;
  appUrl?: string;
}

export function OverdueReminderEmail({
  fullName,
  amount,
  feeType,
  dueDate,
  apartmentUnit,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: OverdueReminderEmailProps) {
  return (
    <BaseLayout previewText={`Overdue charge: $${amount} for ${feeType}`} appUrl={appUrl}>
      <Text
        style={{
          fontSize: "18px",
          fontWeight: "bold",
          color: "#dc2626",
        }}
      >
        Overdue Payment Reminder
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        This is a reminder that you have an overdue charge for your apartment (
        {apartmentUnit}):
      </Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Fee Type:</strong> {feeType}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Amount:</strong> ${amount}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Due Date:</strong>{" "}
        <span style={{ color: "#dc2626", fontWeight: "bold" }}>{dueDate}</span>
      </Text>
      <Hr style={hrStyle} />
      <Text>
        Please make your payment as soon as possible to avoid additional
        penalties.
      </Text>
      <Button
        href={`${appUrl}/portal/fees`}
        style={{ ...ctaButtonStyle, backgroundColor: "#dc2626" }}
      >
        Pay Now
      </Button>
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        If you have already made this payment, please disregard this email.
      </Text>
    </BaseLayout>
  );
}
