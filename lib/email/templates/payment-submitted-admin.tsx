import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PaymentSubmittedAdminProps {
  ownerName: string;
  spaceName: string;
  referenceCode: string;
  amount: string;
}

export function PaymentSubmittedAdminEmail(
  props: PaymentSubmittedAdminProps
) {
  return (
    <BaseLayout
      previewText={`Payment proof uploaded by ${props.ownerName}`}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Payment Proof Submitted
      </Text>
      <Text>
        A payment proof has been uploaded and requires your review.
      </Text>
      <Hr />
      <Section>
        <Text>
          <strong>Owner:</strong> {props.ownerName}
        </Text>
        <Text>
          <strong>Space:</strong> {props.spaceName}
        </Text>
        <Text>
          <strong>Reference:</strong> {props.referenceCode}
        </Text>
        <Text>
          <strong>Amount:</strong> {props.amount}
        </Text>
      </Section>
      <Hr />
      <Text>
        Please log in to the admin panel to review and approve or reject
        this payment.
      </Text>
    </BaseLayout>
  );
}
