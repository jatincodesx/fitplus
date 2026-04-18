import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { AuthProvider } from "@/lib/auth";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#05060A" },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
