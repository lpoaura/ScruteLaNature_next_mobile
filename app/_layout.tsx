import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { GluestackUIProvider } from '@/src/components/ui/gluestack-ui-provider';
import { useAuthStore } from '@/src/store/auth.store';
import { useSettingsStore } from '@/src/store/settings.store';
import { useEffect, useState } from 'react';
import { AppSplashScreen } from '@/src/components/features/splash/AppSplashScreen';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { authService } from '@/src/services/auth.service';

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isGuest = useAuthStore((state) => state.isGuest);

  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Ne rien faire tant que l'auth n'est pas initialisée OU que la navigation n'est pas prête
    if (!isInitialized || !rootNavigationState?.key) return;

    // Utilisation de setTimeout pour s'assurer que le rendu actuel est terminé
    const timeout = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';

      if (isAuthenticated && inAuthGroup) {
        // Connecté (vrai compte ou invité) mais sur une page auth
        if (isGuest) {
          // L'invité a le droit d'aller sur toutes les pages d'auth (login, register) pour se convertir
          return;
        }
        // Sinon, on redirige vers les tabs (un user normal n'a rien à faire sur login/register)
        router.replace('/(tabs)');
      } else if (!isAuthenticated && !inAuthGroup) {
        // Non connecté et pas sur une page auth → aller sur login
        router.replace('/(auth)/login');
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isInitialized, isGuest, segments, rootNavigationState?.key]);

  return null;
}

// ─── Layout Root ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state) => state.theme);
  const colorScheme = settingsTheme === 'system' ? systemColorScheme : settingsTheme;
  const loadStoredAuth = useAuthStore((state) => state.loadStoredAuth);
  const router = useRouter();

  // Contrôle de l'écran de démarrage custom
  const [showSplash, setShowSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const { expoPushToken } = usePushNotifications();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Synchronisation du Push Token avec le backend
  useEffect(() => {
    if (isAuthenticated && expoPushToken) {
      authService.updateProfile({ pushToken: expoPushToken })
        .catch(err => console.log('Impossible de synchroniser le pushToken:', err));
    }
  }, [isAuthenticated, expoPushToken]);

  // Charger l'auth persistée et la base de données au démarrage
  useEffect(() => {
    async function initApp() {
      try {
        const { initDatabase } = await import('@/src/services/database.service');
        const { initSyncListener } = await import('@/src/services/sync.service');
        await initDatabase();
        initSyncListener();

        try {
          const { LogManager } = await import('@maplibre/maplibre-react-native');
          // Suppress MapLibre network errors when offline
          LogManager.onLog(log => {
            const { message } = log;
            if (
              message.includes('Unable to resolve host') || 
              message.includes('Failed to load tile') ||
              message.includes('The Internet connection appears to be offline')
            ) {
              return true; // true = handled (do not print to console)
            }
            return false;
          });
        } catch (mapErr) {
          console.warn('MapLibre LogManager non supporté ou introuvable', mapErr);
        }
      } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err);
      }
      await loadStoredAuth();
      setAuthReady(true);
      // Masquer le splash natif d'Expo dès que l'app est prête
      SplashScreen.hideAsync();
    }
    initApp();
  }, []);

  // Gérer les deep links (email-verified, reset-password)
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (url.includes('email-verified')) {
        router.replace('/(auth)/login?verified=true');
      } else if (url.includes('reset-password')) {
        const token = url.split('token=')[1];
        if (token) {
          router.replace(`/(auth)/reset-password?token=${token}`);
        }
      }
    };

    // URL initiale (app fermée → ouverte via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    // URL pendant que l'app est ouverte
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGuard />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen
              name="parcours/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="parcours/jeu/[id]"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

          {/* Écran de démarrage animé — affiché par-dessus tout */}
          {showSplash && (
            <AppSplashScreen onFinished={() => setShowSplash(false)} />
          )}
        </ThemeProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
