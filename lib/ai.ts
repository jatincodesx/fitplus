import { z } from "zod";
import {
  CoachIntakePayload,
  NutritionPlanPayload,
  WorkoutPlanPayload,
  intakeZod,
  nutritionPlanZod,
  workoutPlanZod,
} from "./schemas/coach";

type AIProviderName = "ollama" | "openai" | "anthropic";

export type WorkoutPlanSuggestion = WorkoutPlanPayload;
export type NutritionSuggestion = NutritionPlanPayload;
export type CoachIntake = CoachIntakePayload;

export type CoachMessage = {
  reply: string;
  summary?: string;
};

export type AIResult<T> = { ok: true; data: T } | { ok: false; error: string };

const coachMessageSchema = z.object({
  reply: z.string().trim().min(1),
  summary: z.string().trim().min(1).optional(),
});

const extractJsonObject = (input: string): unknown => {
  try {
    return JSON.parse(input);
  } catch {
    const start = input.indexOf("{");
    const end = input.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      const slice = input.slice(start, end + 1);

      try {
        return JSON.parse(slice);
      } catch {
        const cleaned = slice.replace(/```json/gi, "").replace(/```/g, "");
        return JSON.parse(cleaned);
      }
    }

    throw new Error("No JSON object found");
  }
};

class OllamaProvider {
  baseUrl: string;
  model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3.2";
  }

  private async chat(prompt: string) {
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama responded ${res.status}`);
      }

      const data = await res.json();
      const content: string =
        data?.message?.content ??
        data?.message ??
        data?.response ??
        "I couldn't generate a response right now.";

      return { ok: true as const, content };
    } catch (error: unknown) {
      return { ok: false as const, error: (error as Error).message };
    }
  }

  private async structured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    parseError: string
  ): Promise<AIResult<T>> {
    const res = await this.chat(prompt);

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    try {
      const parsed = schema.parse(extractJsonObject(res.content));
      return { ok: true, data: parsed };
    } catch {
      return { ok: false, error: parseError };
    }
  }

  async generateWorkout(context: string): Promise<AIResult<WorkoutPlanSuggestion>> {
    return this.structured(
      `${context}
Return ONLY minified JSON matching this exact shape:
{"title":string,"split"?:string,"summary"?:string,"days":[{"name":string,"dayOfWeek"?:string,"focus"?:string,"rationale"?:string,"coachTip"?:string,"targetDurationMins"?:number,"exercises":[{"name":string,"muscleGroup":string,"sets":number,"reps":number,"restSeconds"?:number,"notes"?:string}]}]}`,
      workoutPlanZod,
      "Could not parse workout plan into the required structured schema."
    );
  }

  async generateNutrition(context: string): Promise<AIResult<NutritionSuggestion>> {
    return this.structured(
      `${context}
Return ONLY minified JSON matching this exact shape:
{"calories":number,"protein":number,"carbs":number,"fat":number,"guidance"?:string,"meals":[{"name":string,"description":string,"calories"?:number}]}`,
      nutritionPlanZod,
      "Could not parse nutrition guidance into the required structured schema."
    );
  }

  async coach(context: string): Promise<AIResult<CoachMessage>> {
    const res = await this.chat(context);

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    const structured = coachMessageSchema.safeParse(extractJsonObjectSafe(res.content));
    if (structured.success) {
      return { ok: true, data: structured.data };
    }

    return { ok: true, data: { reply: res.content.trim() } };
  }

  async analyzeIntake(transcript: string): Promise<AIResult<CoachIntake>> {
    return this.structured(
      `You are a premium fitness coach extracting structured intake data from a completed discovery chat.
Return ONLY minified JSON. Omit unknown fields. Do not invent medical details.
Schema:
{"goal"?:string,"weight"?:number,"height"?:number,"age"?:number,"experience"?:string,"injuries"?:string,"daysPerWeek"?:number,"sessionDuration"?:number,"location"?:string,"equipment"?:string,"style"?:string,"cardio"?:string,"dislikes"?:string,"energySchedule"?:string,"safetyNote"?:string,"summary"?:string}
Transcript:
"""${transcript}"""`,
      intakeZod,
      "Could not parse intake data from AI response."
    );
  }
}

function extractJsonObjectSafe(input: string) {
  try {
    return extractJsonObject(input);
  } catch {
    return null;
  }
}

class NullProvider {
  constructor(private name: string) {}

  async generateWorkout(_context?: string): Promise<AIResult<WorkoutPlanSuggestion>> {
    void _context;
    return { ok: false, error: `${this.name} provider not configured yet.` };
  }

  async generateNutrition(_context?: string): Promise<AIResult<NutritionSuggestion>> {
    void _context;
    return { ok: false, error: `${this.name} provider not configured yet.` };
  }

  async coach(_context?: string): Promise<AIResult<CoachMessage>> {
    void _context;
    return { ok: false, error: `${this.name} provider not configured yet.` };
  }

  async analyzeIntake(_transcript?: string): Promise<AIResult<CoachIntake>> {
    void _transcript;
    return { ok: false, error: `${this.name} provider not configured yet.` };
  }
}

function getProvider(): OllamaProvider | NullProvider {
  const provider = (process.env.AI_PROVIDER || "ollama") as AIProviderName;

  if (provider === "ollama") {
    return new OllamaProvider();
  }

  return new NullProvider(provider);
}

export const aiProvider = getProvider();
