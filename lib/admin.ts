import "server-only";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { BillingPlanTier, SubscriptionStatus, UserRole, UserStatus } from "@/lib/auth-constants";
import { sendEmailVerificationEmail, sendInvitationEmail, sendPasswordResetEmail } from "@/lib/auth-notifications";
import { createAuditLog } from "@/lib/audit";
import { getEmailDeliveryHealth } from "@/lib/email";
import { getPlatformSettingValue } from "@/lib/platform-settings";
import { createInvitedUser, normalizeEmail, revokeUserSessions } from "@/lib/users";
import { assertCanAssignRole, assertCanManageUser, assertSuperAdmin } from "@/lib/permissions";
import {
  isStripePublishableKeyConfigured,
  isStripeSecretConfigured,
  isStripeWebhookConfigured,
} from "@/lib/stripe";

export function getProfileCompletion(profile: {
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
  goalType: string | null;
  experienceLevel: string | null;
  trainingLocation: string | null;
  trainingDaysPerWeek: number | null;
  sessionDurationMins: number | null;
} | null) {
  if (!profile) {
    return 0;
  }

  const requiredFields = [
    profile.age,
    profile.sex,
    profile.heightCm,
    profile.weightKg,
    profile.goalType,
    profile.experienceLevel,
    profile.trainingLocation,
    profile.trainingDaysPerWeek,
    profile.sessionDurationMins,
  ];

  const completed = requiredFields.filter((value) => value !== null && value !== undefined && value !== "").length;
  return Math.round((completed / requiredFields.length) * 100);
}

const getAuditSearchWhere = (q?: string) =>
  q
    ? {
        OR: [
          { eventType: { contains: q } },
          { actorUser: { email: { contains: q } } },
          { targetUser: { email: { contains: q } } },
        ],
      }
    : undefined;

export async function getAdminConsoleSummary() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [flaggedUsers, recentSignups, pendingVerification] = await Promise.all([
    prisma.user.count({
      where: {
        role: "USER",
        status: { in: ["SUSPENDED", "ARCHIVED", "DELETED"] },
      },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        status: "ACTIVE",
        emailVerified: null,
      },
    }),
  ]);

  return {
    title: `${flaggedUsers} accounts need review`,
    detail: `${recentSignups} recent signups this week · ${pendingVerification} active accounts are still unverified`,
    actionHref: flaggedUsers > 0 ? "/admin/users?status=SUSPENDED" : "/admin/users",
    actionLabel: flaggedUsers > 0 ? "Review flagged users" : "Open user management",
  };
}

export async function getSuperAdminConsoleSummary() {
  const [activeUsers, adminCount, selfSignupEnabled] = await Promise.all([
    prisma.user.count({ where: { role: "USER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: { in: ["ADMIN", "SUPERADMIN"] }, status: "ACTIVE" } }),
    getPlatformSettingValue("self_signup_enabled"),
  ]);

  return {
    title: `${activeUsers} active platform users`,
    detail: `${adminCount} internal operators online to manage the platform · self-serve signup ${
      selfSignupEnabled === false ? "disabled" : "enabled"
    }`,
    actionHref: "/superadmin/security",
    actionLabel: "Open platform visibility",
  };
}

export async function getAdminDashboardData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [users, subscriptions, totalUsers, activeUsers, recentSignups, adminCount, totalPlans, totalCoachCalls, completedWorkoutSessions, workoutSessions, recentAuditLogs] =
    await Promise.all([
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.subscription.findMany({
        select: {
          planTier: true,
          status: true,
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { role: { in: ["ADMIN", "SUPERADMIN"] } } }),
      prisma.workoutPlan.count(),
      prisma.coachCallSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.workoutSession.count({ where: { status: "COMPLETED" } }),
      prisma.workoutSession.count(),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: {
            select: { id: true, name: true, email: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

  const subscriptionsByTier = subscriptions.reduce<Record<BillingPlanTier | string, number>>((acc, subscription) => {
    acc[subscription.planTier] = (acc[subscription.planTier] ?? 0) + 1;
    return acc;
  }, {});

  const subscriptionsByStatus = subscriptions.reduce<Record<SubscriptionStatus | string, number>>((acc, subscription) => {
    acc[subscription.status] = (acc[subscription.status] ?? 0) + 1;
    return acc;
  }, {});
  const emailHealth = getEmailDeliveryHealth();

  return {
    totals: {
      totalUsers,
      activeUsers,
      recentSignups,
      adminCount,
      totalPlans,
      totalCoachCalls,
      completedWorkoutSessions,
      workoutCompletionRate:
        workoutSessions > 0 ? Math.round((completedWorkoutSessions / workoutSessions) * 100) : 0,
    },
    recentUsers: users,
    subscriptionsByTier,
    subscriptionsByStatus,
    recentAuditLogs,
    systemHealth: {
      authProviders: {
        google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        apple: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
        password: true,
      },
      billingEmailConfigured: emailHealth.configured,
      emailProvider: emailHealth.provider,
      emailPreviewMode: !emailHealth.configured && emailHealth.previewModeEnabled,
      database: "Operational",
      aiProvider: process.env.OPENAI_API_KEY ? "Cloud-ready" : "Local-first / placeholder",
    },
  };
}

export async function getAdminOperationsDashboardData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    invitedUsers,
    pendingVerification,
    deletionRequests,
    recentSignups,
    recentUsers,
    recentAdminActions,
    recentSessions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "USER", status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: "USER", status: "INVITED" } }),
    prisma.user.count({ where: { role: "USER", status: "ACTIVE", emailVerified: null } }),
    prisma.user.count({ where: { role: "USER", deletionRequestedAt: { not: null } } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({
      where: {
        role: "USER",
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        lastSeenAt: true,
        onboardingCompletedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      where: {
        NOT: {
          eventType: { startsWith: "SUPERADMIN_" },
        },
      },
      include: {
        actorUser: {
          select: { email: true, role: true },
        },
        targetUser: {
          select: { email: true },
        },
      },
    }),
    prisma.session.count({
      where: {
        user: { role: "USER" },
        updatedAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  return {
    totals: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      invitedUsers,
      pendingVerification,
      deletionRequests,
      recentSignups,
      recentSessions,
    },
    recentUsers,
    recentAdminActions,
  };
}

export async function getSuperAdminDashboardData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneHundredEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    activeLast7Days,
    adminRoster,
    subscriptions,
    recentAuditLogs,
    createdUsers,
    recentSecurityEvents,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "USER", lastSeenAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastSeenAt: true,
      },
    }),
    prisma.subscription.findMany({
      where: {
        user: { role: "USER" },
      },
      select: {
        status: true,
        planTier: true,
        provider: true,
      },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: { select: { email: true, role: true } },
        targetUser: { select: { email: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "USER",
        createdAt: { gte: oneHundredEightyDaysAgo },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      where: {
        OR: [
          { eventType: { startsWith: "SUPERADMIN_" } },
          { eventType: { startsWith: "AUTH_" } },
          { eventType: { startsWith: "ADMIN_" } },
        ],
      },
      include: {
        actorUser: { select: { email: true } },
        targetUser: { select: { email: true } },
      },
    }),
  ]);

  const subscriptionsByTier = subscriptions.reduce<Record<BillingPlanTier | string, number>>((acc, subscription) => {
    acc[subscription.planTier] = (acc[subscription.planTier] ?? 0) + 1;
    return acc;
  }, {});

  const subscriptionsByStatus = subscriptions.reduce<Record<SubscriptionStatus | string, number>>((acc, subscription) => {
    acc[subscription.status] = (acc[subscription.status] ?? 0) + 1;
    return acc;
  }, {});
  const subscriptionsByProvider = subscriptions.reduce<Record<string, number>>((acc, subscription) => {
    acc[subscription.provider] = (acc[subscription.provider] ?? 0) + 1;
    return acc;
  }, {});

  const growthSeries = Array.from({ length: 6 }, (_, index) => {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - (5 - index) * 30);
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 30);

    return {
      label: windowStart.toLocaleString("en-US", { month: "short" }),
      users: createdUsers.filter(
        (user) => user.createdAt >= windowStart && user.createdAt < windowEnd
      ).length,
    };
  });
  const emailHealth = getEmailDeliveryHealth();

  return {
    totals: {
      totalUsers,
      activeUsers,
      activeLast7Days,
      adminCount: adminRoster.filter((user) => user.role === "ADMIN").length,
      superAdminCount: adminRoster.filter((user) => user.role === "SUPERADMIN").length,
    },
    adminRoster,
    subscriptionsByTier,
    subscriptionsByStatus,
    subscriptionsByProvider,
    recentAuditLogs,
    recentSecurityEvents,
    growthSeries,
    systemHealth: {
      authProviders: {
        google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        apple: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
        password: true,
      },
      billingEmailConfigured: emailHealth.configured,
      emailProvider: emailHealth.provider,
      emailPreviewMode: !emailHealth.configured && emailHealth.previewModeEnabled,
      stripeConfigured: isStripeSecretConfigured() && isStripePublishableKeyConfigured(),
      stripeWebhookConfigured: isStripeWebhookConfigured(),
      database: "Operational",
      aiProvider: process.env.OPENAI_API_KEY ? "Cloud-ready" : "Local-first / placeholder",
    },
  };
}

export async function listManagedUsers(input: {
  q?: string;
  role?: string;
  status?: string;
  page: number;
}) {
  const pageSize = 20;
  const where = {
    ...(input.q
      ? {
          OR: [
            { email: { contains: input.q } },
            { name: { contains: input.q } },
          ],
        }
      : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * pageSize,
      take: pageSize,
      include: {
        profile: true,
        subscription: true,
        accounts: {
          select: {
            provider: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            workoutPlans: true,
            coachCallSessions: true,
          },
        },
      },
    }),
  ]);

  return {
    page: input.page,
    pageSize,
    total,
    users: users.map((user) => ({
      ...user,
      profileCompletion: getProfileCompletion(user.profile),
    })),
  };
}

export async function getManagedUserDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscription: true,
      billingProfile: true,
      accounts: {
        select: {
          id: true,
          provider: true,
          createdAt: true,
        },
      },
      sessions: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          sessionToken: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          updatedAt: true,
          expires: true,
        },
      },
      _count: {
        select: {
          workoutPlans: true,
          workoutSessions: true,
          chatMessages: true,
          coachCallSessions: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const [recentAuditLogs, latestWorkoutSession, latestCoachSession] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        OR: [{ actorUserId: userId }, { targetUserId: userId }],
      },
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: { id: true, name: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.workoutSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        dayName: true,
        updatedAt: true,
      },
    }),
    prisma.coachCallSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        summary: true,
      },
    }),
  ]);

  return {
    user: {
      ...user,
      profileCompletion: getProfileCompletion(user.profile),
    },
    recentAuditLogs,
    latestWorkoutSession,
    latestCoachSession,
  };
}

export async function updateManagedUser(input: {
  actorUserId: string;
  actorRole: UserRole;
  targetUserId: string;
  nextRole?: UserRole;
  nextStatus?: UserStatus;
  suspensionReason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const targetUser = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (targetUser.id === input.actorUserId) {
    throw new ApiError(400, "Use your own account settings for self-service changes.");
  }

  assertCanManageUser(input.actorRole, targetUser.role);

  if (input.nextRole) {
    assertCanAssignRole(input.actorRole, input.nextRole);
  }

  const nextStatus = input.nextStatus ?? (targetUser.status as UserStatus);
  const nextRole = input.nextRole ?? (targetUser.role as UserRole);

  if (
    targetUser.role === "SUPERADMIN" &&
    (nextRole !== "SUPERADMIN" || nextStatus !== "ACTIVE")
  ) {
    const remainingSuperAdmins = await prisma.user.count({
      where: {
        role: "SUPERADMIN",
        status: "ACTIVE",
        NOT: { id: targetUser.id },
      },
    });

    if (remainingSuperAdmins === 0) {
      throw new ApiError(400, "At least one active superadmin must remain on the platform.");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      role: nextRole,
      status: nextStatus,
      suspendedAt: nextStatus === "SUSPENDED" ? new Date() : null,
      suspensionReason: nextStatus === "SUSPENDED" ? input.suspensionReason ?? null : null,
      archivedAt: nextStatus === "ARCHIVED" ? new Date() : null,
      deletedAt: nextStatus === "DELETED" ? new Date() : null,
      deletedById: nextStatus === "DELETED" ? input.actorUserId : null,
    },
  });

  if (nextStatus !== "ACTIVE") {
    await revokeUserSessions(updatedUser.id);
  }

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: updatedUser.id,
    eventType: "ADMIN_USER_UPDATED",
    entityType: "User",
    entityId: updatedUser.id,
    metadata: {
      previousRole: targetUser.role,
      nextRole,
      previousStatus: targetUser.status,
      nextStatus,
      suspensionReason: input.suspensionReason ?? null,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return updatedUser;
}

export async function inviteManagedUser(input: {
  actorUserId: string;
  actorRole: UserRole;
  email: string;
  name: string;
  role: UserRole;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  if (input.role !== "USER") {
    assertSuperAdmin(input.actorRole);
  }

  const email = normalizeEmail(input.email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.status === "ACTIVE") {
    throw new ApiError(409, "A user with that email already exists.");
  }

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: input.name.trim(),
        role: input.role,
        status: "INVITED",
        invitedById: input.actorUserId,
        invitedAt: new Date(),
        suspendedAt: null,
        suspensionReason: null,
        archivedAt: null,
        deletedAt: null,
        deletedById: null,
      },
    });
  } else {
    await createInvitedUser({
      email,
      name: input.name,
      role: input.role,
      actorUserId: input.actorUserId,
    });
  }

  const targetUser = await prisma.user.findUniqueOrThrow({
    where: { email },
  });

  const invite = await sendInvitationEmail({
    actorUserId: input.actorUserId,
    userId: targetUser.id,
    email,
    role: input.role,
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: targetUser.id,
    eventType: "ADMIN_USER_INVITED",
    entityType: "User",
    entityId: targetUser.id,
    metadata: {
      email,
      role: input.role,
      emailDeliveryStatus: invite.delivery.status,
      emailProvider: invite.delivery.provider,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    invitedUser: targetUser,
    inviteUrl: invite.url,
    emailDelivery: invite.delivery,
  };
}

export async function sendManagedUserAuthAction(input: {
  actorUserId: string;
  actorRole: UserRole;
  targetUserId: string;
  action: "SEND_INVITATION" | "SEND_PASSWORD_RESET" | "SEND_EMAIL_VERIFICATION";
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const targetUser = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      password: true,
      role: true,
      status: true,
    },
  });

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (targetUser.id === input.actorUserId) {
    throw new ApiError(400, "Use your own account settings for self-service auth actions.");
  }

  assertCanManageUser(input.actorRole, targetUser.role);

  let debugUrl: string | null = null;
  let successEventType = "";
  let metadata: Record<string, unknown> = {};
  let emailDelivery: Awaited<ReturnType<typeof sendEmailVerificationEmail>>["delivery"] | null = null;

  switch (input.action) {
    case "SEND_INVITATION": {
      if (targetUser.status !== "INVITED") {
        throw new ApiError(400, "Only invited users can receive invitation emails.");
      }

      const invite = await sendInvitationEmail({
        actorUserId: input.actorUserId,
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role as UserRole,
      });

      debugUrl = invite.url;
      successEventType = "ADMIN_USER_INVITATION_RESENT";
      metadata = { status: targetUser.status };
      emailDelivery = invite.delivery;
      break;
    }
    case "SEND_PASSWORD_RESET": {
      if (targetUser.status !== "ACTIVE") {
        throw new ApiError(400, "Password reset emails can only be sent to active users.");
      }

      const reset = await sendPasswordResetEmail({
        userId: targetUser.id,
        email: targetUser.email,
      });

      debugUrl = reset.url;
      successEventType = "ADMIN_USER_PASSWORD_RESET_SENT";
      metadata = {
        hadPassword: Boolean(targetUser.password),
      };
      emailDelivery = reset.delivery;
      break;
    }
    case "SEND_EMAIL_VERIFICATION": {
      if (targetUser.emailVerified) {
        throw new ApiError(400, "That user has already verified their email.");
      }

      const verification = await sendEmailVerificationEmail({
        userId: targetUser.id,
        email: targetUser.email,
      });

      debugUrl = verification.url;
      successEventType = "ADMIN_USER_EMAIL_VERIFICATION_SENT";
      metadata = {
        status: targetUser.status,
      };
      emailDelivery = verification.delivery;
      break;
    }
  }

  if (!emailDelivery) {
    throw new ApiError(500, "Could not complete that auth action.");
  }

  const eventType = emailDelivery.delivered
    ? successEventType
    : "ADMIN_USER_AUTH_EMAIL_DELIVERY_FAILED";

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: targetUser.id,
    eventType,
    entityType: "User",
    entityId: targetUser.id,
    metadata: {
      ...metadata,
      action: input.action,
      emailDeliveryStatus: emailDelivery.status,
      emailProvider: emailDelivery.provider,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    userId: targetUser.id,
    debugUrl,
    emailDelivery,
  };
}

export async function upsertPlatformSetting(input: {
  actorUserId: string;
  actorRole: UserRole;
  key: string;
  value: string | number | boolean;
  description?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  assertSuperAdmin(input.actorRole);

  const setting = await prisma.platformSetting.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      value: JSON.stringify(input.value),
      description: input.description ?? null,
      updatedByUserId: input.actorUserId,
    },
    update: {
      value: JSON.stringify(input.value),
      description: input.description ?? null,
      updatedByUserId: input.actorUserId,
    },
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    eventType: "SUPERADMIN_PLATFORM_SETTING_UPDATED",
    entityType: "PlatformSetting",
    entityId: setting.id,
    metadata: {
      key: input.key,
      value: input.value,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return setting;
}

export async function listAdminRoster() {
  return prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPERADMIN"] },
    },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });
}

export async function getOperationsAuditLogs(q?: string) {
  return prisma.auditLog.findMany({
    where: {
      AND: [
        {
          NOT: {
            eventType: { startsWith: "SUPERADMIN_" },
          },
        },
        ...(getAuditSearchWhere(q) ? [getAuditSearchWhere(q)!] : []),
      ],
    },
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      actorUser: { select: { email: true, role: true } },
      targetUser: { select: { email: true } },
    },
  });
}

export async function getPlatformAuditLogs(q?: string) {
  return prisma.auditLog.findMany({
    where: getAuditSearchWhere(q),
    take: 150,
    orderBy: { createdAt: "desc" },
    include: {
      actorUser: { select: { email: true, role: true } },
      targetUser: { select: { email: true } },
    },
  });
}
