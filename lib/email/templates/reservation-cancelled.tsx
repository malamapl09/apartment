import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface ReservationCancelledProps {
  ownerName: string;
  spaceName: string;
  date: string;
  referenceCode: string;
  reason: string;
  appUrl?: string;
}

export function ReservationCancelledEmail({
  ownerName,
  spaceName,
  date,
  referenceCode,
  reason,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: ReservationCancelledProps) {
  return (
    <BaseLayout previewText={`Reservation cancelled: ${spaceName}`} appUrl={appUrl}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Reservation Cancelled
      </Text>
      <Text>Hi {ownerName}, your reservation has been cancelled.</Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Space:</strong> {spaceName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Date:</strong> {date}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Reference:</strong> {referenceCode}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Reason:</strong> {reason}
      </Text>
      <Hr style={hrStyle} />
      <Text style={{ fontSize: "14px", color: "#71717a" }}>
        If you believe this was a mistake, please contact your building
        administrator.
      </Text>
      <Button href={`${appUrl}/portal/spaces`} style={ctaButtonStyle}>
        Book Another Space
      </Button>
    </BaseLayout>
  );
}
