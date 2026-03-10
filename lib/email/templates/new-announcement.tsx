import { Text, Hr, Button } from "@react-email/components";
import { BaseLayout, hrStyle, ctaButtonStyle } from "./base-layout";

interface NewAnnouncementEmailProps {
  fullName: string;
  announcementTitle: string;
  announcementBody: string;
  buildingName: string;
  appUrl?: string;
}

export function NewAnnouncementEmail({
  fullName,
  announcementTitle,
  announcementBody,
  buildingName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: NewAnnouncementEmailProps) {
  return (
    <BaseLayout
      previewText={`New announcement: ${announcementTitle}`}
      appUrl={appUrl}
    >
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        New Announcement
      </Text>
      <Text>Hi {fullName},</Text>
      <Text>A new announcement has been posted for {buildingName}:</Text>
      <Hr style={hrStyle} />
      <Text style={{ fontSize: "16px", fontWeight: "bold", margin: "4px 0" }}>
        {announcementTitle}
      </Text>
      <Text style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
        {announcementBody}
      </Text>
      <Hr style={hrStyle} />
      <Button href={`${appUrl}/portal`} style={ctaButtonStyle}>
        View Announcement
      </Button>
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        This announcement was shared with members of {buildingName}.
      </Text>
    </BaseLayout>
  );
}
