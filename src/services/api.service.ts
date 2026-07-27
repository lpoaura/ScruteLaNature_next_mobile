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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const data = await response.json();

  // Le backend renvoie { access_token, refresh_token } en snake_case
  const newAccessToken: string | undefined = data.access_token;
  const newRefreshToken: string | undefined = data.refresh_token;

  if (!newAccessToken || !newRefreshToken) {
    throw new Error('Invalid refresh response: missing tokens');
  }

  _onTokenRefreshed?.(newAccessToken, newRefreshToken);
  return newAccessToken;
}

// ─── Fonction de requête principale ──────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Injection du token JWT si disponible
  let didSendAuthToken = false;
  if (!skipAuth) {
    const token = _getAccessToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      didSendAuthToken = true;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, { ...fetchOptions, headers });

  // Gestion du 401 → refresh automatique + retry
  if (response.status === 401 && !skipAuth && endpoint !== '/auth/logout') {
    // Si on n'a jamais envoyé de token (auth pas encore chargée depuis le stockage),
    // un 401 est NORMAL → on ne tente PAS de refresh et on ne déconnecte PERSONNE.
    if (!didSendAuthToken) {
      throw new Error('Authentification requise.');
    }

    // On a envoyé un token mais il a été rejeté → tentative de refresh
    const refreshToken = _getRefreshToken?.();
    if (!refreshToken) {
      _onAuthExpired?.();
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

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
      } catch (error: any) {
        _refreshQueue.forEach(({ reject }) => reject(error));
        _refreshQueue = [];
        
        // On déconnecte UNIQUEMENT si le serveur a rejeté le refresh (réponse 4xx).
        // Pas de déconnexion sur erreur réseau (TypeError: Network request failed) 
        // ni sur 500, pour ne pas éjecter l'utilisateur en mode hors-ligne.
        const msg = error instanceof Error ? error.message : '';
        const isNetworkError = error instanceof TypeError || msg.includes('Network request failed');
        
        if (isNetworkError) {
          // Erreur réseau → on ne déconnecte pas, on propage simplement l'erreur
          throw new Error('Réseau indisponible. Réessayez plus tard.');
        } else {
          // Le serveur a explicitement rejeté → déconnexion
          _onAuthExpired?.();
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
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
