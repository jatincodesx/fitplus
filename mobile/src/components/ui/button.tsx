import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing } from "@/lib/theme";

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
}>) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.foreground} /> : null}
      <Text
        style={[
          styles.label,
          variant === "ghost" && styles.ghostLabel,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.24)",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "700",
  },
  ghostLabel: {
    color: colors.accent2,
  },
});
