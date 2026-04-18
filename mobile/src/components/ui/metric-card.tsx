import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/card";
import { colors } from "@/lib/theme";

export function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <Card>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.subtext}>{subtext}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  value: {
    color: colors.foreground,
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  subtext: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
