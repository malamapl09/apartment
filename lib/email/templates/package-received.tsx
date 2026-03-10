import { Text, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PackageReceivedEmailProps {
  fullName: string;
  unitNumber: string;
  description: string;
  carrier: string;
  buildingName: string;
  receivedAt: string;
}

export function PackageReceivedEmail({
  fullName,
  unitNumber,
  description,
  carrier,
  buildingName,
  receivedAt,
}: PackageReceivedEmailProps) {
  return (
    <BaseLayout previewText={`A package has arrived for apartment ${unitNumber}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Package Received
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        A package has arrived for apartment {unitNumber}. Please pick it up at
        the front desk.
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
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
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        You can view package details through your ResidenceHub portal.
      </Text>
    </BaseLayout>
  );
}
