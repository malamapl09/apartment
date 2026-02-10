import { Text, Button } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface InvitationEmailProps {
  fullName: string;
  buildingName: string;
  setPasswordUrl: string;
}

export function InvitationEmail({
  fullName,
  buildingName,
  setPasswordUrl,
}: InvitationEmailProps) {
  return (
    <BaseLayout previewText={`Welcome to ${buildingName}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
        Welcome, {fullName}!
      </Text>
      <Text>
        You have been invited to join {buildingName} on ResidenceHub.
      </Text>
      <Text>
        Click the button below to set your password and access your account:
      </Text>
      <Button
        href={setPasswordUrl}
        style={{
          backgroundColor: "#0f172a",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
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
