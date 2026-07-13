interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

// Best-effort: when Resend isn't configured (or the call fails), we don't
// throw - callers fall back to surfacing the raw link in the API response
// instead of silently dropping the invite/reset on the floor.
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(`[email] RESEND_API_KEY/EMAIL_FROM not set - skipping send to ${input.to} ("${input.subject}")`);
    return { sent: false, error: "Email is not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend request failed (${res.status}): ${body}`);
      return { sent: false, error: `Resend request failed (${res.status})` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] Resend request threw", err);
    return { sent: false, error: "Email send failed" };
  }
}

export function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:5173";
}
