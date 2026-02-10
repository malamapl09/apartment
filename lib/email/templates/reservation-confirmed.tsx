import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ReservationConfirmedProps {
  ownerName: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  referenceCode: string;
}

export function ReservationConfirmedEmail(props: ReservationConfirmedProps) {
  return (
    <BaseLayout previewText={`Reservation confirmed: ${props.spaceName}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Reservation Confirmed!
      </Text>
      <Text>
        Hi {props.ownerName}, your reservation has been confirmed.
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
        <Text>
          <strong>Reference:</strong> {props.referenceCode}
        </Text>
      </Section>
      <Hr />
      <Text>Enjoy your reservation!</Text>
    </BaseLayout>
  );
}
