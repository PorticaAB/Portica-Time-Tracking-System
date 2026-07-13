const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// Klocka palette, inlined as hex - email clients don't reliably load web
// fonts or external stylesheets, so this is table-based HTML with inline
// styles only, using web-safe font stacks that echo Fraunces/Inter.
const COLORS = {
  canvas: "#FAF8F3",
  surface: "#FFFFFF",
  ink: "#211F1B",
  inkMuted: "#6F6B62",
  inkFaint: "#A6A199",
  line: "#E7E2D8",
  brand: "#2F5344",
  brandDark: "#264337",
};

function wrapper(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:${COLORS.canvas}; font-family:${SANS};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.canvas}; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:${COLORS.surface}; border:1px solid ${COLORS.line}; border-radius:16px;">
            <tr>
              <td style="padding:36px 36px 28px 36px;">
                <div style="font-family:${SERIF}; font-size:26px; font-weight:700; color:${COLORS.brandDark}; margin-bottom:20px;">Klocka</div>
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <p style="font-family:${SANS}; font-size:12px; color:${COLORS.inkFaint}; margin-top:20px;">Klocka by Catarina Bertling</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px; background-color:${COLORS.brand};">
        <a href="${url}" style="display:inline-block; padding:12px 28px; font-family:${SANS}; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function fallbackLink(url: string): string {
  return `<p style="font-family:${SANS}; font-size:12px; color:${COLORS.inkMuted}; word-break:break-all; margin-top:8px;">
    Or paste this link into your browser:<br /><a href="${url}" style="color:${COLORS.brand};">${url}</a>
  </p>`;
}

export function inviteEmailHtml(opts: { name: string; inviteUrl: string; inviterName: string }): string {
  const { name, inviteUrl, inviterName } = opts;
  return wrapper(`
    <p style="font-family:${SANS}; font-size:15px; color:${COLORS.ink}; line-height:1.6; margin:0 0 12px 0;">Hi ${name},</p>
    <p style="font-family:${SANS}; font-size:15px; color:${COLORS.ink}; line-height:1.6; margin:0 0 4px 0;">
      ${inviterName} has invited you to log your hours in Klocka. Click below to set up your account and choose a password.
    </p>
    ${button(inviteUrl, "Accept invite & set password")}
    <p style="font-family:${SANS}; font-size:13px; color:${COLORS.inkMuted}; line-height:1.5; margin:0;">This invite link expires in 7 days.</p>
    ${fallbackLink(inviteUrl)}
  `);
}

export function passwordResetEmailHtml(opts: { name: string; resetUrl: string }): string {
  const { name, resetUrl } = opts;
  return wrapper(`
    <p style="font-family:${SANS}; font-size:15px; color:${COLORS.ink}; line-height:1.6; margin:0 0 12px 0;">Hi ${name},</p>
    <p style="font-family:${SANS}; font-size:15px; color:${COLORS.ink}; line-height:1.6; margin:0 0 4px 0;">
      We received a request to reset your Klocka password. Click below to choose a new one.
    </p>
    ${button(resetUrl, "Reset password")}
    <p style="font-family:${SANS}; font-size:13px; color:${COLORS.inkMuted}; line-height:1.5; margin:0;">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
    ${fallbackLink(resetUrl)}
  `);
}
