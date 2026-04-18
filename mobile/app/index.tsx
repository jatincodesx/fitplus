import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { getPostAuthPath } from "@/lib/navigation";
import { colors } from "@/lib/theme";

export default function IndexScreen() {
  const { isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent2} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href={getPostAuthPath(user)} />;
}
