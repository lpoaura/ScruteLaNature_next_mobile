import { Stack } from 'expo-router';

/**
 * Layout du groupe d'authentification.
 * Toutes les routes dans app/(auth)/ sont accessibles sans être connecté.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
