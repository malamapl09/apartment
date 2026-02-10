import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PaymentReminderProps {
  ownerName: string;
  spaceName: string;
  referenceCode: string;
  deadline: string;
  amount: string;
}

export function PaymentReminderEmail(props: PaymentReminderProps) {
  return (
    <BaseLayout previewText={`Payment reminder for ${props.spaceName}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Payment Reminder
      </Text>
      <Text>
        Hi {props.ownerName}, a payment is due for your reservation.
      </Text>
      <Hr />
      <Section>
        <Text>
          <strong>Space:</strong> {props.spaceName}
        </Text>
        <Text>
          <strong>Reference:</strong> {props.referenceCode}
        </Text>
        <Text>
          <strong>Amount:</strong> {props.amount}
        </Text>
        <Text>
          <strong>Deadline:</strong> {props.deadline}
        </Text>
      </Section>
      <Hr />
      <Text>
        Please submit your payment before the deadline to avoid cancellation.
      </Text>
      <Text style={{ fontSize: "14px", color: "#71717a" }}>
        If you have already made this payment, please disregard this message.
      </Text>
    </BaseLayout>
  );
}
