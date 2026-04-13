import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface DocumentAcknowledgmentRequiredEmailProps {
  fullName: string;
  documentTitle: string;
  buildingName: string;
  appUrl?: string;
}

export function DocumentAcknowledgmentRequiredEmail({
  fullName,
  documentTitle,
  buildingName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: DocumentAcknowledgmentRequiredEmailProps) {
  return (
    <BaseLayout
      previewText={`Please acknowledge: ${documentTitle}`}
      appUrl={appUrl}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Action required: document acknowledgment
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        {buildingName} has shared a document that requires your confirmation
        that you&apos;ve read it:
      </Text>
      <Hr style={hrStyle} />
      <Text style={{ fontSize: "16px", fontWeight: "bold", margin: "4px 0" }}>
        {documentTitle}
      </Text>
      <Hr style={hrStyle} />
      <Button href={`${appUrl}/portal/documents`} style={ctaButtonStyle}>
        Open and acknowledge
      </Button>
      <Text style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}>
        Once you&apos;ve read it, click the Acknowledge button on the document
        card. You can also find pending documents in the banner on your
        portal home.
      </Text>
    </BaseLayout>
  );
}
