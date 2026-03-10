import { Resend } from "resend";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  try {
    const resend = getResendClient();
    if (!resend) return { error: "Email not configured" };

    const { data, error } = await resend.emails.send({
      from: "ResidenceHub <notifications@residencehub.app>",
      to,
      subject,
      react,
    });

    if (error) {
      console.error("Email send error:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error("Email send error:", error);
    return { error: "Failed to send email" };
  }
}
