// ─── Configuration globale de l'application ───────────────────────────────────

import Constants from 'expo-constants';

// URL de base de l'API backend NestJS
// Utilise la variable d'environnement EXPO_PUBLIC_API_URL si définie
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const EXPO_PUBLIC_API_IMAGES =
  process.env.EXPO_PUBLIC_API_IMAGES ?? 'http://localhost:3000';

// Scheme de l'application (utilisé pour les deep links)
// Deep link : scrutelanature://email-verified
export const APP_SCHEME = 'scrutelanature';

// ─── Jeu & Navigation ─────────────────────────────────────────────────────────

// Distance en mètres pour déclencher l'alerte GPS (vibration + bouton "Découvrir")
export const GPS_TRIGGER_RADIUS = 10;

// ─── Synchronisation hors-ligne ───────────────────────────────────────────────

// Nombre maximum de tentatives d'envoi avant abandon
export const MAX_SYNC_ATTEMPTS = 3;

// ─── Stockage local ───────────────────────────────────────────────────────────

// Clés de stockage SecureStore (tokens JWT)
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'lpo_access_token',
  REFRESH_TOKEN: 'lpo_refresh_token',
  USER_PROFILE: 'lpo_user_profile',
  ONBOARDING_DONE: 'lpo_onboarding_done',
} as const;

// ─── Parcours téléchargés ─────────────────────────────────────────────────────

// Dossier racine des médias téléchargés (dans expo-file-system)
export const OFFLINE_PARCOURS_DIR = 'parcours/';
export const OFFLINE_OBSERVATIONS_DIR = 'observations/';

// ─── Infos app ────────────────────────────────────────────────────────────────

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
