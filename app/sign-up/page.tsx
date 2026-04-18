import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getAvailableAuthProviders } from "@/lib/auth";

export default function SignUpPage() {
  const providers = getAvailableAuthProviders();

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start your FitPilot AI account"
      description="Create a customer account with email/password, or continue immediately with Google or Apple. Internal roles are assigned through controlled company workflows only."
    >
      <SignUpForm providers={providers} />
    </AuthShell>
  );
}
