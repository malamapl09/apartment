import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface MaintenanceUpdateEmailProps {
  fullName: string;
  referenceCode: string;
  title: string;
  newStatus: string;
  requestId?: string;
  appUrl?: string;
}

export function MaintenanceUpdateEmail({
  fullName,
  referenceCode,
  title,
  newStatus,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: MaintenanceUpdateEmailProps) {
  const ctaUrl = requestId
    ? `${appUrl}/portal/maintenance/${requestId}`
    : `${appUrl}/portal/maintenance`;

  return (
    <BaseLayout
      previewText={`Maintenance request ${referenceCode} updated to ${newStatus}`}
      appUrl={appUrl}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Maintenance Request Updated
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>Your maintenance request has been updated:</Text>
      <Hr style={hrStyle} />
      <Text style={{ margin: "4px 0" }}>
        <strong>Reference:</strong> {referenceCode}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>Title:</strong> {title}
      </Text>
      <Text style={{ margin: "4px 0" }}>
        <strong>New Status:</strong>{" "}
        <span
          style={{
            backgroundColor: "#f0fdf4",
            color: "#166534",
            padding: "2px 8px",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {newStatus}
        </span>
      </Text>
      <Hr style={hrStyle} />
      <Button href={ctaUrl} style={ctaButtonStyle}>
        View Request
      </Button>
    </BaseLayout>
  );
}
