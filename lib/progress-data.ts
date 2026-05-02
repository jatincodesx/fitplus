import "server-only";

import { prisma } from "@/lib/prisma";
import { formatDisplayDate } from "@/lib/utils";

type WeightLogView = {
  id: string;
  date: Date;
  weightKg: number;
};

type WorkoutSessionView = {
  id: string;
  status: string;
};

type WorkoutLogView = {
  id: string;
  completed: boolean;
};

export async function getProgressPageData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weightLogs: {
        orderBy: { date: "asc" },
        take: 120,
        select: {
          id: true,
          date: true,
          weightKg: true,
        },
      },
      workoutSessions: {
        orderBy: { startedAt: "desc" },
        take: 14,
        select: {
          id: true,
          status: true,
        },
      },
      workoutLogs: {
        orderBy: { performedAt: "desc" },
        take: 14,
        select: {
          id: true,
          completed: true,
        },
      },
    },
  });

  const weightLogs = user?.weightLogs ?? ([] as WeightLogView[]);
  const workoutSessions = user?.workoutSessions ?? ([] as WorkoutSessionView[]);
  const workoutLogs = user?.workoutLogs ?? ([] as WorkoutLogView[]);

  const weightSeries = weightLogs.map((entry) => ({
    label: formatDisplayDate(entry.date),
    value: entry.weightKg,
  }));

  const sessionHistory =
    workoutSessions.length > 0
      ? workoutSessions
      : workoutLogs.map((log) => ({
          id: log.id,
          status: log.completed ? "COMPLETED" : "ACTIVE",
        }));

  const completedCount = sessionHistory.filter((entry) => entry.status === "COMPLETED").length;
  const adherence = sessionHistory.length ? Math.round((completedCount / sessionHistory.length) * 100) : 0;

  return {
    weightSeries,
    adherence,
    hasWeightLogs: weightLogs.length > 0,
    hasWorkoutHistory: sessionHistory.length > 0,
  };
}
