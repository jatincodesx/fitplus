import { Card, CardHeader } from "@/components/ui/card";
import { PlatformSettingForm } from "@/components/admin/platform-setting-form";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const defaultSettings = [
  {
    key: "support_email",
    description: "Primary support contact shown in customer-facing transactional flows.",
  },
  {
    key: "self_signup_enabled",
    description: "Controls whether public self-signup remains available.",
  },
  {
    key: "billing_mode",
    description: "Use this to switch between demo and future Stripe-backed billing states.",
  },
];

export default async function SuperAdminSettingsPage() {
  await requireSuperAdmin();
  const settings = await prisma.platformSetting.findMany({
    orderBy: { key: "asc" },
  });

  const settingMap = new Map(settings.map((setting) => [setting.key, setting]));

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <CardHeader
          title="Platform settings"
          description="Founder-controlled configuration for signup policy, support routing, and billing posture"
        />
        <div className="grid gap-4 xl:grid-cols-3">
          {defaultSettings.map((setting) => (
            <Card key={setting.key} className="space-y-3 border-[var(--color-border)]/70 bg-black/20">
              <CardHeader title={setting.key} description={setting.description} />
              <PlatformSettingForm
                initialKey={setting.key}
                initialValue={settingMap.get(setting.key)?.value ?? ""}
                description={setting.description}
              />
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
