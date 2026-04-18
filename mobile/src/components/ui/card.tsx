import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/lib/theme";

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
