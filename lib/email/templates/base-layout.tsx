import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Hr,
  Link,
} from "@react-email/components";

interface BaseLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

export function BaseLayout({ children, previewText }: BaseLayoutProps) {
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
        {previewText && <Text style={{ display: "none" }}>{previewText}</Text>}
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
              src="https://residencehub.app/logo.png"
              alt="ResidenceHub"
              width={180}
              height={40}
              style={{ marginBottom: "24px" }}
            />
            {children}
          </Section>
          <Section style={{ padding: "16px", textAlign: "center" as const }}>
            <Text style={{ fontSize: "12px", color: "#71717a" }}>
              ResidenceHub - Smart Apartment Management
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
