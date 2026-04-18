import { CompleteUserFitnessContext } from "./coach-context";
import { aiProvider } from "./ai";
import {
  NutritionPlanPayload,
  WorkoutDayPayload,
  WorkoutExercisePayload,
  WorkoutPlanPayload,
  nutritionPlanZod,
  workoutPlanZod,
} from "./schemas/coach";

type GenerationResult<T> = {
  suggestion: T;
  source: "ai" | "fallback";
  error?: string;
};

type NormalizedGoal = "strength" | "muscle_gain" | "fat_loss" | "recomp" | "general_fitness";
type ExperienceTier = "beginner" | "intermediate" | "advanced";
type DayKind =
  | "upper_strength"
  | "lower_strength"
  | "upper_hypertrophy"
  | "lower_hypertrophy"
  | "push"
  | "pull"
  | "legs"
  | "full_body_a"
  | "full_body_b"
  | "full_body_c"
  | "conditioning";

type Movement = {
  name: string;
  muscleGroup: string;
  notes?: string;
};

type EnvironmentFlags = {
  locationLabel: string;
  equipmentLabel: string;
  home: boolean;
  gym: boolean;
  hasBarbell: boolean;
  hasBench: boolean;
  hasRack: boolean;
  hasDumbbells: boolean;
  hasCable: boolean;
  hasMachines: boolean;
  hasBands: boolean;
  hasPullup: boolean;
  hasKettlebell: boolean;
  hasCardio: boolean;
};

type LimitationFlags = {
  shoulderSensitive: boolean;
  kneeSensitive: boolean;
  backSensitive: boolean;
};

function lower(value?: string | null) {
  return value?.toLowerCase() ?? "";
}

function containsAny(input: string, phrases: string[]) {
  return phrases.some((phrase) => input.includes(phrase));
}

function normalizeGoal(context: CompleteUserFitnessContext): NormalizedGoal {
  const source = lower(
    context.latestIntake?.goal ??
      context.profile.currentGoal ??
      context.profile.goalType ??
      context.latestGoal?.type
  );

  if (containsAny(source, ["strength", "power", "performance"])) return "strength";
  if (containsAny(source, ["fat", "cut", "lean", "weight loss"])) return "fat_loss";
  if (containsAny(source, ["bulk", "hypertrophy", "muscle", "size", "gain"])) return "muscle_gain";
  if (containsAny(source, ["recomp", "re-composition", "recomposition"])) return "recomp";
  return "general_fitness";
}

function normalizeExperience(context: CompleteUserFitnessContext): ExperienceTier {
  const source = lower(context.latestIntake?.experience ?? context.profile.experienceLevel);
  if (containsAny(source, ["advanced", "experienced", "competitive"])) return "advanced";
  if (containsAny(source, ["intermediate"])) return "intermediate";
  return "beginner";
}

function getTrainingDays(context: CompleteUserFitnessContext) {
  return Math.min(
    7,
    Math.max(
      2,
      context.latestIntake?.daysPerWeek ??
        context.profile.trainingDaysPerWeek ??
        context.currentPlan?.dayCount ??
        4
    )
  );
}

function getSessionDuration(context: CompleteUserFitnessContext) {
  return Math.min(
    120,
    Math.max(
      20,
      context.latestIntake?.sessionDuration ??
        context.profile.sessionDurationMins ??
        55
    )
  );
}

function deriveEnvironment(context: CompleteUserFitnessContext): EnvironmentFlags {
  const locationLabel = lower(context.latestIntake?.location ?? context.profile.trainingLocation);
  const equipmentLabel = lower(context.latestIntake?.equipment ?? context.profile.availableEquipment);
  const combined = `${locationLabel} ${equipmentLabel}`;
  const gym = containsAny(combined, ["gym", "full gym", "commercial", "fitness center", "studio"]);
  const home = containsAny(combined, ["home", "apartment", "garage"]) || !gym;

  return {
    locationLabel,
    equipmentLabel,
    home,
    gym,
    hasBarbell: gym || containsAny(combined, ["barbell", "olympic"]),
    hasBench: gym || containsAny(combined, ["bench"]),
    hasRack: gym || containsAny(combined, ["rack", "squat stand"]),
    hasDumbbells: gym || containsAny(combined, ["dumbbell", "adjustable"]),
    hasCable: gym || containsAny(combined, ["cable"]),
    hasMachines: gym || containsAny(combined, ["machine", "leg press", "selectorized"]),
    hasBands: gym || containsAny(combined, ["band", "mini band"]),
    hasPullup: gym || containsAny(combined, ["pull-up", "chin-up", "bar"]),
    hasKettlebell: containsAny(combined, ["kettlebell"]),
    hasCardio: gym || containsAny(combined, ["bike", "treadmill", "rower", "elliptical", "jump rope"]),
  };
}

function deriveLimitations(context: CompleteUserFitnessContext): LimitationFlags {
  const injuries = lower(context.latestIntake?.injuries ?? context.profile.injuries);
  return {
    shoulderSensitive: containsAny(injuries, ["shoulder", "rotator", "impingement"]),
    kneeSensitive: containsAny(injuries, ["knee", "patellar"]),
    backSensitive: containsAny(injuries, ["back", "lumbar", "disc", "sciatica"]),
  };
}

function targetExerciseCount(sessionDuration: number, experience: ExperienceTier) {
  if (sessionDuration <= 35) return 4;
  if (sessionDuration <= 50) return experience === "advanced" ? 5 : 4;
  if (sessionDuration <= 65) return experience === "advanced" ? 6 : 5;
  return experience === "advanced" ? 7 : 6;
}

function buildAssignedDays(trainingDays: number) {
  const templates: Record<number, string[]> = {
    2: ["Monday", "Thursday"],
    3: ["Monday", "Wednesday", "Friday"],
    4: ["Monday", "Tuesday", "Thursday", "Saturday"],
    5: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"],
    6: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    7: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  };

  return templates[trainingDays] ?? templates[4];
}

function prescriptionForSlot(
  slot:
    | "main_compound"
    | "secondary_compound"
    | "accessory"
    | "isolation"
    | "core"
    | "conditioning",
  goal: NormalizedGoal,
  experience: ExperienceTier
) {
  const base = {
    main_compound: { sets: 4, reps: goal === "strength" ? 5 : goal === "fat_loss" ? 8 : 6, restSeconds: 150 },
    secondary_compound: {
      sets: 3,
      reps: goal === "strength" ? 6 : goal === "fat_loss" ? 10 : 8,
      restSeconds: 120,
    },
    accessory: { sets: 3, reps: goal === "strength" ? 8 : 10, restSeconds: 90 },
    isolation: { sets: 3, reps: 12, restSeconds: 60 },
    core: { sets: 3, reps: 12, restSeconds: 45 },
    conditioning: {
      sets: 1,
      reps: goal === "fat_loss" ? 14 : 10,
      restSeconds: 0,
    },
  }[slot];

  const setAdjustment = experience === "advanced" && slot !== "conditioning" ? 1 : 0;
  const beginnerAdjustment = experience === "beginner" && slot === "main_compound" ? -1 : 0;

  return {
    sets: Math.max(1, base.sets + setAdjustment + beginnerAdjustment),
    reps: base.reps,
    restSeconds: base.restSeconds,
  };
}

function createExercise(
  movement: Movement,
  slot:
    | "main_compound"
    | "secondary_compound"
    | "accessory"
    | "isolation"
    | "core"
    | "conditioning",
  goal: NormalizedGoal,
  experience: ExperienceTier,
  noteOverride?: string
): WorkoutExercisePayload {
  const prescription = prescriptionForSlot(slot, goal, experience);
  return {
    name: movement.name,
    muscleGroup: movement.muscleGroup,
    sets: prescription.sets,
    reps: prescription.reps,
    restSeconds: prescription.restSeconds,
    notes: noteOverride ?? movement.notes,
  };
}

function pickHorizontalPress(env: EnvironmentFlags, limits: LimitationFlags, incline = false): Movement {
  if (limits.shoulderSensitive) {
    if (env.hasDumbbells) {
      return {
        name: incline ? "Neutral-Grip Incline DB Press" : "Neutral-Grip DB Bench Press",
        muscleGroup: "Chest",
        notes: "Use a pain-free range and stop 1-2 reps shy of failure.",
      };
    }
    if (env.hasCable) {
      return {
        name: "Cable Chest Press",
        muscleGroup: "Chest",
        notes: "Keep shoulders down and let the scapula move naturally.",
      };
    }
    return {
      name: "Hands-Elevated Push-up",
      muscleGroup: "Chest",
      notes: "Use a box or bench height that keeps shoulders comfortable.",
    };
  }

  if (env.hasBarbell && env.hasBench) {
    return {
      name: incline ? "Incline Barbell Press" : "Barbell Bench Press",
      muscleGroup: "Chest",
      notes: "Keep the first work sets crisp and leave 1-2 reps in reserve.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: incline ? "Incline DB Press" : "Flat DB Press",
      muscleGroup: "Chest",
      notes: "Control the eccentric and keep your shoulder blades set.",
    };
  }

  return {
    name: "Push-up",
    muscleGroup: "Chest",
    notes: "Move with control and elevate hands if needed to keep quality high.",
  };
}

function pickVerticalPress(env: EnvironmentFlags, limits: LimitationFlags): Movement {
  if (limits.shoulderSensitive) {
    if (env.hasCable || env.hasBarbell) {
      return {
        name: "Half-Kneeling Landmine Press",
        muscleGroup: "Shoulders",
        notes: "Press on a diagonal path and stop before discomfort.",
      };
    }
    if (env.hasDumbbells) {
      return {
        name: "Half-Kneeling Single-Arm DB Press",
        muscleGroup: "Shoulders",
        notes: "Use a neutral grip and keep the ribcage stacked.",
      };
    }
    return {
      name: "Lean-Away Lateral Raise",
      muscleGroup: "Shoulders",
      notes: "Smooth tempo, stop if range becomes pinchy.",
    };
  }

  if (env.hasBarbell) {
    return {
      name: "Standing Overhead Press",
      muscleGroup: "Shoulders",
      notes: "Brace hard and avoid leaning back to finish the rep.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: "Seated DB Shoulder Press",
      muscleGroup: "Shoulders",
      notes: "Drive smoothly and avoid slamming into lockout.",
    };
  }

  return {
    name: "Pike Push-up",
    muscleGroup: "Shoulders",
    notes: "Use a box if needed so each rep stays controlled.",
  };
}

function pickRow(env: EnvironmentFlags, limits: LimitationFlags, supported = false): Movement {
  if ((supported || limits.backSensitive) && env.hasMachines) {
    return {
      name: "Chest-Supported Row",
      muscleGroup: "Back",
      notes: "Drive elbows low and pause briefly at the body.",
    };
  }

  if ((supported || limits.backSensitive) && env.hasCable) {
    return {
      name: "Seated Cable Row",
      muscleGroup: "Back",
      notes: "Keep the torso quiet and reach into the stretch.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: supported ? "Chest-Supported DB Row" : "Single-Arm DB Row",
      muscleGroup: "Back",
      notes: "Own the bottom stretch before initiating each pull.",
    };
  }

  if (env.hasBands) {
    return {
      name: "Banded Row",
      muscleGroup: "Back",
      notes: "Pause at peak contraction for a clean back squeeze.",
    };
  }

  return {
    name: "Inverted Row",
    muscleGroup: "Back",
    notes: "Use body angle to keep all reps smooth and full-range.",
  };
}

function pickVerticalPull(env: EnvironmentFlags): Movement {
  if (env.hasPullup) {
    return {
      name: "Pull-up",
      muscleGroup: "Back",
      notes: "Start from a dead hang and stop one rep before form slips.",
    };
  }

  if (env.hasCable || env.hasMachines) {
    return {
      name: "Lat Pulldown",
      muscleGroup: "Back",
      notes: "Drive elbows to the ribs without leaning back excessively.",
    };
  }

  if (env.hasBands) {
    return {
      name: "Banded Pulldown",
      muscleGroup: "Back",
      notes: "Stay tall and keep tension through the whole range.",
    };
  }

  return {
    name: "Straight-Arm Pulldown",
    muscleGroup: "Lats",
    notes: "Use a long arc and keep ribs stacked.",
  };
}

function pickSquat(env: EnvironmentFlags, limits: LimitationFlags): Movement {
  if (limits.kneeSensitive) {
    if (env.hasBarbell && env.hasRack) {
      return {
        name: "Box Squat",
        muscleGroup: "Quads",
        notes: "Use a controlled sit-back and keep shin travel manageable.",
      };
    }

    if (env.hasDumbbells) {
      return {
        name: "Goblet Box Squat",
        muscleGroup: "Quads",
        notes: "Use a box height that keeps the knee comfortable.",
      };
    }
  }

  if (env.hasBarbell && env.hasRack) {
    return {
      name: "Back Squat",
      muscleGroup: "Quads",
      notes: "Brace hard and keep the descent controlled.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: "Goblet Squat",
      muscleGroup: "Quads",
      notes: "Use a full, controlled range and pause briefly at the bottom.",
    };
  }

  return {
    name: "Tempo Bodyweight Squat",
    muscleGroup: "Quads",
    notes: "Three-second lower, smooth drive up.",
  };
}

function pickHinge(env: EnvironmentFlags, limits: LimitationFlags): Movement {
  if (limits.backSensitive) {
    if (env.hasMachines) {
      return {
        name: "Hip Thrust",
        muscleGroup: "Glutes",
        notes: "Pause at lockout and keep the ribcage tucked.",
      };
    }
    if (env.hasDumbbells) {
      return {
        name: "DB Hip Thrust",
        muscleGroup: "Glutes",
        notes: "Keep the load over the hips and control the lowering phase.",
      };
    }
    return {
      name: "Glute Bridge",
      muscleGroup: "Glutes",
      notes: "Exhale at the top and keep the lower back quiet.",
    };
  }

  if (env.hasBarbell) {
    return {
      name: "Romanian Deadlift",
      muscleGroup: "Hamstrings",
      notes: "Push hips back and keep the bar close to the body.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: "DB Romanian Deadlift",
      muscleGroup: "Hamstrings",
      notes: "Own the hamstring stretch and avoid bouncing out of the bottom.",
    };
  }

  if (env.hasBands) {
    return {
      name: "Banded Good Morning",
      muscleGroup: "Posterior Chain",
      notes: "Move from the hips and keep your torso braced.",
    };
  }

  return {
    name: "Single-Leg Hip Hinge",
    muscleGroup: "Posterior Chain",
    notes: "Use a light support to keep the pelvis square.",
  };
}

function pickSingleLeg(env: EnvironmentFlags, limits: LimitationFlags): Movement {
  if (limits.kneeSensitive) {
    if (env.hasDumbbells) {
      return {
        name: "Low Step-up",
        muscleGroup: "Quads",
        notes: "Use a step height that lets the front knee stay calm.",
      };
    }
    return {
      name: "Reverse Lunge",
      muscleGroup: "Quads",
      notes: "Keep stride long and torso slightly forward for better control.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: "Bulgarian Split Squat",
      muscleGroup: "Quads",
      notes: "Keep the front foot planted and control the lower phase.",
    };
  }

  return {
    name: "Reverse Lunge",
    muscleGroup: "Quads",
    notes: "Stay balanced and keep reps smooth rather than rushed.",
  };
}

function pickHamstringAccessory(env: EnvironmentFlags): Movement {
  if (env.hasMachines) {
    return {
      name: "Leg Curl",
      muscleGroup: "Hamstrings",
      notes: "Squeeze for a beat at the shortened position.",
    };
  }

  if (env.hasBands) {
    return {
      name: "Banded Leg Curl",
      muscleGroup: "Hamstrings",
      notes: "Keep hips pinned down and own the contraction.",
    };
  }

  return {
    name: "Sliding Leg Curl",
    muscleGroup: "Hamstrings",
    notes: "Keep hips up and move slowly on the way out.",
  };
}

function pickQuadAccessory(env: EnvironmentFlags, limits: LimitationFlags): Movement {
  if (env.hasMachines && !limits.kneeSensitive) {
    return {
      name: "Leg Extension",
      muscleGroup: "Quads",
      notes: "Smooth squeeze at the top without slamming the knee straight.",
    };
  }

  return {
    name: "Step-up",
    muscleGroup: "Quads",
    notes: "Drive through the full foot and control the descent.",
  };
}

function pickShoulderAccessory(env: EnvironmentFlags): Movement {
  if (env.hasCable) {
    return {
      name: "Cable Lateral Raise",
      muscleGroup: "Shoulders",
      notes: "Lead with the elbow and avoid shrugging at the top.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: "DB Lateral Raise",
      muscleGroup: "Shoulders",
      notes: "Use a soft elbow and stop before momentum takes over.",
    };
  }

  return {
    name: "Y-Raise",
    muscleGroup: "Shoulders",
    notes: "Move deliberately and keep the neck relaxed.",
  };
}

function pickRearDeltAccessory(env: EnvironmentFlags): Movement {
  if (env.hasCable || env.hasBands) {
    return {
      name: "Face Pull",
      muscleGroup: "Upper Back",
      notes: "Pull toward forehead height and rotate thumbs back.",
    };
  }

  return {
    name: "Rear Delt Fly",
    muscleGroup: "Upper Back",
    notes: "Keep the chest supported if possible and move cleanly.",
  };
}

function pickBiceps(env: EnvironmentFlags): Movement {
  if (env.hasCable) {
    return {
      name: "Cable Curl",
      muscleGroup: "Biceps",
      notes: "Keep shoulders quiet and control the lowering phase.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: "Hammer Curl",
      muscleGroup: "Biceps",
      notes: "Keep the elbow stacked and avoid swinging the bell.",
    };
  }

  return {
    name: "Banded Curl",
    muscleGroup: "Biceps",
    notes: "Pause briefly at peak contraction.",
  };
}

function pickTriceps(env: EnvironmentFlags): Movement {
  if (env.hasCable) {
    return {
      name: "Rope Pushdown",
      muscleGroup: "Triceps",
      notes: "Separate the rope at the bottom and keep elbows pinned.",
    };
  }

  if (env.hasDumbbells) {
    return {
      name: "Overhead DB Triceps Extension",
      muscleGroup: "Triceps",
      notes: "Keep ribs tucked and move through a full stretch.",
    };
  }

  return {
    name: "Close-Grip Push-up",
    muscleGroup: "Triceps",
    notes: "Keep elbows close and move through a clean range.",
  };
}

function pickCore(env: EnvironmentFlags, emphasis: "anti_extension" | "rotation" = "anti_extension"): Movement {
  if (emphasis === "rotation" && (env.hasCable || env.hasBands)) {
    return {
      name: "Pallof Press",
      muscleGroup: "Core",
      notes: "Exhale through the press and resist torso rotation.",
    };
  }

  if (env.hasPullup) {
    return {
      name: "Hanging Knee Raise",
      muscleGroup: "Core",
      notes: "Posteriorly tilt the pelvis rather than swinging the legs.",
    };
  }

  return {
    name: "Plank",
    muscleGroup: "Core",
    notes: "Treat every set like a hard brace, not a passive hold.",
  };
}

function pickConditioning(env: EnvironmentFlags): Movement {
  if (env.hasCardio) {
    if (containsAny(env.equipmentLabel, ["bike", "assault", "echo"])) {
      return {
        name: "Bike Intervals",
        muscleGroup: "Conditioning",
        notes: "Alternate hard efforts with easy spins; keep quality high.",
      };
    }

    return {
      name: "Incline Treadmill Walk",
      muscleGroup: "Conditioning",
      notes: "Keep nasal breathing steady and posture tall.",
    };
  }

  if (env.hasKettlebell) {
    return {
      name: "Kettlebell Swing",
      muscleGroup: "Conditioning",
      notes: "Snap from the hips and keep the bell path compact.",
    };
  }

  return {
    name: "Brisk Walk",
    muscleGroup: "Conditioning",
    notes: "Keep the pace honest enough to raise breathing without redlining.",
  };
}

function buildDayRationale(kind: DayKind, goal: NormalizedGoal, limits: LimitationFlags) {
  const jointNote = limits.shoulderSensitive
    ? " with shoulder-friendly pressing choices"
    : limits.kneeSensitive
      ? " with joint-aware lower-body choices"
      : limits.backSensitive
        ? " with supported hinge and row patterns"
        : "";

  switch (kind) {
    case "upper_strength":
      return `This day anchors the week with your heaviest upper-body work${jointNote}, so strength stays moving without overloading the week.`;
    case "lower_strength":
      return `This session puts the main lower-body strength work early in the week, then adds enough posterior-chain volume to keep balance and recovery intact.`;
    case "upper_hypertrophy":
      return `Volume shifts higher here so you can build quality upper-body work capacity, chase clean reps, and reinforce technique after the heavier session.`;
    case "lower_hypertrophy":
      return `Lower-body volume is pushed here instead of on the heavy day so the weekly leg stimulus stays high without wrecking recovery.`;
    case "push":
      return `A dedicated push day makes sense for ${goal === "muscle_gain" ? "higher-volume hypertrophy work" : "clean upper-body progression"} and keeps the exercise order efficient.`;
    case "pull":
      return "Back and biceps work are grouped here so pulling volume stays balanced against your pressing and posture stays supported.";
    case "legs":
      return "This leg day is built around a squat-hinge-single-leg flow so you get complete lower-body coverage without junk volume.";
    case "conditioning":
      return "Conditioning is included here to improve work capacity and recovery without competing with the main lifting sessions.";
    default:
      return "A full-body structure fits the current schedule because it keeps frequency high, sessions efficient, and muscle-group coverage balanced.";
  }
}

export function generateDailyExecutionTips(
  context: CompleteUserFitnessContext,
  day: WorkoutDayPayload
) {
  const limits = deriveLimitations(context);
  const firstLift = day.exercises[0]?.name ?? "main lift";

  if (limits.shoulderSensitive && containsAny(lower(day.focus), ["push", "upper", "press"])) {
    return `Set your shoulder blades before ${firstLift} and stop the rep range the moment pressing becomes pinchy instead of grinding through it.`;
  }

  if (limits.kneeSensitive && containsAny(lower(day.focus), ["legs", "lower", "squat"])) {
    return `Use a controlled first set on ${firstLift} to find a pain-free range, then keep every rep smooth rather than chasing depth that irritates the knee.`;
  }

  return `Treat ${firstLift} as the tone-setter, keep the first two exercises 1-2 reps shy of failure, and move through the accessories without drifting your rest.`;
}

function buildDay(
  kind: DayKind,
  context: CompleteUserFitnessContext,
  order: number,
  dayOfWeek: string
): WorkoutDayPayload {
  const goal = normalizeGoal(context);
  const experience = normalizeExperience(context);
  const env = deriveEnvironment(context);
  const limits = deriveLimitations(context);
  const sessionDuration = getSessionDuration(context);
  const targetCount = targetExerciseCount(sessionDuration, experience);
  const targetDurationMins =
    kind === "conditioning" ? Math.max(25, Math.min(sessionDuration - 10, 45)) : sessionDuration;

  const exercises: WorkoutExercisePayload[] = [];

  const add = (exercise: WorkoutExercisePayload) => {
    if (!exercises.some((current) => current.name === exercise.name)) {
      exercises.push(exercise);
    }
  };

  if (kind === "upper_strength") {
    add(createExercise(pickHorizontalPress(env, limits), "main_compound", goal, experience));
    add(createExercise(pickVerticalPull(env), "main_compound", goal, experience));
    add(createExercise(pickHorizontalPress(env, limits, true), "secondary_compound", goal, experience));
    add(createExercise(pickRow(env, limits, true), "secondary_compound", goal, experience));
    add(createExercise(pickShoulderAccessory(env), "isolation", goal, experience));
    add(createExercise(pickCore(env), "core", goal, experience, "12 controlled reps or 30-40 seconds per set."));
  }

  if (kind === "lower_strength") {
    add(createExercise(pickSquat(env, limits), "main_compound", goal, experience));
    add(createExercise(pickHinge(env, limits), "main_compound", goal, experience));
    add(createExercise(pickSingleLeg(env, limits), "secondary_compound", goal, experience));
    add(createExercise(pickHamstringAccessory(env), "accessory", goal, experience));
    add(createExercise(pickQuadAccessory(env, limits), "accessory", goal, experience));
    add(createExercise(pickCore(env, "rotation"), "core", goal, experience));
  }

  if (kind === "upper_hypertrophy") {
    add(createExercise(pickHorizontalPress(env, limits, true), "secondary_compound", goal, experience));
    add(createExercise(pickRow(env, limits, true), "secondary_compound", goal, experience));
    add(createExercise(pickVerticalPress(env, limits), "accessory", goal, experience));
    add(createExercise(pickVerticalPull(env), "accessory", goal, experience));
    add(createExercise(pickShoulderAccessory(env), "isolation", goal, experience));
    add(createExercise(pickTriceps(env), "isolation", goal, experience));
    add(createExercise(pickBiceps(env), "isolation", goal, experience));
  }

  if (kind === "lower_hypertrophy") {
    add(createExercise(pickSingleLeg(env, limits), "secondary_compound", goal, experience));
    add(createExercise(pickHinge(env, limits), "secondary_compound", goal, experience));
    add(createExercise(pickSquat(env, limits), "accessory", goal, experience));
    add(createExercise(pickHamstringAccessory(env), "isolation", goal, experience));
    add(createExercise(pickQuadAccessory(env, limits), "isolation", goal, experience));
    add(createExercise(pickConditioning(env), "conditioning", goal, experience, "Use the listed reps as minutes or rounds."));
    add(createExercise(pickCore(env), "core", goal, experience, "12 controlled reps or 30-40 seconds per set."));
  }

  if (kind === "push") {
    add(createExercise(pickHorizontalPress(env, limits), "main_compound", goal, experience));
    add(createExercise(pickHorizontalPress(env, limits, true), "secondary_compound", goal, experience));
    add(createExercise(pickVerticalPress(env, limits), "secondary_compound", goal, experience));
    add(createExercise(pickShoulderAccessory(env), "isolation", goal, experience));
    add(createExercise(pickTriceps(env), "isolation", goal, experience));
    add(createExercise(pickCore(env), "core", goal, experience));
  }

  if (kind === "pull") {
    add(createExercise(pickVerticalPull(env), "main_compound", goal, experience));
    add(createExercise(pickRow(env, limits), "main_compound", goal, experience));
    add(createExercise(pickRow(env, limits, true), "secondary_compound", goal, experience));
    add(createExercise(pickRearDeltAccessory(env), "isolation", goal, experience));
    add(createExercise(pickBiceps(env), "isolation", goal, experience));
    add(createExercise(pickCore(env, "rotation"), "core", goal, experience));
  }

  if (kind === "legs") {
    add(createExercise(pickSquat(env, limits), "main_compound", goal, experience));
    add(createExercise(pickHinge(env, limits), "main_compound", goal, experience));
    add(createExercise(pickSingleLeg(env, limits), "secondary_compound", goal, experience));
    add(createExercise(pickHamstringAccessory(env), "accessory", goal, experience));
    add(createExercise(pickQuadAccessory(env, limits), "accessory", goal, experience));
    add(createExercise(pickConditioning(env), "conditioning", goal, experience, "Use the listed reps as minutes or rounds."));
  }

  if (kind === "conditioning") {
    add(createExercise(pickConditioning(env), "conditioning", goal, experience, "Use the listed reps as minutes or rounds."));
    add(createExercise(pickSingleLeg(env, limits), "accessory", goal, experience));
    add(createExercise(pickCore(env), "core", goal, experience, "12 controlled reps or 30-45 seconds per set."));
    add(createExercise(pickCore(env, "rotation"), "core", goal, experience, "12 controlled reps each side."));
  }

  if (kind === "full_body_a" || kind === "full_body_b" || kind === "full_body_c") {
    add(createExercise(pickSquat(env, limits), "main_compound", goal, experience));
    add(createExercise(pickHorizontalPress(env, limits), "secondary_compound", goal, experience));
    add(createExercise(pickRow(env, limits, true), "secondary_compound", goal, experience));
    add(createExercise(pickHinge(env, limits), "accessory", goal, experience));
    add(createExercise(pickSingleLeg(env, limits), "accessory", goal, experience));
    add(createExercise(pickCore(env, order % 2 === 0 ? "anti_extension" : "rotation"), "core", goal, experience));

    if (kind === "full_body_b") {
      exercises[0] = createExercise(pickHinge(env, limits), "main_compound", goal, experience);
      exercises[3] = createExercise(pickSquat(env, limits), "accessory", goal, experience);
    }

    if (kind === "full_body_c") {
      add(createExercise(pickConditioning(env), "conditioning", goal, experience, "Use the listed reps as minutes or rounds."));
    }
  }

  const trimmed = exercises.slice(0, targetCount);
  const focusMap: Record<DayKind, string> = {
    upper_strength: "Heavy press + pull",
    lower_strength: "Primary squat + hinge",
    upper_hypertrophy: "Upper-body volume",
    lower_hypertrophy: "Leg volume + conditioning",
    push: "Chest, shoulders, triceps",
    pull: "Back, rear delts, biceps",
    legs: "Quads, glutes, hamstrings",
    full_body_a: "Balanced full-body strength",
    full_body_b: "Full-body with posterior-chain bias",
    full_body_c: "Full-body + work capacity",
    conditioning: "Conditioning + trunk work",
  };
  const nameMap: Record<DayKind, string> = {
    upper_strength: "Upper Strength",
    lower_strength: "Lower Strength",
    upper_hypertrophy: "Upper Hypertrophy",
    lower_hypertrophy: "Lower Hypertrophy",
    push: "Push",
    pull: "Pull",
    legs: "Legs",
    full_body_a: "Full Body A",
    full_body_b: "Full Body B",
    full_body_c: "Full Body C",
    conditioning: "Conditioning",
  };

  const day: WorkoutDayPayload = {
    name: `Day ${order + 1} — ${nameMap[kind]}`,
    dayOfWeek,
    focus: focusMap[kind],
    rationale: buildDayRationale(kind, goal, limits),
    coachTip: "",
    targetDurationMins,
    exercises: trimmed,
  };

  day.coachTip = generateDailyExecutionTips(context, day);
  return day;
}

function selectSplitTemplate(
  context: CompleteUserFitnessContext
): { split: string; title: string; dayKinds: DayKind[] } {
  const goal = normalizeGoal(context);
  const experience = normalizeExperience(context);
  const trainingDays = getTrainingDays(context);

  if (trainingDays === 2) {
    return {
      split: "2-Day Full Body",
      title: "Adaptive 2-Day Full Body Week",
      dayKinds: ["full_body_a", "full_body_b"],
    };
  }

  if (trainingDays === 3) {
    if (goal === "strength") {
      return {
        split: "Full Body Strength Rotation",
        title: "Adaptive 3-Day Strength Rotation",
        dayKinds: ["full_body_a", "full_body_b", "full_body_c"],
      };
    }

    if (goal === "fat_loss") {
      return {
        split: "Full Body + Conditioning",
        title: "Adaptive 3-Day Leaning Phase",
        dayKinds: ["full_body_a", "full_body_b", "conditioning"],
      };
    }

    return {
      split: "Push / Pull / Legs",
      title: "Adaptive 3-Day Hypertrophy Week",
      dayKinds: ["push", "pull", "legs"],
    };
  }

  if (trainingDays === 4) {
    return {
      split: "Upper / Lower Strength + Hypertrophy",
      title: "Adaptive 4-Day Performance Week",
      dayKinds: ["upper_strength", "lower_strength", "upper_hypertrophy", "lower_hypertrophy"],
    };
  }

  if (trainingDays === 5) {
    return {
      split: "Push / Pull / Legs / Upper / Conditioning",
      title: "Adaptive 5-Day Performance Week",
      dayKinds: ["push", "pull", "legs", "upper_hypertrophy", "conditioning"],
    };
  }

  if (trainingDays === 6) {
    return {
      split: experience === "advanced" ? "Push / Pull / Legs x 2" : "Upper / Lower / Push / Pull / Legs / Conditioning",
      title: "Adaptive 6-Day Premium Week",
      dayKinds:
        experience === "advanced"
          ? ["push", "pull", "legs", "push", "pull", "legs"]
          : ["upper_strength", "lower_strength", "push", "pull", "legs", "conditioning"],
    };
  }

  return {
    split: "Upper / Lower / Push / Pull / Legs / Conditioning / Recovery",
    title: "Adaptive 7-Day Coaching Week",
    dayKinds: ["upper_strength", "lower_strength", "push", "pull", "legs", "conditioning", "full_body_c"],
  };
}

function usesUnsupportedEquipment(name: string, env: EnvironmentFlags) {
  const exercise = lower(name);

  if (!env.hasBarbell && containsAny(exercise, ["barbell", "back squat", "front squat", "deadlift"])) {
    return true;
  }

  if (!env.hasCable && containsAny(exercise, ["cable", "pushdown", "lat pulldown", "face pull"])) {
    return true;
  }

  if (!env.hasMachines && containsAny(exercise, ["machine", "leg press", "hack squat", "leg extension", "leg curl"])) {
    return true;
  }

  if (!env.hasPullup && containsAny(exercise, ["pull-up", "chin-up", "hanging"])) {
    return true;
  }

  if (!env.hasBench && containsAny(exercise, ["bench press"])) {
    return true;
  }

  return false;
}

function clashesWithLimitations(name: string, limits: LimitationFlags) {
  const exercise = lower(name);

  if (
    limits.shoulderSensitive &&
    containsAny(exercise, ["upright row", "dip", "behind-the-neck", "military press"])
  ) {
    return true;
  }

  if (limits.kneeSensitive && containsAny(exercise, ["sissy squat", "jump lunge"])) {
    return true;
  }

  if (limits.backSensitive && containsAny(exercise, ["good morning", "conventional deadlift"])) {
    return true;
  }

  return false;
}

function normalizeGeneratedWorkoutPlan(
  context: CompleteUserFitnessContext,
  generated: WorkoutPlanPayload | undefined,
  fallback: WorkoutPlanPayload
) {
  if (!generated || generated.days.length !== fallback.days.length) {
    return fallback;
  }

  const env = deriveEnvironment(context);
  const limits = deriveLimitations(context);

  const normalizedDays = generated.days.map((day, index) => {
    const fallbackDay = fallback.days[index];
    const supportedExercises = day.exercises.filter(
      (exercise) =>
        !usesUnsupportedEquipment(exercise.name, env) &&
        !clashesWithLimitations(exercise.name, limits)
    );

    const exercises =
      supportedExercises.length >= Math.min(3, fallbackDay.exercises.length)
        ? supportedExercises.slice(0, fallbackDay.exercises.length).map((exercise, exerciseIndex) => {
            const fallbackExercise = fallbackDay.exercises[exerciseIndex];
            return {
              name: exercise.name || fallbackExercise.name,
              muscleGroup: exercise.muscleGroup || fallbackExercise.muscleGroup,
              sets: exercise.sets ?? fallbackExercise.sets,
              reps: exercise.reps ?? fallbackExercise.reps,
              restSeconds: exercise.restSeconds ?? fallbackExercise.restSeconds,
              notes: exercise.notes ?? fallbackExercise.notes,
            };
          })
        : fallbackDay.exercises;

    return {
      name: day.name || fallbackDay.name,
      dayOfWeek: day.dayOfWeek || fallbackDay.dayOfWeek,
      focus: day.focus || fallbackDay.focus,
      rationale: day.rationale || fallbackDay.rationale,
      coachTip: day.coachTip || fallbackDay.coachTip,
      targetDurationMins: day.targetDurationMins || fallbackDay.targetDurationMins,
      exercises,
    };
  });

  const candidate = {
    title: generated.title || fallback.title,
    split: generated.split || fallback.split,
    summary: generated.summary || fallback.summary,
    days: normalizedDays,
  };

  const parsed = workoutPlanZod.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

function buildFallbackWorkoutPlan(context: CompleteUserFitnessContext): WorkoutPlanPayload {
  const template = selectSplitTemplate(context);
  const dayLabels = buildAssignedDays(template.dayKinds.length);
  const days = template.dayKinds.map((kind, index) => buildDay(kind, context, index, dayLabels[index]));
  const plan: WorkoutPlanPayload = {
    title: template.title,
    split: template.split,
    summary: "",
    days,
  };

  plan.summary = generateWorkoutRationale(context, plan);
  return plan;
}

export function generateWorkoutRationale(
  context: CompleteUserFitnessContext,
  plan: WorkoutPlanPayload
) {
  const goal = normalizeGoal(context);
  const experience = normalizeExperience(context);
  const trainingDays = getTrainingDays(context);
  const sessionDuration = getSessionDuration(context);
  const location = context.latestIntake?.location ?? context.profile.trainingLocation ?? "your training setup";
  const equipment = context.latestIntake?.equipment ?? context.profile.availableEquipment ?? "available equipment";
  const injuries = context.latestIntake?.injuries ?? context.profile.injuries;

  const goalPhrase =
    goal === "strength"
      ? "drive primary lift performance while keeping enough accessory work for balance"
      : goal === "muscle_gain"
        ? "build muscle with enough weekly volume and sensible exercise sequencing"
        : goal === "fat_loss"
          ? "protect strength while keeping weekly work capacity high"
          : goal === "recomp"
            ? "balance strength retention, muscle stimulus, and recovery"
            : "improve general fitness with realistic weekly structure";

  const recoveryPhrase =
    trainingDays >= 5
      ? "Frequency is spread across the week so the harder sessions do not stack recovery debt back-to-back."
      : "The split uses repeated exposure without overstuffing any single session.";

  const injuryPhrase = injuries
    ? ` Exercise selection also accounts for ${injuries.toLowerCase()} so the plan feels realistic to execute, not just impressive on paper.`
    : "";

  return `This ${plan.split?.toLowerCase() ?? "weekly split"} was chosen because ${trainingDays} training days at about ${sessionDuration} minutes per session is enough to ${goalPhrase}. The week keeps compound lifts early, accessories later, and uses ${location.toLowerCase()} constraints plus ${equipment.toLowerCase()} access to keep the plan practical.${recoveryPhrase}${injuryPhrase} ${experience === "advanced" ? "Volume is slightly fuller to match your training age." : "Volume stays controlled so quality stays high."}`;
}

function buildWorkoutPrompt(context: CompleteUserFitnessContext, skeleton: WorkoutPlanPayload) {
  return `You are an elite strength and conditioning coach refining a weekly training plan for a real client.
Athlete context:
${context.promptContext}

You must refine the reference plan below without violating the athlete's constraints.
Reference plan:
${JSON.stringify(skeleton)}

Rules:
- Keep exactly ${skeleton.days.length} training days.
- Respect the stated location, equipment, session length, injuries, and recovery needs.
- Make the plan realistic and premium, not generic.
- Use 4-8 exercises per day based on session length.
- Keep compound lifts earlier in the session.
- Use concise coaching notes and believable prescriptions.
- Return strict JSON only. No prose. No markdown. No code fences.
`;
}

function calculateNutritionBaseline(context: CompleteUserFitnessContext) {
  const weight = context.recentWeightTrend.current ?? context.profile.weightKg ?? 78;
  const height = context.profile.heightCm ?? 175;
  const age = context.profile.age ?? 30;
  const sex = lower(context.profile.sex);
  const goal = normalizeGoal(context);
  const trainingDays = getTrainingDays(context);
  const activityMultiplier = trainingDays >= 5 ? 1.65 : trainingDays >= 4 ? 1.55 : trainingDays >= 3 ? 1.45 : 1.35;
  const sexAdjustment = sex.includes("male") ? 5 : sex.includes("female") ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexAdjustment;
  const maintenance = bmr * activityMultiplier;
  const targetCalories =
    goal === "fat_loss"
      ? maintenance - 350
      : goal === "muscle_gain"
        ? maintenance + 220
        : goal === "strength"
          ? maintenance + 120
          : goal === "recomp"
            ? maintenance - 100
            : maintenance;

  const calories = Math.round(targetCalories / 25) * 25;
  const protein = Math.round(weight * (goal === "fat_loss" ? 2.2 : goal === "muscle_gain" ? 2 : 1.9));
  const fat = Math.round(weight * (goal === "muscle_gain" ? 0.9 : 0.8));
  const carbs = Math.max(90, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat };
}

function buildSampleMeals(context: CompleteUserFitnessContext, calories: number) {
  const preference = lower(context.profile.dietaryPreference);
  const isPlantBased = containsAny(preference, ["vegan", "vegetarian", "plant"]);

  if (isPlantBased) {
    return [
      {
        name: "Breakfast",
        description: "Soy yogurt bowl with oats, berries, chia, and a scoop of plant protein.",
        calories: Math.round(calories * 0.22),
      },
      {
        name: "Lunch",
        description: "Tofu rice bowl with edamame, roasted vegetables, avocado, and sesame dressing.",
        calories: Math.round(calories * 0.3),
      },
      {
        name: "Dinner",
        description: "Lentil pasta with tempeh, tomato sauce, spinach, and olive oil.",
        calories: Math.round(calories * 0.3),
      },
      {
        name: "Snack",
        description: "Protein smoothie with banana, peanut butter, and almond milk.",
        calories: Math.round(calories * 0.18),
      },
    ];
  }

  return [
    {
      name: "Breakfast",
      description: "Eggs or Greek yogurt with fruit, oats, and a protein anchor before the day starts.",
      calories: Math.round(calories * 0.22),
    },
    {
      name: "Lunch",
      description: "Chicken, rice, vegetables, and olive oil for an easy repeatable workday meal.",
      calories: Math.round(calories * 0.3),
    },
    {
      name: "Dinner",
      description: "Lean protein, potatoes or rice, and a large serving of vegetables for recovery.",
      calories: Math.round(calories * 0.3),
    },
    {
      name: "Snack",
      description: "Protein shake or cottage cheese with fruit to close any protein gap.",
      calories: Math.round(calories * 0.18),
    },
  ];
}

function buildFallbackNutritionPlan(context: CompleteUserFitnessContext): NutritionPlanPayload {
  const baseline = calculateNutritionBaseline(context);
  const goal = normalizeGoal(context);
  const meals = buildSampleMeals(context, baseline.calories);
  const guidance =
    goal === "fat_loss"
      ? "Keep protein high, build meals around lean protein and produce first, and place most carbs around training so the deficit feels easier to sustain."
      : goal === "muscle_gain"
        ? "Use this target as a steady surplus, keep protein evenly distributed across the day, and bias carbs around training to support performance and recovery."
        : "Keep protein consistent, use carbs to support training quality, and repeat the same few meals often enough that adherence stays easy.";

  return {
    calories: baseline.calories,
    protein: baseline.protein,
    carbs: baseline.carbs,
    fat: baseline.fat,
    guidance,
    meals,
  };
}

function normalizeGeneratedNutritionPlan(
  generated: NutritionPlanPayload | undefined,
  fallback: NutritionPlanPayload
) {
  if (!generated) return fallback;
  const parsed = nutritionPlanZod.safeParse({
    calories: generated.calories || fallback.calories,
    protein: generated.protein || fallback.protein,
    carbs: generated.carbs || fallback.carbs,
    fat: generated.fat || fallback.fat,
    guidance: generated.guidance || fallback.guidance,
    meals: generated.meals?.length ? generated.meals : fallback.meals,
  });
  return parsed.success ? parsed.data : fallback;
}

function buildNutritionPrompt(context: CompleteUserFitnessContext, skeleton: NutritionPlanPayload) {
  return `You are an elite performance nutrition coach refining a daily nutrition target for a real client.
Athlete context:
${context.promptContext}

Reference nutrition structure:
${JSON.stringify(skeleton)}

Rules:
- Respect the athlete's goal, body size, dietary preference, and training frequency.
- Keep the plan believable and sustainable.
- Guidance should sound like a premium coach, not a brochure.
- Return strict JSON only. No prose. No markdown. No code fences.
`;
}

export async function generateAdvancedWorkoutWeek(
  context: CompleteUserFitnessContext
): Promise<GenerationResult<WorkoutPlanPayload>> {
  const fallback = buildFallbackWorkoutPlan(context);
  const ai = await aiProvider.generateWorkout(buildWorkoutPrompt(context, fallback));

  if (!ai.ok) {
    return { suggestion: fallback, source: "fallback", error: ai.error };
  }

  const normalized = normalizeGeneratedWorkoutPlan(context, ai.data, fallback);
  const finalPlan = {
    ...normalized,
    summary: normalized.summary || generateWorkoutRationale(context, normalized),
  };

  return { suggestion: finalPlan, source: normalized === fallback ? "fallback" : "ai" };
}

export async function generateAdvancedNutritionGuidance(
  context: CompleteUserFitnessContext
): Promise<GenerationResult<NutritionPlanPayload>> {
  const fallback = buildFallbackNutritionPlan(context);
  const ai = await aiProvider.generateNutrition(buildNutritionPrompt(context, fallback));

  if (!ai.ok) {
    return { suggestion: fallback, source: "fallback", error: ai.error };
  }

  const normalized = normalizeGeneratedNutritionPlan(ai.data, fallback);
  return { suggestion: normalized, source: normalized === fallback ? "fallback" : "ai" };
}
