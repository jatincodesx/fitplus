import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";

export default function NutritionScreen() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState("Lunch");
  const [calories, setCalories] = useState("650");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const nutritionQuery = useQuery({
    queryKey: ["nutrition"],
    queryFn: () => mobileApi.getNutrition(token!),
    enabled: Boolean(token),
  });

  async function logMeal() {
    try {
      setSaving(true);
      await mobileApi.logMeal(token!, {
        date: new Date().toISOString(),
        mealType,
        calories: Number(calories),
        notes,
      });
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["nutrition"] });
    } finally {
      setSaving(false);
    }
  }

  const plan = nutritionQuery.data?.plan;

  return (
    <Screen
      title="Nutrition planner"
      subtitle={plan?.guidance ?? "Targets and quick meal logging stay connected to the current backend plan."}
    >
      <View style={styles.metrics}>
        <Card><Text style={styles.metric}>{plan?.calories ?? 0} kcal</Text><Text style={styles.copy}>Daily calories</Text></Card>
        <Card><Text style={styles.metric}>{plan?.protein ?? 0} g</Text><Text style={styles.copy}>Protein</Text></Card>
        <Card><Text style={styles.metric}>{plan?.carbs ?? 0} g</Text><Text style={styles.copy}>Carbs</Text></Card>
        <Card><Text style={styles.metric}>{plan?.fat ?? 0} g</Text><Text style={styles.copy}>Fat</Text></Card>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Log a meal</Text>
        <Input value={mealType} onChangeText={setMealType} placeholder="Meal type" />
        <Input value={calories} onChangeText={setCalories} placeholder="Calories" keyboardType="numeric" />
        <Input value={notes} onChangeText={setNotes} placeholder="Notes" />
        <Button onPress={() => void logMeal()} loading={saving}>Save meal</Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Suggested meals</Text>
        {plan?.sampleMeals.length ? (
          plan.sampleMeals.map((meal) => (
            <View key={meal.name} style={styles.entry}>
              <Text style={styles.entryTitle}>{meal.name}</Text>
              <Text style={styles.copy}>{meal.description}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.copy}>No meal suggestions are available yet.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent logs</Text>
        {nutritionQuery.data?.recentMeals.length ? (
          nutritionQuery.data.recentMeals.map((meal) => (
            <View key={meal.id} style={styles.entry}>
              <Text style={styles.entryTitle}>{meal.mealType}</Text>
              <Text style={styles.copy}>{meal.calories} kcal</Text>
            </View>
          ))
        ) : (
          <Text style={styles.copy}>No meals logged yet.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    gap: spacing.md,
  },
  metric: {
    color: colors.foreground,
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  entry: {
    gap: 4,
  },
  entryTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "700",
  },
});
