import { Text, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface NewChargeEmailProps {
  fullName: string;
  amount: string;
  feeType: string;
  dueDate: string;
  apartmentUnit: string;
}

export function NewChargeEmail({
  fullName,
  amount,
  feeType,
  dueDate,
  apartmentUnit,
}: NewChargeEmailProps) {
  return (
    <BaseLayout previewText={`New charge: ${amount} for ${feeType}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        New Charge Generated
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        A new charge has been generated for your apartment ({apartmentUnit}):
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Fee Type:</strong> {feeType}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Amount:</strong> ${amount}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Due Date:</strong> {dueDate}
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text>
        Please ensure payment is made before the due date to avoid late fees.
      </Text>
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        You can view your charges and make payments through your ResidenceHub
        portal.
      </Text>
    </BaseLayout>
  );
}
