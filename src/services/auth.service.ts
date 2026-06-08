import { apiService } from './api.service';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '@/src/types/api.types';

// ─── Service d'authentification ───────────────────────────────────────────────
// Toutes les routes d'authentification du backend NestJS

export const authService = {
  /**
   * Connexion classique email + mot de passe.
   * → POST /auth/login
   */
  login: (payload: LoginPayload): Promise<AuthResponse> =>
    apiService.post<AuthResponse>('/auth/login', payload, { skipAuth: true }),

  /**
   * Création d'un compte joueur mobile (email + mot de passe).
   * → POST /auth/register
   */
  register: (payload: RegisterPayload): Promise<AuthResponse> =>
    apiService.post<AuthResponse>('/auth/register', payload, { skipAuth: true }),

  /**
   * Connexion silencieuse en mode Invité (sans email ni mot de passe).
   * Permet de jouer immédiatement sans inscription.
   * → POST /auth/guest
   */
  loginAsGuest: (): Promise<AuthResponse> =>
    apiService.post<AuthResponse>('/auth/guest', undefined, { skipAuth: true }),

  /**
   * Déconnexion — invalide le token côté backend.
   * → POST /auth/logout
   */
  logout: (): Promise<void> =>
    apiService.post<void>('/auth/logout'),

  /**
   * Récupère le profil de l'utilisateur connecté.
   * → GET /users/me
   */
  getProfile: (): Promise<User> =>
    apiService.get<User>('/users/me'),

  /**
   * Met à jour le profil (pseudo, pushToken, consentement analytics…).
   * → PATCH /users/me
   */
  updateProfile: (payload: UpdateProfilePayload): Promise<User> =>
    apiService.patch<User>('/users/me', payload),

  /**
   * Suppression RGPD du compte — cascade complète en base de données.
   * → DELETE /users/me
   */
  deleteAccount: (): Promise<void> =>
    apiService.delete<void>('/users/me'),

  /**
   * Demande d'envoi d'email pour réinitialiser le mot de passe.
   * → POST /auth/forgot-password
   */
  forgotPassword: (payload: ForgotPasswordPayload): Promise<void> =>
    apiService.post<void>('/auth/forgot-password', payload, { skipAuth: true }),

  /**
   * Change le mot de passe (nécessite l'ancien mot de passe).
   * → POST /users/me/change-password
   */
  changePassword: (oldPassword: string, newPassword: string): Promise<void> =>
    apiService.post<void>('/users/me/change-password', { oldPassword, newPassword }),
};
