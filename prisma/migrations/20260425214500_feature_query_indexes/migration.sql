CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

CREATE INDEX "WorkoutLog_userId_performedAt_idx" ON "WorkoutLog"("userId", "performedAt");

CREATE INDEX "NutritionPlan_userId_createdAt_idx" ON "NutritionPlan"("userId", "createdAt");

CREATE INDEX "MealLog_userId_date_idx" ON "MealLog"("userId", "date");

CREATE INDEX "WeightLog_userId_date_idx" ON "WeightLog"("userId", "date");

CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

CREATE INDEX "CoachCallSession_userId_createdAt_idx" ON "CoachCallSession"("userId", "createdAt");

CREATE INDEX "CoachCallTranscript_sessionId_timestamp_idx" ON "CoachCallTranscript"("sessionId", "timestamp");
