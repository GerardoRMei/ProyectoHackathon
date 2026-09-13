import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // apaga el título "index" centrado arriba --
                             // tu propio ChatHeader/WelcomeScreen ya cubre eso
      }}
    />
  );
}