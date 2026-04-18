import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function ensureUserScaffold(userId: string, email: string) {
  await prisma.$transaction([
    prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        currentGoal: "Build a stronger, leaner body",
      },
      update: {},
    }),
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: "Starter",
        planTier: "STARTER",
        status: "ACTIVE",
        provider: "NONE",
      },
      update: {},
    }),
    prisma.billingProfile.upsert({
      where: { userId },
      create: {
        userId,
        provider: "NONE",
        billingEmail: email,
      },
      update: {
        billingEmail: email,
      },
    }),
  ]);
}

async function main() {
  const rawEmail = process.env.BOOTSTRAP_SUPERADMIN_EMAIL;
  const name = process.env.BOOTSTRAP_SUPERADMIN_NAME?.trim() || "Platform Owner";
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;

  if (!rawEmail) {
    throw new Error("Set BOOTSTRAP_SUPERADMIN_EMAIL before running bootstrap:superadmin.");
  }

  const email = normalizeEmail(rawEmail);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  const otherSuperAdmins = await prisma.user.count({
    where: {
      role: "SUPERADMIN",
      status: "ACTIVE",
      ...(existingUser ? { NOT: { id: existingUser.id } } : {}),
    },
  });

  if (otherSuperAdmins > 0 && existingUser?.role !== "SUPERADMIN") {
    throw new Error(
      "An active superadmin already exists. Promote additional admins from the platform console instead of rerunning bootstrap."
    );
  }

  let userId = existingUser?.id;
  let mode: "created" | "promoted" | "confirmed" = "confirmed";

  if (!existingUser) {
    if (!password) {
      throw new Error(
        "No existing account found for BOOTSTRAP_SUPERADMIN_EMAIL. Create the account first with Google/Apple or set BOOTSTRAP_SUPERADMIN_PASSWORD to create it now."
      );
    }

    const createdUser = await prisma.user.create({
      data: {
        email,
        name,
        password: await hash(password, 12),
        role: "SUPERADMIN",
        status: "ACTIVE",
        emailVerified: new Date(),
      },
      select: {
        id: true,
      },
    });

    userId = createdUser.id;
    mode = "created";
  } else {
    const updateData: {
      name?: string;
      role: "SUPERADMIN";
      status: "ACTIVE";
      emailVerified?: Date;
      password?: string;
      passwordChangedAt?: Date;
    } = {
      role: "SUPERADMIN",
      status: "ACTIVE",
    };

    if (!existingUser.name) {
      updateData.name = name;
    }

    if (password) {
      updateData.password = await hash(password, 12);
      updateData.passwordChangedAt = new Date();
      updateData.emailVerified = existingUser.emailVerified ?? new Date();
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
    });

    mode = existingUser.role === "SUPERADMIN" ? "confirmed" : "promoted";
  }

  if (!userId) {
    throw new Error("Failed to determine the superadmin user.");
  }

  await ensureUserScaffold(userId, email);

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      targetUserId: userId,
      eventType: "SYSTEM_SUPERADMIN_BOOTSTRAPPED",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({
        email,
        mode,
      }),
    },
  });

  console.log(`Superadmin bootstrap complete for ${email} (${mode}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
