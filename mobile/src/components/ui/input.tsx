import type { ComponentProps } from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors, spacing } from "@/lib/theme";

export function Input(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.foreground,
    fontSize: 15,
  },
});
