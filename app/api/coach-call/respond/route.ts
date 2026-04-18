import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { aiProvider } from "@/lib/ai";
import { buildCoachContextForUser } from "@/lib/coach-context";
import { coachCallRespondSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, coachCallRespondSchema);

    const call = await prisma.coachCallSession.findFirst({
      where: { id: payload.sessionId, userId: sessionUser.id },
    });
    if (!call) {
      throw new ApiError(404, "Session not found.");
    }

    await prisma.coachCallTranscript.create({
      data: { sessionId: payload.sessionId, role: "USER", content: payload.message },
    });

    const history = await prisma.coachCallTranscript.findMany({
      where: { sessionId: payload.sessionId },
      orderBy: { timestamp: "asc" },
      take: 30,
    });

    const ctx = await buildCoachContextForUser(sessionUser.id);
    const historyText = history
      .map((item) => `${item.role === "USER" ? "User" : "Coach"}: ${item.content}`)
      .join("\n");

    const prompt = `You are Coach Aria running a guided intake call for a premium fitness app.
Known athlete context:
${ctx.context}

Missing or still-unclear fields:
${ctx.missing.join(", ") || "None critical."}

Conversation so far:
${historyText}

Rules:
- Ask only one smart follow-up at a time unless all essentials are covered.
- Prioritize missing items that materially improve plan quality: goal, experience, schedule, session duration, location, equipment, injuries, dislikes, cardio preference.
- Do not repeat questions the user has already answered.
- Keep replies under 2 sentences and sound like a real coach.
- If enough detail is already available, briefly summarize what you have and say you can build the plan next.
- Avoid generic filler and avoid medical claims.`;

    const ai = await aiProvider.coach(prompt);
    if (!ai.ok) {
      throw new ApiError(500, ai.error ?? "Coach is unavailable.");
    }

    await prisma.coachCallTranscript.create({
      data: { sessionId: payload.sessionId, role: "ASSISTANT", content: ai.data.reply },
    });

    if (call.status === "CONNECTING") {
      await prisma.coachCallSession.update({
        where: { id: payload.sessionId },
        data: { status: "ACTIVE" },
      });
    }

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "COACH_CALL_MESSAGE_COMPLETED",
      entityType: "CoachCallSession",
      entityId: payload.sessionId,
      metadata: {
        messageLength: payload.message.length,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ reply: ai.data.reply });
  } catch (error) {
    return handleApiError(error, "Could not send that coach message.");
  }
}
