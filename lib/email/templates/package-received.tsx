import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface PackageReceivedEmailProps {
  fullName: string;
  unitNumber: string;
  description: string;
  carrier: string;
  buildingName: string;
  receivedAt: string;
  appUrl?: string;
}

export function PackageReceivedEmail({
  fullName,
  unitNumber,
  description,
  carrier,
  buildingName,
  receivedAt,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: PackageReceivedEmailProps) {
  return (
    <BaseLayout
      previewText={`A package has arrived for apartment ${unitNumber}`}
      appUrl={appUrl}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Package Received
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        A package has arrived for apartment {unitNumber}. Please pick it up at
        the front desk.
      </Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Description:</strong> {description}
      </Text>
      {carrier && (
        <Text style={{ margin: "4px 0" }}>
          <strong>Carrier:</strong> {carrier}
        </Text>
      )}
      <Text style={{ margin: "4px 0" }}>
        <strong>Building:</strong> {buildingName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Received At:</strong> {receivedAt}
      </Text>
      <Hr style={hrStyle} />
      <Button href={`${appUrl}/portal/packages`} style={ctaButtonStyle}>
        View Packages
      </Button>
    </BaseLayout>
  );
}
