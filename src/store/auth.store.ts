import { create } from 'zustand';
import { authService } from '@/src/services/auth.service';
import { configureApiService } from '@/src/services/api.service';
import { STORAGE_KEYS } from '@/src/constants/config';
import {
  saveSecure,
  getSecure,
  deleteSecure,
  saveJson,
  getJson,
  deleteStorage,
  getString,
  saveString,
} from '@/src/utils/storage';
import type { LoginPayload, RegisterPayload, User } from '@/src/types/api.types';

// ─── Interface du store ───────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // true une fois que loadStoredAuth() a été appelé

  // Actions
  login: (payload: LoginPayload) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

// ─── Store Zustand ────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => {
  // Configuration du service API (injection des getters de tokens)
  // Doit être fait ici pour éviter les imports circulaires
  configureApiService({
    getAccessToken: () => get().accessToken,
    getRefreshToken: () => get().refreshToken,
    onTokenRefreshed: (accessToken, refreshToken) => {
      get().setTokens(accessToken, refreshToken);
    },
    onAuthExpired: () => {
      // Session expirée → déconnexion forcée
      get().logout();
    },
  });

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isGuest: false,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,

    // ─── Charger l'auth persistée au démarrage de l'app ───────────────────
    loadStoredAuth: async () => {
      try {
        const [accessToken, refreshToken, user] = await Promise.all([
          getSecure(STORAGE_KEYS.ACCESS_TOKEN),
          getSecure(STORAGE_KEYS.REFRESH_TOKEN),
          getJson<User>(STORAGE_KEYS.USER_PROFILE),
        ]);

        if (accessToken && refreshToken && user) {
          set({
            accessToken,
            refreshToken,
            user,
            isGuest: user.isGuest,
            isAuthenticated: true,
            isInitialized: true,
          });
        } else {
          set({ isInitialized: true });
        }
      } catch {
        set({ isInitialized: true });
      }
    },

    // ─── Connexion classique ──────────────────────────────────────────────
    login: async (payload: LoginPayload) => {
      set({ isLoading: true });
      try {
        const response = await authService.login(payload);
        await _persistAuth(response.access_token, response.refresh_token, response.user);
        set({
          user: response.user,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          isGuest: false,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    // ─── Connexion invité ─────────────────────────────────────────────────
    loginAsGuest: async () => {
      set({ isLoading: true });
      try {
        const response = await authService.loginAsGuest();
        await _persistAuth(response.access_token, response.refresh_token, response.user);
        set({
          user: response.user,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          isGuest: true,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    // ─── Inscription ──────────────────────────────────────────────────────
    register: async (payload: RegisterPayload) => {
      set({ isLoading: true });
      try {
        const response = await authService.register(payload) as any;
        
        // Si le backend retourne des tokens, on connecte directement l'utilisateur
        if (response.access_token && response.refresh_token) {
          await _persistAuth(response.access_token, response.refresh_token, response.user);
          set({
            user: response.user,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            isGuest: false,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // Si pas de tokens (ex: attente de validation email), on ne l'authentifie pas encore
          set({ isLoading: false });
        }
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    // ─── Déconnexion ──────────────────────────────────────────────────────
    logout: async () => {
      try {
        await authService.logout();
      } catch {
        // On supprime les données locales même si l'appel échoue
      } finally {
        await _clearAuth();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isGuest: false,
          isAuthenticated: false,
        });
      }
    },

    // ─── Suppression compte (RGPD) ────────────────────────────────────────
    deleteAccount: async () => {
      await authService.deleteAccount();
      await _clearAuth();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isGuest: false,
        isAuthenticated: false,
      });
    },

    // ─── Helpers ──────────────────────────────────────────────────────────
    updateUser: (user: User) => {
      saveJson(STORAGE_KEYS.USER_PROFILE, user);
      set({ user });
    },

    setTokens: (accessToken: string, refreshToken: string) => {
      // Protection : SecureStore exige des strings non-vides
      if (!accessToken || !refreshToken) {
        console.warn('setTokens appelé avec des valeurs invalides, ignoré.', { accessToken: !!accessToken, refreshToken: !!refreshToken });
        return;
      }
      saveSecure(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      saveSecure(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      set({ accessToken, refreshToken });
    },
  };
});

// ─── Helpers privés ───────────────────────────────────────────────────────────

async function _persistAuth(
  accessToken: string,
  refreshToken: string,
  user: User
): Promise<void> {
  await Promise.all([
    saveSecure(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
    saveSecure(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    saveJson(STORAGE_KEYS.USER_PROFILE, user),
  ]);
}

async function _clearAuth(): Promise<void> {
  await Promise.all([
    deleteSecure(STORAGE_KEYS.ACCESS_TOKEN),
    deleteSecure(STORAGE_KEYS.REFRESH_TOKEN),
    deleteStorage(STORAGE_KEYS.USER_PROFILE),
  ]);
}
