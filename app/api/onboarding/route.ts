import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { onboardingSchema } from "@/lib/validators";

export async function GET() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { profile: true, goals: true },
    });

    return apiOk({ profile: user?.profile, goals: user?.goals });
  } catch (error) {
    return handleApiError(error, "Could not load onboarding data.");
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, onboardingSchema);
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    const profile = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          age: payload.age,
          sex: payload.sex,
          heightCm: payload.heightCm,
          weightKg: payload.weightKg,
          goalType: payload.goalType,
          currentGoal: payload.currentGoal ?? null,
          experienceLevel: payload.experienceLevel,
          trainingLocation: payload.trainingLocation,
          availableEquipment: payload.availableEquipment ?? null,
          injuries: payload.injuries ?? null,
          trainingDaysPerWeek: payload.trainingDaysPerWeek,
          sessionDurationMins: payload.sessionDurationMins,
          dietaryPreference: payload.dietaryPreference ?? null,
        },
        update: {
          age: payload.age,
          sex: payload.sex,
          heightCm: payload.heightCm,
          weightKg: payload.weightKg,
          goalType: payload.goalType,
          currentGoal: payload.currentGoal ?? null,
          experienceLevel: payload.experienceLevel,
          trainingLocation: payload.trainingLocation,
          availableEquipment: payload.availableEquipment ?? null,
          injuries: payload.injuries ?? null,
          trainingDaysPerWeek: payload.trainingDaysPerWeek,
          sessionDurationMins: payload.sessionDurationMins,
          dietaryPreference: payload.dietaryPreference ?? null,
        },
      });

      await tx.goal.upsert({
        where: { userId_type: { userId: user.id, type: payload.goalType } },
        create: {
          userId: user.id,
          type: payload.goalType,
          notes: payload.currentGoal ?? "User onboarding goal",
        },
        update: {
          notes: payload.currentGoal ?? "Updated via onboarding",
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          onboardingCompletedAt: new Date(),
        },
      });

      return savedProfile;
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "USER_ONBOARDING_UPDATED",
      entityType: "Profile",
      entityId: profile.id,
      metadata: {
        goalType: payload.goalType,
        trainingDaysPerWeek: payload.trainingDaysPerWeek,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ profile });
  } catch (error) {
    return handleApiError(error, "Could not save onboarding data.");
  }
}
