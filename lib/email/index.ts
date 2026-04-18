import "server-only";

import { createResendProvider, isEmailDevPreviewEnabled } from "@/lib/email/providers/resend";
import type { EmailProvider, SendEmailInput } from "@/lib/email/types";

export type {
  EmailDeliveryResult,
  EmailDeliveryStatus,
  EmailIntent,
} from "@/lib/email/types";

const getProviderName = () => (process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();

const getProvider = (): EmailProvider => {
  switch (getProviderName()) {
    case "resend":
      return createResendProvider();
    default:
      return createResendProvider();
  }
};

export async function sendEmail(input: SendEmailInput) {
  const provider = getProvider();
  return provider.send(input);
}

export function getEmailDeliveryHealth() {
  const provider = getProvider();
  const config = provider.getConfig();

  return {
    provider: provider.name,
    configured: config.configured,
    missingConfig: config.missing,
    previewModeEnabled: isEmailDevPreviewEnabled(),
  };
}
