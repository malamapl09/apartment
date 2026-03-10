import { Text, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface MaintenanceUpdateEmailProps {
  fullName: string;
  referenceCode: string;
  title: string;
  newStatus: string;
}

export function MaintenanceUpdateEmail({
  fullName,
  referenceCode,
  title,
  newStatus,
}: MaintenanceUpdateEmailProps) {
  return (
    <BaseLayout
      previewText={`Maintenance request ${referenceCode} updated to ${newStatus}`}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Maintenance Request Updated
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        Your maintenance request has been updated:
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
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
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text>
        You can check the full details and add comments through your
        ResidenceHub portal.
      </Text>
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        If you have any questions, please contact your building management.
      </Text>
    </BaseLayout>
  );
}
