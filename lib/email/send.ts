import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  try {
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
