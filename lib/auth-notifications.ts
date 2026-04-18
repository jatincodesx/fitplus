import "server-only";

import type { UserRole } from "@/lib/auth-constants";
import type { EmailDeliveryResult } from "@/lib/email";
import { sendEmail } from "@/lib/email";
import {
  buildInvitationEmailTemplate,
  buildPasswordResetEmailTemplate,
  buildVerificationEmailTemplate,
} from "@/lib/email/templates/auth";
import { createUserToken, getBaseUrl, invalidateUserTokensByType } from "@/lib/tokens";

type AuthNotificationResult = {
  url: string;
  expiresAt: Date;
  delivery: EmailDeliveryResult;
};

export async function sendEmailVerificationEmail(input: {
  userId: string;
  email: string;
}): Promise<AuthNotificationResult> {
  await invalidateUserTokensByType(input.email, "EMAIL_VERIFICATION");
  const verificationToken = await createUserToken({
    type: "EMAIL_VERIFICATION",
    email: input.email,
    userId: input.userId,
    expiresInHours: 24,
  });

  const url = `${getBaseUrl()}/verify-email?token=${verificationToken.token}`;
  const template = buildVerificationEmailTemplate({
    verificationUrl: url,
    expiresAt: verificationToken.expiresAt,
  });

  const delivery = await sendEmail({
    to: input.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    intent: "EMAIL_VERIFICATION",
  });

  return {
    url,
    expiresAt: verificationToken.expiresAt,
    delivery,
  };
}

export async function sendPasswordResetEmail(input: {
  userId: string;
  email: string;
}): Promise<AuthNotificationResult> {
  await invalidateUserTokensByType(input.email, "PASSWORD_RESET");
  const resetToken = await createUserToken({
    type: "PASSWORD_RESET",
    email: input.email,
    userId: input.userId,
    expiresInHours: 2,
  });

  const url = `${getBaseUrl()}/reset-password?token=${resetToken.token}`;
  const template = buildPasswordResetEmailTemplate({
    resetUrl: url,
    expiresAt: resetToken.expiresAt,
  });

  const delivery = await sendEmail({
    to: input.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    intent: "PASSWORD_RESET",
  });

  return {
    url,
    expiresAt: resetToken.expiresAt,
    delivery,
  };
}

export async function sendInvitationEmail(input: {
  actorUserId: string;
  userId: string;
  email: string;
  role: UserRole;
}): Promise<AuthNotificationResult> {
  await invalidateUserTokensByType(input.email, "INVITATION");
  const inviteToken = await createUserToken({
    type: "INVITATION",
    email: input.email,
    userId: input.userId,
    createdById: input.actorUserId,
    expiresInHours: 72,
    metadata: {
      role: input.role,
    },
  });

  const url = `${getBaseUrl()}/accept-invite?token=${inviteToken.token}`;
  const template = buildInvitationEmailTemplate({
    invitationUrl: url,
    expiresAt: inviteToken.expiresAt,
    role: input.role,
  });

  const delivery = await sendEmail({
    to: input.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    intent: "INVITATION",
  });

  return {
    url,
    expiresAt: inviteToken.expiresAt,
    delivery,
  };
}
