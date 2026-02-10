import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ReservationCancelledProps {
  ownerName: string;
  spaceName: string;
  date: string;
  referenceCode: string;
  reason: string;
}

export function ReservationCancelledEmail(props: ReservationCancelledProps) {
  return (
    <BaseLayout previewText={`Reservation cancelled: ${props.spaceName}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Reservation Cancelled
      </Text>
      <Text>
        Hi {props.ownerName}, your reservation has been cancelled.
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
          <strong>Reference:</strong> {props.referenceCode}
        </Text>
        <Text>
          <strong>Reason:</strong> {props.reason}
        </Text>
      </Section>
      <Hr />
      <Text style={{ fontSize: "14px", color: "#71717a" }}>
        If you believe this was a mistake, please contact your building
        administrator.
      </Text>
    </BaseLayout>
  );
}
