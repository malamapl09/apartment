import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface VisitorCheckinEmailProps {
  fullName: string;
  visitorName: string;
  buildingName: string;
  checkedInAt: string;
  appUrl?: string;
}

export function VisitorCheckinEmail({
  fullName,
  visitorName,
  buildingName,
  checkedInAt,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: VisitorCheckinEmailProps) {
  return (
    <BaseLayout
      previewText={`${visitorName} has checked in at your building`}
      appUrl={appUrl}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Visitor Checked In
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>A visitor you registered has checked in at your building:</Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Visitor:</strong> {visitorName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Building:</strong> {buildingName}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Checked In At:</strong> {checkedInAt}
      </Text>
      <Hr style={hrStyle} />
      <Button href={`${appUrl}/portal/visitors`} style={ctaButtonStyle}>
        View Visitors
      </Button>
    </BaseLayout>
  );
}
