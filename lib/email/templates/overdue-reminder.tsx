import { Text, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface OverdueReminderEmailProps {
  fullName: string;
  amount: string;
  feeType: string;
  dueDate: string;
  apartmentUnit: string;
}

export function OverdueReminderEmail({
  fullName,
  amount,
  feeType,
  dueDate,
  apartmentUnit,
}: OverdueReminderEmailProps) {
  return (
    <BaseLayout previewText={`Overdue charge: ${amount} for ${feeType}`}>
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
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
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
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text>
        Please make your payment as soon as possible to avoid additional
        penalties.
      </Text>
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        If you have already made this payment, please disregard this email. You
        can view your charges through your ResidenceHub portal.
      </Text>
    </BaseLayout>
  );
}
