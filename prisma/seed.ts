import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";

async function ensureUserScaffold(userId: string, email: string) {
  await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      currentGoal: "Build a stronger, leaner body",
    },
  });

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: "Starter",
      planTier: "STARTER",
      status: "ACTIVE",
      provider: "NONE",
    },
    create: {
      userId,
      plan: "Starter",
      planTier: "STARTER",
      status: "ACTIVE",
      provider: "NONE",
    },
  });

  await prisma.billingProfile.upsert({
    where: { userId },
    update: {
      billingEmail: email,
      provider: "NONE",
    },
    create: {
      userId,
      billingEmail: email,
      provider: "NONE",
    },
  });
}

async function upsertBaseUser(input: {
  email: string;
  password: string;
  name: string;
  role: string;
  status?: string;
}) {
  const hashedPassword = await hash(input.password, 10);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      password: hashedPassword,
      role: input.role,
      status: input.status ?? "ACTIVE",
      emailVerified: new Date(),
    },
    create: {
      email: input.email,
      name: input.name,
      password: hashedPassword,
      role: input.role,
      status: input.status ?? "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await ensureUserScaffold(user.id, user.email);
  return user;
}

async function main() {
  const email = process.env.DEMO_EMAIL || "demo@fitpilot.ai";
  const password = process.env.DEMO_PASSWORD || "demo1234";
  const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@fitpilot.ai";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "admin1234";
  const seedDemoSuperAdmin = process.env.SEED_DEMO_SUPERADMIN === "true";

  const user = await upsertBaseUser({
    email,
    password,
    name: "Demo Athlete",
    role: "USER",
  });

  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      age: 29,
      sex: "MALE",
      heightCm: 182,
      weightKg: 81.5,
      goalType: "RECOMP",
      experienceLevel: "INTERMEDIATE",
      trainingLocation: "GYM",
      trainingDaysPerWeek: 4,
      sessionDurationMins: 60,
      availableEquipment: "Full gym, cables, dumbbells, cardio machines",
      dietaryPreference: "High-protein balanced",
      injuries: "Occasional shoulder tightness",
      currentGoal: "Build muscle while leaning out slightly",
    },
  });

  await upsertBaseUser({
    email: adminEmail,
    password: adminPassword,
    name: "Demo Admin",
    role: "ADMIN",
  });

  if (seedDemoSuperAdmin) {
    const superAdminEmail = process.env.DEMO_SUPERADMIN_EMAIL || "owner@fitpilot.ai";
    const superAdminPassword = process.env.DEMO_SUPERADMIN_PASSWORD || "owner1234";

    await upsertBaseUser({
      email: superAdminEmail,
      password: superAdminPassword,
      name: "Demo Owner",
      role: "SUPERADMIN",
    });
  }

  await prisma.goal.upsert({
    where: { userId_type: { userId: user.id, type: "RECOMP" } },
    update: { notes: "Lean out while keeping strength" },
    create: {
      userId: user.id,
      type: "RECOMP",
      notes: "Lean out while keeping strength",
    },
  });

  await prisma.workoutSession.deleteMany({ where: { userId: user.id } });
  await prisma.workoutPlan.deleteMany({ where: { userId: user.id } });

  const workoutPlan = await prisma.workoutPlan.create({
    data: {
      userId: user.id,
      title: "Adaptive 4-Day Performance Week",
      split: "Upper / Lower Strength + Hypertrophy",
      summary:
        "This week balances strength retention, higher-quality hypertrophy work, and shoulder-friendly volume across four realistic sessions.",
      days: {
        create: [
          {
            name: "Day 1 — Upper Strength",
            dayOfWeek: "Monday",
            focus: "Heavy press + pull",
            rationale:
              "Start the week with your biggest upper-body lifts so performance stays high while recovery is still fresh.",
            coachTip:
              "Keep the first press and pull 1-2 reps shy of failure, then move quickly through the accessory work.",
            targetDurationMins: 60,
            order: 0,
            exercises: {
              create: [
                {
                  name: "Neutral-Grip DB Bench Press",
                  muscleGroup: "Chest",
                  sets: 4,
                  reps: 6,
                  restSeconds: 120,
                  notes: "Use a shoulder-friendly grip and stop the set before pressing speed drops hard.",
                  order: 0,
                },
                {
                  name: "Pull-up",
                  muscleGroup: "Back",
                  sets: 4,
                  reps: 6,
                  restSeconds: 120,
                  notes: "Own the bottom position and avoid kipping the final reps.",
                  order: 1,
                },
                {
                  name: "Chest-Supported Row",
                  muscleGroup: "Back",
                  sets: 3,
                  reps: 8,
                  restSeconds: 90,
                  notes: "Pause the handle close to the torso on each rep.",
                  order: 2,
                },
                {
                  name: "Cable Lateral Raise",
                  muscleGroup: "Shoulders",
                  sets: 3,
                  reps: 12,
                  restSeconds: 60,
                  notes: "Smooth tempo and no shrugging.",
                  order: 3,
                },
                {
                  name: "Plank",
                  muscleGroup: "Core",
                  sets: 3,
                  reps: 40,
                  restSeconds: 45,
                  notes: "Seconds.",
                  order: 4,
                },
              ],
            },
          },
          {
            name: "Day 2 — Lower Strength",
            dayOfWeek: "Tuesday",
            focus: "Primary squat + hinge",
            rationale:
              "The main lower-body work lands early in the week so you can push load without burying the rest of the training block.",
            coachTip:
              "Own the descent on the squat and keep the hinge pattern crisp instead of chasing a weight jump.",
            targetDurationMins: 60,
            order: 1,
            exercises: {
              create: [
                { name: "Back Squat", muscleGroup: "Quads", sets: 4, reps: 5, restSeconds: 150, order: 0 },
                {
                  name: "Romanian Deadlift",
                  muscleGroup: "Hamstrings",
                  sets: 4,
                  reps: 6,
                  restSeconds: 120,
                  order: 1,
                },
                {
                  name: "Bulgarian Split Squat",
                  muscleGroup: "Quads",
                  sets: 3,
                  reps: 8,
                  restSeconds: 90,
                  order: 2,
                },
                { name: "Leg Curl", muscleGroup: "Hamstrings", sets: 3, reps: 10, restSeconds: 75, order: 3 },
                {
                  name: "Pallof Press",
                  muscleGroup: "Core",
                  sets: 3,
                  reps: 12,
                  restSeconds: 45,
                  notes: "Each side.",
                  order: 4,
                },
              ],
            },
          },
          {
            name: "Day 3 — Upper Hypertrophy",
            dayOfWeek: "Thursday",
            focus: "Upper-body volume",
            rationale:
              "The heavier work is already done, so this session chases upper-body volume without needing maximal loading.",
            coachTip:
              "Use controlled eccentrics on the presses and rows; this day should feel hard, not sloppy.",
            targetDurationMins: 55,
            order: 2,
            exercises: {
              create: [
                { name: "Incline DB Press", muscleGroup: "Chest", sets: 3, reps: 8, restSeconds: 90, order: 0 },
                { name: "Lat Pulldown", muscleGroup: "Back", sets: 3, reps: 10, restSeconds: 90, order: 1 },
                {
                  name: "Seated DB Shoulder Press",
                  muscleGroup: "Shoulders",
                  sets: 3,
                  reps: 10,
                  restSeconds: 75,
                  order: 2,
                },
                { name: "Face Pull", muscleGroup: "Upper Back", sets: 3, reps: 12, restSeconds: 60, order: 3 },
                { name: "Rope Pushdown", muscleGroup: "Triceps", sets: 3, reps: 12, restSeconds: 60, order: 4 },
                { name: "Hammer Curl", muscleGroup: "Biceps", sets: 3, reps: 12, restSeconds: 60, order: 5 },
              ],
            },
          },
          {
            name: "Day 4 — Lower Hypertrophy",
            dayOfWeek: "Saturday",
            focus: "Leg volume + conditioning",
            rationale:
              "Lower-body volume closes the week with enough conditioning to support recovery and work capacity without becoming random cardio.",
            coachTip:
              "Keep the single-leg work smooth, then treat the conditioning block as steady honest effort rather than a max sprint.",
            targetDurationMins: 55,
            order: 3,
            exercises: {
              create: [
                { name: "Goblet Squat", muscleGroup: "Quads", sets: 3, reps: 10, restSeconds: 90, order: 0 },
                {
                  name: "DB Romanian Deadlift",
                  muscleGroup: "Hamstrings",
                  sets: 3,
                  reps: 10,
                  restSeconds: 90,
                  order: 1,
                },
                { name: "Step-up", muscleGroup: "Quads", sets: 3, reps: 10, restSeconds: 75, order: 2 },
                { name: "Leg Extension", muscleGroup: "Quads", sets: 3, reps: 12, restSeconds: 60, order: 3 },
                {
                  name: "Bike Intervals",
                  muscleGroup: "Conditioning",
                  sets: 1,
                  reps: 12,
                  restSeconds: 0,
                  notes: "Minutes.",
                  order: 4,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  await prisma.nutritionPlan.deleteMany({ where: { userId: user.id } });
  await prisma.nutritionPlan.create({
    data: {
      userId: user.id,
      calories: 2380,
      protein: 185,
      carbs: 245,
      fat: 68,
      guidance:
        "Keep protein anchored at each meal, bias a bigger share of carbs around training, and repeat the same two or three easy lunches so adherence stays frictionless.",
      sampleMeals: JSON.stringify([
        { name: "Breakfast", description: "Greek yogurt, oats, berries, and honey", calories: 520 },
        { name: "Lunch", description: "Chicken rice bowl with vegetables and avocado", calories: 710 },
        { name: "Dinner", description: "Salmon, potatoes, and greens with olive oil", calories: 760 },
        { name: "Snack", description: "Protein shake and fruit", calories: 390 },
      ]),
    },
  });

  await prisma.weightLog.deleteMany({ where: { userId: user.id } });
  await prisma.weightLog.createMany({
    data: [
      { userId: user.id, date: new Date("2026-03-15"), weightKg: 82.4 },
      { userId: user.id, date: new Date("2026-03-22"), weightKg: 82.0 },
      { userId: user.id, date: new Date("2026-03-29"), weightKg: 81.7 },
      { userId: user.id, date: new Date("2026-04-05"), weightKg: 81.3 },
      { userId: user.id, date: new Date("2026-04-12"), weightKg: 81.0 },
    ],
  });

  await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
  await prisma.chatMessage.createMany({
    data: [
      { userId: user.id, role: "USER", content: "Adjust my upper day if my shoulder feels tight." },
      {
        userId: user.id,
        role: "ASSISTANT",
        content: "Swap the first press to a neutral-grip DB press, keep rows chest-supported, and stay 1-2 reps shy of failure on pressing today.",
      },
      { userId: user.id, role: "USER", content: "How should I place carbs around training this week?" },
      {
        userId: user.id,
        role: "ASSISTANT",
        content: "Keep your biggest carb portions in the pre- and post-workout meals so the hard sessions feel better without pushing total calories up.",
      },
    ],
  });

  const upperDay = workoutPlan.days[0];
  await prisma.workoutSession.create({
    data: {
      userId: user.id,
      workoutPlanId: workoutPlan.id,
      workoutDayId: upperDay.id,
      status: "COMPLETED",
      planTitle: workoutPlan.title,
      dayName: upperDay.name,
      dayFocus: upperDay.focus,
      coachFeedback:
        "Strong session. You hit every planned set on the upper-strength day, which is exactly the kind of execution that makes the rest of the week easier to manage.",
      totalExercises: upperDay.exercises.length,
      completedExercises: upperDay.exercises.length,
      totalSets: upperDay.exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
      completedSets: upperDay.exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
      completionPercent: 100,
      startedAt: new Date("2026-04-14T06:30:00Z"),
      completedAt: new Date("2026-04-14T07:28:00Z"),
      exercises: {
        create: upperDay.exercises.map((exercise) => ({
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          setsTarget: exercise.sets,
          repsTarget: exercise.reps,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
          order: exercise.order,
          completedSets: exercise.sets,
          isCompleted: true,
          completedAt: new Date("2026-04-14T07:28:00Z"),
        })),
      },
    },
  });

  await prisma.workoutLog.deleteMany({ where: { userId: user.id } });
  await prisma.workoutLog.create({
    data: {
      userId: user.id,
      workoutDayId: upperDay.id,
      completed: true,
      notes: "Completed upper strength day with full exercise completion.",
      performedAt: new Date("2026-04-14T07:28:00Z"),
    },
  });

  await prisma.coachCallSession.deleteMany({ where: { userId: user.id } });
  const call = await prisma.coachCallSession.create({
    data: {
      userId: user.id,
      status: "COMPLETED",
      generationStatus: "COMPLETED",
      summary:
        "Prioritized a four-day upper/lower performance split with shoulder-friendly pressing choices, realistic weekly volume, and a nutrition target tied to the current training load.",
      endedAt: new Date(),
      intake: {
        create: {
          goal: "Recomp while keeping strength up",
          weight: 81.5,
          height: 182,
          age: 29,
          experience: "Intermediate",
          injuries: "Occasional shoulder tightness",
          daysPerWeek: 4,
          sessionDuration: 60,
          location: "Gym",
          equipment: "Full gym, cables, dumbbells, cardio machines",
          cardio: "Bike or incline walk",
          summary: "Train four times per week, keep pressing shoulder-friendly, and stay on a moderate recomposition setup.",
          safetyNote: "Use pain-free pressing angles and back off any movement that becomes sharp or unstable.",
          rawJson: JSON.stringify({ seed: true }),
        },
      },
    },
  });

  await prisma.coachCallTranscript.createMany({
    data: [
      { sessionId: call.id, role: "USER", content: "I have 4 days, around an hour each, and my shoulder gets tight if overhead work gets too aggressive." },
      { sessionId: call.id, role: "ASSISTANT", content: "We’ll keep the split structured, bias neutral-grip pressing, and use enough pulling volume to keep the shoulder happier." },
    ],
  });

  console.log("Seeded demo user:", email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
