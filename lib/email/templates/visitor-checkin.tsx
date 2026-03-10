import { Text, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface VisitorCheckinEmailProps {
  fullName: string;
  visitorName: string;
  buildingName: string;
  checkedInAt: string;
}

export function VisitorCheckinEmail({
  fullName,
  visitorName,
  buildingName,
  checkedInAt,
}: VisitorCheckinEmailProps) {
  return (
    <BaseLayout previewText={`${visitorName} has checked in at your building`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Visitor Checked In
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        A visitor you registered has checked in at your building:
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Visitor:</strong> {visitorName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Building:</strong> {buildingName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Checked In At:</strong> {checkedInAt}
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        You can view visitor details through your ResidenceHub portal.
      </Text>
    </BaseLayout>
  );
}
