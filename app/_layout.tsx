import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { GluestackUIProvider } from '@/src/components/ui/gluestack-ui-provider';
import { useAuthStore } from '@/src/store/auth.store';
import { useEffect, useState } from 'react';
import { AppSplashScreen } from '@/src/components/features/splash/AppSplashScreen';

import '@/global.css';

// Masquer le splash natif immédiatement — on gère notre propre splash animé
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

// ─── Guard de navigation basé sur l'état d'auth ───────────────────────────────

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // Connecté mais sur une page auth → aller sur les tabs
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // Non connecté et pas sur une page auth → aller sur login
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isInitialized, segments]);

  return null;
}

// ─── Layout Root ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loadStoredAuth } = useAuthStore();
  const router = useRouter();

  // Contrôle de l'écran de démarrage custom
  const [showSplash, setShowSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Charger l'auth persistée au démarrage
  useEffect(() => {
    loadStoredAuth().then(() => {
      setAuthReady(true);
      // Masquer le splash natif d'Expo dès que l'auth est prête
      SplashScreen.hideAsync();
    });
  }, []);

  // Gérer le deep link email-verified (scrutelanature://email-verified)
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (url.includes('email-verified')) {
        router.replace('/(auth)/login?verified=true');
      }
    };

    // URL initiale (app fermée → ouverte via deep link)
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('email-verified')) {
        router.replace('/(auth)/login?verified=true');
      }
    });

    // URL pendant que l'app est ouverte
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  return (
    <GluestackUIProvider mode="light">
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGuard />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />

        {/* Écran de démarrage animé — affiché par-dessus tout */}
        {showSplash && (
          <AppSplashScreen onFinished={() => setShowSplash(false)} />
        )}
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
