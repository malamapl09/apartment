import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PaymentRejectedProps {
  ownerName: string;
  spaceName: string;
  referenceCode: string;
  reason: string;
}

export function PaymentRejectedEmail(props: PaymentRejectedProps) {
  return (
    <BaseLayout previewText={`Payment rejected for ${props.spaceName}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Payment Rejected
      </Text>
      <Text>
        Hi {props.ownerName}, your payment has been rejected.
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
          <strong>Reason:</strong> {props.reason}
        </Text>
      </Section>
      <Hr />
      <Text>
        Please submit a new payment proof or contact your building
        administrator for assistance.
      </Text>
    </BaseLayout>
  );
}
