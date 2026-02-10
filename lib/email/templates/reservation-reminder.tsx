import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ReservationReminderProps {
  ownerName: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function ReservationReminderEmail(props: ReservationReminderProps) {
  return (
    <BaseLayout previewText={`Reminder: ${props.spaceName} tomorrow`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Reservation Reminder
      </Text>
      <Text>
        Hi {props.ownerName}, this is a reminder that your reservation is
        coming up in 24 hours.
      </Text>
      <Hr />
      <Section>
        <Text>
          <strong>Space:</strong> {props.spaceName}
        </Text>
        <Text>
          <strong>Date:</strong> {props.date}
        </Text>
        <Text>
          <strong>Time:</strong> {props.startTime} - {props.endTime}
        </Text>
      </Section>
      <Hr />
      <Text>We look forward to seeing you there!</Text>
    </BaseLayout>
  );
}
