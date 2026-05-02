import "server-only";

import type {
  EmailProvider,
  EmailProviderConfig,
  SendEmailInput,
} from "@/lib/email/types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = Number(process.env.RESEND_TIMEOUT_MS ?? "10000");

const isTruthy = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const isEmailDevPreviewEnabled = () => {
  const flag = process.env.EMAIL_DEV_PREVIEW;
  if (flag === undefined) {
    return process.env.NODE_ENV !== "production";
  }

  return isTruthy(flag);
};

const getResendConfig = (): EmailProviderConfig => {
  const missing: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    missing.push("RESEND_API_KEY");
  }

  if (!process.env.EMAIL_FROM) {
    missing.push("EMAIL_FROM");
  }

  return {
    configured: missing.length === 0,
    missing,
  };
};

const logEmailPreview = (input: SendEmailInput, reason: string) => {
  if (!isEmailDevPreviewEnabled()) {
    return;
  }

  const preview = [
    `[email-preview] ${reason}`,
    `Intent: ${input.intent}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "",
    input.text,
  ].join("\n");

  console.info(preview);
};

const parseResendErrorBody = async (response: Response) => {
  try {
    const payload = await response.json();
    return typeof payload?.message === "string" ? payload.message : JSON.stringify(payload);
  } catch {
    return await response.text();
  }
};

export const createResendProvider = (): EmailProvider => ({
  name: "resend",
  getConfig: getResendConfig,
  async send(input) {
    const config = getResendConfig();
    if (!config.configured) {
      logEmailPreview(
        input,
        `Resend is not configured (missing ${config.missing.join(", ")}).`
      );
      return {
        delivered: false,
        status: "NOT_CONFIGURED",
        provider: "resend",
        providerMessageId: null,
        safeMessage: "Email delivery is not configured yet.",
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
      let response: Response;

      try {
        response = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: [input.to],
            subject: input.subject,
            html: input.html,
            text: input.text,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const providerError = await parseResendErrorBody(response);
        console.error(
          `[email-resend-error] status=${response.status} intent=${input.intent} to=${input.to} error=${providerError}`
        );
        logEmailPreview(input, "Resend request failed.");

        return {
          delivered: false,
          status: "FAILED",
          provider: "resend",
          providerMessageId: null,
          safeMessage: "Email delivery is temporarily unavailable. Please try again shortly.",
        };
      }

      let providerMessageId: string | null = null;
      try {
        const payload = (await response.json()) as { id?: unknown };
        if (typeof payload.id === "string") {
          providerMessageId = payload.id;
        }
      } catch {
        providerMessageId = null;
      }

      return {
        delivered: true,
        status: "SENT",
        provider: "resend",
        providerMessageId,
        safeMessage: "Email sent.",
      };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      console.error(
        `[email-resend-error] status=${timedOut ? "timeout" : "network"} intent=${input.intent} to=${input.to}`,
        error
      );
      logEmailPreview(input, "Resend request failed.");

      return {
        delivered: false,
        status: "FAILED",
        provider: "resend",
        providerMessageId: null,
        safeMessage: "Email delivery is temporarily unavailable. Please try again shortly.",
      };
    }
  },
});
