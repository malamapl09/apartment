import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface NewChargeEmailProps {
  fullName: string;
  amount: string;
  feeType: string;
  dueDate: string;
  apartmentUnit: string;
  appUrl?: string;
}

export function NewChargeEmail({
  fullName,
  amount,
  feeType,
  dueDate,
  apartmentUnit,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: NewChargeEmailProps) {
  return (
    <BaseLayout previewText={`New charge: $${amount} for ${feeType}`} appUrl={appUrl}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        New Charge Generated
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        A new charge has been generated for your apartment ({apartmentUnit}):
      </Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Fee Type:</strong> {feeType}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Amount:</strong> ${amount}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Due Date:</strong> {dueDate}
      </Text>
      <Hr style={hrStyle} />
      <Text>
        Please ensure payment is made before the due date to avoid late fees.
      </Text>
      <Button href={`${appUrl}/portal/fees`} style={ctaButtonStyle}>
        View Charges
      </Button>
    </BaseLayout>
  );
}
