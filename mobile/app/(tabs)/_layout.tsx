import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getPostAuthPath } from "@/lib/navigation";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const { isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const postAuthPath = getPostAuthPath(user);
  if (postAuthPath !== "/(tabs)") {
    return <Redirect href={postAuthPath} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0D111B",
          borderTopColor: "rgba(255,255,255,0.08)",
        },
        tabBarActiveTintColor: colors.accent2,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
