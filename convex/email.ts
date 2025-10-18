import { action } from "./_generated/server";
import { v } from "convex/values";

// Simple email action using a third-party API (SendGrid/SES). Replace with your provider.
export const sendOnboardingEmail = action({
  args: {
    to: v.string(),
    name: v.string(),
    stateCode: v.string(),
    tempPassword: v.string(),
    loginUrl: v.string(),
  },
  handler: async (ctx, { to, name, stateCode, tempPassword, loginUrl }) => {
    const apiKey = process.env.EMAIL_SERVICE_API_KEY;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || "noreply@example.com";
    if (!apiKey) {
      console.log("EMAIL_SERVICE_API_KEY not set; skipping real email send.");
      return false;
    }

    // Example: SendGrid API
    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: "Welcome to NYSC CDS Attendance",
        },
      ],
      from: { email: fromAddress, name: "NYSC CDS Attendance" },
      content: [
        {
          type: "text/plain",
          value: `Hello ${name},\n\nWelcome to the NYSC CDS Attendance System.\n\nYour credentials:\n- State Code: ${stateCode}\n- Temporary Password: ${tempPassword}\n\nLogin here: ${loginUrl}\nYou must change your password on first login.\n\nThank you.`,
        },
      ],
    };

    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Email send failed: ${resp.status} ${text}`);
    }
    return true;
  },
});


