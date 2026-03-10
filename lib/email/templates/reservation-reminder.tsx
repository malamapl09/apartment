import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface ReservationReminderProps {
  ownerName: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  reservationId?: string;
  appUrl?: string;
}

export function ReservationReminderEmail({
  ownerName,
  spaceName,
  date,
  startTime,
  endTime,
  reservationId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: ReservationReminderProps) {
  const ctaUrl = reservationId
    ? `${appUrl}/portal/reservations/${reservationId}`
    : `${appUrl}/portal/reservations`;

  return (
    <BaseLayout previewText={`Reminder: ${spaceName} tomorrow`} appUrl={appUrl}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Reservation Reminder
      </Text>
      <Text>
        Hi {ownerName}, this is a reminder that your reservation is coming up
        in 24 hours.
      </Text>
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
      <Hr style={hrStyle} />
      <Text>We look forward to seeing you there!</Text>
      <Button href={ctaUrl} style={ctaButtonStyle}>
        View Reservation
      </Button>
    </BaseLayout>
  );
}
