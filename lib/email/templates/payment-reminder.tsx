import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface PaymentReminderProps {
  ownerName: string;
  spaceName: string;
  referenceCode: string;
  deadline: string;
  amount: string;
  reservationId?: string;
  appUrl?: string;
}

export function PaymentReminderEmail({
  ownerName,
  spaceName,
  referenceCode,
  deadline,
  amount,
  reservationId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: PaymentReminderProps) {
  const ctaUrl = reservationId
    ? `${appUrl}/portal/reservations/${reservationId}`
    : `${appUrl}/portal/reservations`;

  return (
    <BaseLayout previewText={`Payment reminder for ${spaceName}`} appUrl={appUrl}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Payment Reminder
      </Text>
      <Text>Hi {ownerName}, a payment is due for your reservation.</Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Space:</strong> {spaceName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Reference:</strong> {referenceCode}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Amount:</strong> {amount}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Deadline:</strong> {deadline}
      </Text>
      <Hr style={hrStyle} />
      <Text>
        Please submit your payment before the deadline to avoid cancellation.
      </Text>
      <Button href={ctaUrl} style={ctaButtonStyle}>
        Submit Payment
      </Button>
      <Text style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}>
        If you have already made this payment, please disregard this message.
      </Text>
    </BaseLayout>
  );
}
