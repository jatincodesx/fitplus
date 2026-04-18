import type {
  MobileCoachFeedPayload,
  MobileDashboardPayload,
  MobileOnboardingInput,
  MobileNutritionPayload,
  MobileProfilePayload,
  MobileProgressPayload,
  MobileSessionPayload,
  MobileWorkoutDayPayload,
  MobileWorkoutPlanPayload,
} from "@fitplus/contracts";
import { getMobileApiUrl, MOBILE_API_BASE_URL } from "@/lib/api-config";

const REQUEST_TIMEOUT_MS = 12000;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const requestUrl = getMobileApiUrl(path);

  try {
    const response = await fetch(requestUrl, {
      method: options.method ?? "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: ({ error?: string } & T) | null = null;

    if (raw) {
      try {
        data = JSON.parse(raw) as { error?: string } & T;
      } catch {
        if (response.ok) {
          throw new Error(`The backend returned an invalid JSON response for ${requestUrl}.`);
        }
      }
    }

    if (!response.ok) {
      throw new Error(data?.error ?? `Request failed with status ${response.status} for ${requestUrl}.`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS}ms for ${requestUrl}. Confirm the backend is reachable at ${MOBILE_API_BASE_URL}.`
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the backend at ${requestUrl}. Current mobile API base URL: ${MOBILE_API_BASE_URL}.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const mobileApi = {
  apiBaseUrl: MOBILE_API_BASE_URL,
  signIn: (body: { email: string; password: string }) =>
    request<MobileSessionPayload>("/api/mobile/auth/sign-in", { method: "POST", body }),
  signUp: (body: { name: string; email: string; password: string }) =>
    request<MobileSessionPayload>("/api/mobile/auth/sign-up", { method: "POST", body }),
  getSession: (token: string) =>
    request<MobileSessionPayload | null>("/api/mobile/auth/session", { token }),
  signOut: (token: string) =>
    request<{ ok: true }>("/api/mobile/auth/sign-out", { method: "POST", token }),
  saveOnboarding: (token: string, body: MobileOnboardingInput) =>
    request<{ profile: MobileProfilePayload["profile"] }>("/api/onboarding", {
      method: "POST",
      token,
      body,
    }),
  getDashboard: (token: string) =>
    request<MobileDashboardPayload>("/api/mobile/dashboard", { token }),
  getWorkouts: (token: string) =>
    request<MobileWorkoutPlanPayload>("/api/mobile/workouts", { token }),
  getWorkoutDay: (token: string, dayId: string) =>
    request<MobileWorkoutDayPayload>(`/api/mobile/workouts/${dayId}`, { token }),
  startWorkoutSession: (token: string, workoutDayId: string, forceNew = false) =>
    request<{ workoutSession: MobileWorkoutDayPayload["latestSession"] }>(
      "/api/workout/session",
      { method: "POST", token, body: { workoutDayId, forceNew } }
    ),
  updateWorkoutSet: (token: string, sessionId: string, sessionExerciseId: string, completedSets: number) =>
    request<{ workoutSession: NonNullable<MobileWorkoutDayPayload["latestSession"]> }>(
      `/api/workout/session/${sessionId}`,
      { method: "PATCH", token, body: { sessionExerciseId, completedSets } }
    ),
  completeWorkout: (token: string, sessionId: string) =>
    request<{ workoutSession: NonNullable<MobileWorkoutDayPayload["latestSession"]> }>(
      `/api/workout/session/${sessionId}/complete`,
      { method: "POST", token }
    ),
  getNutrition: (token: string) =>
    request<MobileNutritionPayload>("/api/mobile/nutrition", { token }),
  logMeal: (
    token: string,
    body: {
      date: string;
      mealType: string;
      calories: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      notes?: string;
    }
  ) => request<{ log: { id: string } }>("/api/meal", { method: "POST", token, body }),
  getProgress: (token: string) =>
    request<MobileProgressPayload>("/api/mobile/progress", { token }),
  logWeight: (token: string, body: { date: string; weightKg: number }) =>
    request<{ log: { id: string } }>("/api/weight", { method: "POST", token, body }),
  getProfile: (token: string) =>
    request<MobileProfilePayload>("/api/mobile/profile", { token }),
  updateProfile: (token: string, body: { name: string }) =>
    request<{ user: { id: string; name: string } }>("/api/account/profile", {
      method: "PATCH",
      token,
      body,
    }),
  getCoachFeed: (token: string) =>
    request<MobileCoachFeedPayload>("/api/mobile/coach", { token }),
  sendCoachMessage: (token: string, message: string) =>
    request<{ reply: string; error: string | null }>("/api/ai/chat", {
      method: "POST",
      token,
      body: { message },
    }),
};
