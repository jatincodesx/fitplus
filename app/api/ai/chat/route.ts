import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { aiProvider } from "@/lib/ai";
import { buildCompleteUserFitnessContext } from "@/lib/coach-context";
import { aiCoachMessageSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, aiCoachMessageSchema);
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    const context = await buildCompleteUserFitnessContext(user.id);
    const history = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    await prisma.chatMessage.create({
      data: { userId: user.id, role: "USER", content: payload.message },
    });

    const historyText = [...history]
      .reverse()
      .map((entry) => `${entry.role === "ASSISTANT" ? "Coach" : "User"}: ${entry.content}`)
      .join("\n");

    const prompt = `You are Coach Aria, a premium strength and nutrition coach.
Use the full athlete context below before answering.

${context.promptContext}

Recent coach-chat history:
${historyText || "No prior coach chat history."}

Rules:
- Sound credible, supportive, and concise.
- Prefer practical coaching adjustments over generic motivation.
- Tie advice back to the athlete's goal, recent progress, and current plan when relevant.
- Keep the reply to 2 short paragraphs or less unless the user asks for more depth.
- Avoid medical claims. If pain or injury is mentioned, recommend pain-free substitutions and professional care when needed.

User message: ${payload.message}`;

    const ai = await aiProvider.coach(prompt);
    const reply = ai.ok
      ? ai.data.reply
      : "Coach is offline right now. Try again once the local AI service is available.";

    await prisma.chatMessage.create({
      data: { userId: user.id, role: "ASSISTANT", content: reply },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "AI_COACH_CHAT_COMPLETED",
      entityType: "ChatMessage",
      entityId: user.id,
      metadata: {
        usedFallback: !ai.ok,
        messageLength: payload.message.length,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ reply, error: ai.ok ? null : ai.error });
  } catch (error) {
    return handleApiError(error, "Could not send the coach message.");
  }
}
