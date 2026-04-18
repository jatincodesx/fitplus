import { StyleSheet, Text } from "react-native";
import { Card } from "@/components/ui/card";
import { colors } from "@/lib/theme";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.foreground,
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
});
