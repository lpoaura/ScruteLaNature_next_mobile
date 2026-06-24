// ─── Types API — reflète le schéma Prisma réel ────────────────────────────────
// ⚠️ Dans ce projet : Agence → Organisme, Commune → Zonage

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN';

export type Difficulty = 'FACILE' | 'MOYEN' | 'DIFFICILE';

export type PublishStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export type JeuType =
  | 'INFO'
  | 'QCM'
  | 'CHARADE'
  | 'CODE_CAESAR'
  | 'CALCUL_PYRAMIDAL'
  | 'VALIDATION_LIEU'
  | 'ECO_GESTE'
  | 'PUZZLE';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

// ─── Entités ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email?: string;
  pseudo?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isGuest: boolean;
  isEmailVerified: boolean;
  analyticsConsent: boolean;
  pushToken?: string;
  level: number;
  totalPoints: number;
  co2Saved: number;
  organismeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organisme {
  id: string;
  nom: string;
  createdAt: string;
  updatedAt: string;
}

export interface Zonage {
  id: string;
  nom: string;
  code?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Parcours {
  id: string;
  title: string;
  description?: string;
  difficulty?: Difficulty;
  accessibility?: Difficulty;
  distanceKm?: number;
  durationMin?: number;
  coverImage?: string;
  status: PublishStatus;
  pathGeoJSON?: string;
  // ⚠️ mascotteNom et mascotteImg supprimés du backend (décision Béa — Sprint 1)
  isPMRFriendly: boolean;
  isChildFriendly: boolean;
  isMentalHandicapFriendly: boolean;
  organismeId: string;
  zonageId?: string;
  zonage?: Zonage;
  badgeId?: string;
  badge?: Badge;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Etape {
  id: string;
  parcoursId: string;
  order: number;
  latitude: number;
  longitude: number;
  title: string;
  // ⚠️ description et transitionText supprimés du backend (décision Béa — Sprint 1)
  jeux: Jeu[];
}

export interface Jeu {
  id: string;
  etapeId: string;
  order: number;
  type: JeuType;
  question: string;
  explication?: string;
  audioUrl?: string;
  imageUrl?: string;
  donneesJeu?: Record<string, unknown>;
  reponse?: string;
  // Paths locaux après téléchargement
  audioLocalPath?: string;
  imageLocalPath?: string;
}

// Données spécifiques par type de jeu
export interface DonneesQCM {
  options: string[];
}

export interface DonneesCaesar {
  phraseChiffree: string;
  decalage: number;
}

export interface DonneesCalcPyramidal {
  grille: (number | null)[][];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  badge: Badge;
  earnedAt: string;
}

export interface Friendship {
  id: string;
  status: FriendshipStatus;
  requesterId: string;
  receiverId: string;
  requester?: Pick<User, 'id' | 'pseudo'>;
  receiver?: Pick<User, 'id' | 'pseudo'>;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  userId: string;
  parcoursId: string;
  user?: Pick<User, 'id' | 'pseudo'>;
  createdAt: string;
}

// ─── Payload download hors-ligne ──────────────────────────────────────────────

export interface ParcoursDownload extends Parcours {
  etapes: Etape[];
}

// ─── File d'attente hors-ligne ────────────────────────────────────────────────

export type OfflineQueueType = 'parcours_completed' | 'observation';

export interface OfflineQueueItem {
  id?: number;
  syncId: string;
  type: OfflineQueueType;
  payload: string; // JSON sérialisé
  createdAt: number; // timestamp ms
  attempts: number;
}

// ─── Payloads API (Requêtes) ──────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  pseudo: string;
  rgpdAccepted: boolean; // Obligatoire — loi RGPD
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password?: string;
}

export interface UpdateProfilePayload {
  pseudo?: string;
  firstName?: string;
  lastName?: string;
  pushToken?: string;
  analyticsConsent?: boolean;
}

export interface ReviewPayload {
  parcoursId: string;
  rating: number;
  comment?: string;
}

export interface SyncParcoursCompleted {
  parcoursId: string;
  score: number;
  syncId: string;
}

export interface SyncObservation {
  espece?: string;
  imageUrl: string;
  lat: number;
  lng: number;
  syncId: string;
}

export interface SyncPayload {
  parcoursCompleted?: SyncParcoursCompleted[];
  observations?: SyncObservation[];
}

// ─── Réponses API ─────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  requires_2fa?: boolean;
}


export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ─── Recherche mobile ─────────────────────────────────────────────────────────

export interface SearchParcoursParams {
  zonageId?: string;
  difficulty?: Difficulty;
  isPMRFriendly?: boolean;
  isChildFriendly?: boolean;
  isMentalHandicapFriendly?: boolean;
}

export interface NearbyParcoursParams {
  lat: number;
  lng: number;
  radius?: number; // en mètres, défaut 10000
}
