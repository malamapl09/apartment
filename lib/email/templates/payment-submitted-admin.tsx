import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface PaymentSubmittedAdminProps {
  ownerName: string;
  spaceName: string;
  referenceCode: string;
  amount: string;
  reservationId?: string;
  appUrl?: string;
}

export function PaymentSubmittedAdminEmail({
  ownerName,
  spaceName,
  referenceCode,
  amount,
  reservationId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: PaymentSubmittedAdminProps) {
  const ctaUrl = reservationId
    ? `${appUrl}/admin/reservations/${reservationId}`
    : `${appUrl}/admin/reservations/pending`;

  return (
    <BaseLayout
      previewText={`Payment proof uploaded by ${ownerName}`}
      appUrl={appUrl}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Payment Proof Submitted
      </Text>
      <Text>
        A payment proof has been uploaded and requires your review.
      </Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Owner:</strong> {ownerName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Space:</strong> {spaceName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Reference:</strong> {referenceCode}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Amount:</strong> {amount}
      </Text>
      <Hr style={hrStyle} />
      <Button href={ctaUrl} style={ctaButtonStyle}>
        Review Payment
      </Button>
    </BaseLayout>
  );
}
