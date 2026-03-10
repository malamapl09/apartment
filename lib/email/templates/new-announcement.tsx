import { Text, Hr } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface NewAnnouncementEmailProps {
  fullName: string;
  announcementTitle: string;
  announcementBody: string;
  buildingName: string;
}

export function NewAnnouncementEmail({
  fullName,
  announcementTitle,
  announcementBody,
  buildingName,
}: NewAnnouncementEmailProps) {
  return (
    <BaseLayout previewText={`New announcement: ${announcementTitle}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        New Announcement
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>
        A new announcement has been posted for {buildingName}:
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text style={{ fontSize: "16px", fontWeight: "bold", margin: "4px 0" }}>
        {announcementTitle}
      </Text>
      <Text style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
        {announcementBody}
      </Text>
      <Hr style={{ borderColor: "#e4e4e7", margin: "16px 0" }} />
      <Text>
        View the full announcement and more details on your ResidenceHub portal.
      </Text>
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        This announcement was shared with members of {buildingName}.
      </Text>
    </BaseLayout>
  );
}
