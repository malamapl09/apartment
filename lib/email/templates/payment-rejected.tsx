import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface PaymentRejectedProps {
  ownerName: string;
  spaceName: string;
  referenceCode: string;
  reason: string;
  reservationId?: string;
  appUrl?: string;
}

export function PaymentRejectedEmail({
  ownerName,
  spaceName,
  referenceCode,
  reason,
  reservationId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: PaymentRejectedProps) {
  const ctaUrl = reservationId
    ? `${appUrl}/portal/reservations/${reservationId}`
    : `${appUrl}/portal/reservations`;

  return (
    <BaseLayout previewText={`Payment rejected for ${spaceName}`} appUrl={appUrl}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Payment Rejected
      </Text>
      <Text>Hi {ownerName}, your payment has been rejected.</Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Space:</strong> {spaceName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Reference:</strong> {referenceCode}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Reason:</strong> {reason}
      </Text>
      <Hr style={hrStyle} />
      <Text>
        Please submit a new payment proof or contact your building
        administrator for assistance.
      </Text>
      <Button href={ctaUrl} style={ctaButtonStyle}>
        Submit New Payment
      </Button>
    </BaseLayout>
  );
}
