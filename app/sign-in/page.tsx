import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAvailableAuthProviders } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; callbackUrl?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const providers = getAvailableAuthProviders();

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to FitPilot AI"
      description="Use email/password or continue with Google or Apple. The platform now routes each role into the right product surface after authentication."
    >
      <SignInForm
        initialEmail={params.email ?? ""}
        initialError={params.error}
        notice={params.notice}
        callbackUrl={params.callbackUrl || "/auth/complete"}
        providers={providers}
      />
    </AuthShell>
  );
}
