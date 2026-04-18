import "server-only";

export type EmailProviderName = "resend";

export type EmailIntent =
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET"
  | "INVITATION"
  | "TRANSACTIONAL";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  intent: EmailIntent;
};

export type EmailDeliveryStatus = "SENT" | "NOT_CONFIGURED" | "FAILED";

export type EmailDeliveryResult = {
  delivered: boolean;
  status: EmailDeliveryStatus;
  provider: EmailProviderName;
  providerMessageId: string | null;
  safeMessage: string;
};

export type EmailProviderConfig = {
  configured: boolean;
  missing: string[];
};

export type EmailProvider = {
  name: EmailProviderName;
  getConfig: () => EmailProviderConfig;
  send: (input: SendEmailInput) => Promise<EmailDeliveryResult>;
};
