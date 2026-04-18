import "server-only";

import type { UserRole } from "@/lib/auth-constants";

type AuthTemplate = {
  subject: string;
  html: string;
  text: string;
};

type LayoutInput = {
  preheader: string;
  title: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  detail: string;
};

const BRAND = "FitPlus";
const PRODUCT = "FitPilot AI";

const formatExpiry = (expiresAt: Date) =>
  expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const renderAuthLayout = ({
  preheader,
  title,
  intro,
  actionLabel,
  actionUrl,
  detail,
}: LayoutInput) => `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#0b1220,#0f172a);color:#e2e8f0;">
                <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#67e8f9;">${BRAND} · ${PRODUCT}</p>
                <h1 style="margin:14px 0 0;font-size:24px;line-height:1.3;color:#f8fafc;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1e293b;">${intro}</p>
                <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#475569;">${detail}</p>
                <table role="presentation" cellPadding="0" cellSpacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td align="center" style="border-radius:10px;background:#0ea5e9;">
                      <a href="${actionUrl}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#001220;text-decoration:none;">
                        ${actionLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  If the button does not work, copy and paste this URL into your browser:<br />
                  <a href="${actionUrl}" style="color:#0ea5e9;word-break:break-all;">${actionUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  You are receiving this email because a security action was requested for your ${PRODUCT} account.
                  If this was not you, you can ignore this message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export function buildVerificationEmailTemplate(input: {
  verificationUrl: string;
  expiresAt: Date;
}): AuthTemplate {
  const subject = `Verify your ${BRAND} email`;
  const detail = `Use the link below to verify your email address. This link expires on ${formatExpiry(
    input.expiresAt
  )}.`;
  const intro = `Welcome to ${PRODUCT}. Confirm your email so account recovery and security features stay enabled.`;

  return {
    subject,
    html: renderAuthLayout({
      preheader: `Verify your email for ${PRODUCT}`,
      title: "Verify your email",
      intro,
      actionLabel: "Verify email",
      actionUrl: input.verificationUrl,
      detail,
    }),
    text: [
      `Verify your ${BRAND} email`,
      "",
      intro,
      detail,
      "",
      `Verify email: ${input.verificationUrl}`,
    ].join("\n"),
  };
}

export function buildPasswordResetEmailTemplate(input: {
  resetUrl: string;
  expiresAt: Date;
}): AuthTemplate {
  const subject = `Reset your ${BRAND} password`;
  const detail = `Use the secure link below to choose a new password. This link expires on ${formatExpiry(
    input.expiresAt
  )}.`;
  const intro = `We received a password reset request for your ${PRODUCT} account.`;

  return {
    subject,
    html: renderAuthLayout({
      preheader: `Reset your ${PRODUCT} password`,
      title: "Reset your password",
      intro,
      actionLabel: "Choose a new password",
      actionUrl: input.resetUrl,
      detail,
    }),
    text: [
      `Reset your ${BRAND} password`,
      "",
      intro,
      detail,
      "",
      `Reset password: ${input.resetUrl}`,
    ].join("\n"),
  };
}

const roleLabelMap: Record<UserRole, string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

export function buildInvitationEmailTemplate(input: {
  invitationUrl: string;
  expiresAt: Date;
  role: UserRole;
}): AuthTemplate {
  const subject = `You are invited to ${PRODUCT}`;
  const detail = `Your invitation role is ${roleLabelMap[input.role]}. This invitation link expires on ${formatExpiry(
    input.expiresAt
  )}.`;
  const intro = `You have been invited to join ${PRODUCT}. Complete your account setup to get started.`;

  return {
    subject,
    html: renderAuthLayout({
      preheader: `Invitation to ${PRODUCT}`,
      title: "Accept your invitation",
      intro,
      actionLabel: "Accept invitation",
      actionUrl: input.invitationUrl,
      detail,
    }),
    text: [
      `You are invited to ${PRODUCT}`,
      "",
      intro,
      detail,
      "",
      `Accept invitation: ${input.invitationUrl}`,
    ].join("\n"),
  };
}
