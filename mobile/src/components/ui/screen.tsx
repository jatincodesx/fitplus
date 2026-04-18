import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/lib/theme";

export function Screen({
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
}>) {
  return (
    <LinearGradient
      colors={["#090A10", "#111526", "#05060A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>FitPlus</Text>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {action}
          </View>
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  headerCopy: {
    gap: 6,
  },
  eyebrow: {
    color: colors.accent2,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.foreground,
    fontSize: 30,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
});
