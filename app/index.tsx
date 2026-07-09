import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import { getString } from '@/src/utils/storage';
import { STORAGE_KEYS } from '@/src/constants/config';
import { useEffect, useState } from 'react';

/**
 * Point d'entrée de l'application.
 *
 * Logique de redirection :
 * 1. Si l'utilisateur a un token valide → aller sur les tabs
 * 2. Si c'est la première ouverture (pas d'onboarding vu) → aller sur l'onboarding
 * 3. Sinon → aller sur le login
 */
export default function Index() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    getString(STORAGE_KEYS.ONBOARDING_DONE).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // En attente des données → ne rien rendre (le SplashScreen est encore visible)
  if (!isInitialized || onboardingDone === null) return null;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  if (!onboardingDone) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(auth)/login" />;
}
