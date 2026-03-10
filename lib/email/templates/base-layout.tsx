import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Img,
  Hr,
  Link,
} from "@react-email/components";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://residencehub.app";

export const hrStyle = { borderColor: "#e4e4e7", margin: "16px 0" };

export const ctaButtonStyle = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  textDecoration: "none" as const,
  display: "inline-block" as const,
  fontWeight: "bold" as const,
  fontSize: "14px",
  textAlign: "center" as const,
};

interface BaseLayoutProps {
  children: React.ReactNode;
  previewText?: string;
  appUrl?: string;
}

export function BaseLayout({
  children,
  previewText,
  appUrl = APP_URL,
}: BaseLayoutProps) {
  const preferencesUrl = `${appUrl}/portal/profile`;

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#f4f4f5",
          fontFamily: "sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        {previewText && <Preview>{previewText}</Preview>}
        <Container
          style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}
        >
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "32px",
            }}
          >
            <Img
              src={`${appUrl}/logo.png`}
              alt="ResidenceHub"
              width={180}
              height={40}
              style={{ marginBottom: "24px" }}
            />
            {children}
          </Section>
          <Section style={{ padding: "16px", textAlign: "center" as const }}>
            <Hr style={hrStyle} />
            <Text style={{ fontSize: "12px", color: "#71717a", margin: "8px 0" }}>
              ResidenceHub — Smart Apartment Management
            </Text>
            <Link
              href={preferencesUrl}
              style={{ fontSize: "12px", color: "#a1a1aa", textDecoration: "underline" }}
            >
              Manage email preferences
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
