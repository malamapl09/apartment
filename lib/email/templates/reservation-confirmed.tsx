import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface ReservationConfirmedProps {
  ownerName: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  referenceCode: string;
  reservationId?: string;
  appUrl?: string;
}

export function ReservationConfirmedEmail({
  ownerName,
  spaceName,
  date,
  startTime,
  endTime,
  referenceCode,
  reservationId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: ReservationConfirmedProps) {
  const ctaUrl = reservationId
    ? `${appUrl}/portal/reservations/${reservationId}`
    : `${appUrl}/portal/reservations`;

  return (
    <BaseLayout previewText={`Reservation confirmed: ${spaceName}`} appUrl={appUrl}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Reservation Confirmed!
      </Text>
      <Text>Hi {ownerName}, your reservation has been confirmed.</Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Space:</strong> {spaceName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Date:</strong> {date}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Time:</strong> {startTime} - {endTime}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Reference:</strong> {referenceCode}
      </Text>
      <Hr style={hrStyle} />
      <Text>Enjoy your reservation!</Text>
      <Button href={ctaUrl} style={ctaButtonStyle}>
        View Reservation
      </Button>
    </BaseLayout>
  );
}
