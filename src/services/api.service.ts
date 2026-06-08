import { API_BASE_URL } from '@/src/constants/config';
import { ApiError } from '@/src/types/api.types';

// ─── Types internes ───────────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

// ─── Référence au store auth (injection pour éviter les imports circulaires) ──

let _getAccessToken: (() => string | null) | null = null;
let _getRefreshToken: (() => string | null) | null = null;
let _onTokenRefreshed: ((accessToken: string, refreshToken: string) => void) | null = null;
let _onAuthExpired: (() => void) | null = null;

export function configureApiService(config: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokenRefreshed: (accessToken: string, refreshToken: string) => void;
  onAuthExpired: () => void;
}): void {
  _getAccessToken = config.getAccessToken;
  _getRefreshToken = config.getRefreshToken;
  _onTokenRefreshed = config.onTokenRefreshed;
  _onAuthExpired = config.onAuthExpired;
}

// ─── Refresh en cours (évite les appels multiples simultanés) ────────────────

let _isRefreshing = false;
let _refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

async function refreshAccessToken(): Promise<string> {
  const refreshToken = _getRefreshToken?.();
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const data = await response.json();
  _onTokenRefreshed?.(data.accessToken, data.refreshToken);
  return data.accessToken;
}

// ─── Fonction de requête principale ──────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Injection du token JWT si disponible
  if (!skipAuth) {
    const token = _getAccessToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, { ...fetchOptions, headers });

  // Gestion du 401 → refresh automatique + retry
  if (response.status === 401 && !skipAuth) {
    if (_isRefreshing) {
      // Mettre en file d'attente si un refresh est déjà en cours
      const newToken = await new Promise<string>((resolve, reject) => {
        _refreshQueue.push({ resolve, reject });
      });
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers });
    } else {
      _isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        _refreshQueue.forEach(({ resolve }) => resolve(newToken));
        _refreshQueue = [];
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...fetchOptions, headers });
      } catch (error) {
        _refreshQueue.forEach(({ reject }) => reject(error));
        _refreshQueue = [];
        _onAuthExpired?.();
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      } finally {
        _isRefreshing = false;
      }
    }
  }

  // Gestion des erreurs HTTP
  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { statusCode: response.status, message: response.statusText };
    }
    const message = Array.isArray(errorData.message)
      ? errorData.message[0]
      : errorData.message;
    throw new Error(message || `Erreur ${response.status}`);
  }

  // Réponse vide (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─── Méthodes publiques ───────────────────────────────────────────────────────

export const apiService = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};
