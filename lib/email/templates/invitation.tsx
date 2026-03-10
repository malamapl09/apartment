import { Text, Button } from "@react-email/components";
import { BaseLayout, ctaButtonStyle } from "./base-layout";

interface InvitationEmailProps {
  fullName: string;
  buildingName: string;
  setPasswordUrl: string;
  appUrl?: string;
}

export function InvitationEmail({
  fullName,
  buildingName,
  setPasswordUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app",
}: InvitationEmailProps) {
  return (
    <BaseLayout previewText={`Welcome to ${buildingName}`} appUrl={appUrl}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Welcome, {fullName}!
      </Text>
      <Text>
        You have been invited to join {buildingName} on ResidenceHub.
      </Text>
      <Text>
        Click the button below to set your password and access your account:
      </Text>
      <Button href={setPasswordUrl} style={ctaButtonStyle}>
        Set Your Password
      </Button>
      <Text
        style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}
      >
        If you did not expect this invitation, you can safely ignore this
        email.
      </Text>
    </BaseLayout>
  );
}
