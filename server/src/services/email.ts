import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "Talk2Forms <onboarding@talk2forms.site>";

export async function sendWelcomeEmail(to: string, name?: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Welcome to Talk2Forms",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #16201c;">Welcome${name ? `, ${name}` : ""}!</h1>
          <p style="color: #6b7a70; line-height: 1.6;">
            Your Talk2Forms account is ready. Head to your dashboard to complete your
            profile and connect your free Gemini API key — then any form, on any site,
            can be filled just by talking.
          </p>
          <a href="https://talk2forms.site/dashboard/profile"
             style="display:inline-block;margin-top:16px;padding:12px 24px;background:#16201c;color:#f7f8f4;text-decoration:none;border-radius:10px;font-weight:600;">
            Complete your profile
          </a>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] welcome email failed:", err);
  }
}

export async function sendProfileUpdatedEmail(to: string, name?: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your Talk2Forms profile was updated",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #16201c;">Profile updated${name ? `, ${name}` : ""}</h1>
          <p style="color: #6b7a70; line-height: 1.6;">
            Your Talk2Forms profile was just saved. Talk2Forms is now using this
            latest info whenever it fills out a form for you.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] profile-updated email failed:", err);
  }
}