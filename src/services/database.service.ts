import * as SQLite from 'expo-sqlite';
import type {
  Parcours,
  Etape,
  Jeu,
  OfflineQueueItem,
  OfflineQueueType,
} from '@/src/types/api.types';

// ─── Instance de la base de données ───────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Retourne l'instance SQLite (singleton) de manière synchrone.
 * Usage interne uniquement — les fonctions publiques doivent passer par getDbSafe().
 */
function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('Base de données non initialisée. Appelez initDatabase() d\'abord.');
  return _db;
}

/**
 * Retourne l'instance SQLite en s'assurant que la DB est initialisée.
 * C'est la méthode sûre à utiliser partout dans ce fichier.
 */
async function getDbSafe(): Promise<SQLite.SQLiteDatabase> {
  await awaitDatabaseReady();
  return getDb();
}

// ─── Initialisation ───────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

/**
 * Attend que la base de données soit prête.
 * Si initDatabase() n'a pas encore été appelé, le fait automatiquement.
 */
export function awaitDatabaseReady(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = initDatabase();
  return _initPromise;
}

/**
 * Ouvre la base de données et crée toutes les tables si elles n'existent pas.
 * À appeler une seule fois au démarrage de l'application (dans _layout.tsx).
 */
export function initDatabase(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    _db = await SQLite.openDatabaseAsync('lpo_balades_v2.db');

  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- ─── Parcours téléchargés ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS parcours (
      id                      TEXT PRIMARY KEY,
      title                   TEXT NOT NULL,
      description             TEXT,
      difficulty              TEXT,
      accessibility           TEXT,
      distanceKm              REAL,
      durationMin             INTEGER,
      coverImage              TEXT,
      pathGeoJSON             TEXT,
      mascotteNom             TEXT,
      mascotteImg             TEXT,
      isPMRFriendly           INTEGER NOT NULL DEFAULT 0,
      isChildFriendly         INTEGER NOT NULL DEFAULT 0,
      isMentalHandicapFriendly INTEGER NOT NULL DEFAULT 0,
      isEscapeGame            INTEGER NOT NULL DEFAULT 0,
      timeLimitMinutes        INTEGER,
      updatedAt               TEXT,
      downloadedAt            INTEGER NOT NULL,
      isCompleted             INTEGER NOT NULL DEFAULT 0
    );

    -- ─── Étapes des parcours ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS etapes (
      id              TEXT PRIMARY KEY,
      parcoursId      TEXT NOT NULL,
      orderNum        INTEGER NOT NULL,
      lat             REAL NOT NULL,
      lng             REAL NOT NULL,
      title           TEXT NOT NULL,
      transitionText  TEXT,
      FOREIGN KEY (parcoursId) REFERENCES parcours(id) ON DELETE CASCADE
    );

    -- ─── Jeux des étapes ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS jeux (
      id              TEXT PRIMARY KEY,
      etapeId         TEXT NOT NULL,
      orderNum        INTEGER NOT NULL,
      type            TEXT NOT NULL,
      question        TEXT NOT NULL,
      explication     TEXT,
      audioLocalPath  TEXT,
      imageLocalPath  TEXT,
      donneesJeu      TEXT,
      reponse         TEXT,
      FOREIGN KEY (etapeId) REFERENCES etapes(id) ON DELETE CASCADE
    );

    -- ─── File d'attente hors-ligne (sync différée) ────────────────────────
    CREATE TABLE IF NOT EXISTS offline_queue (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      syncId      TEXT UNIQUE NOT NULL,
      type        TEXT NOT NULL,
      payload     TEXT NOT NULL,
      createdAt   INTEGER NOT NULL,
      attempts    INTEGER NOT NULL DEFAULT 0
    );

    -- ─── Anecdotes (Le saviez-vous) ───────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS anecdotes (
      id              TEXT PRIMARY KEY,
      content         TEXT NOT NULL,
      imageUrl        TEXT,
      isActive        INTEGER NOT NULL DEFAULT 1,
      createdAt       TEXT,
      updatedAt       TEXT
    );
  `);


  // Tentative de mise à jour du schéma pour les installations existantes (migration)
  try {
    await _db.execAsync(`ALTER TABLE parcours ADD COLUMN updatedAt TEXT;`);
  } catch (e) {
    // L'erreur est normale si la colonne existe déjà
  }
  
  try {
    await _db.execAsync(`ALTER TABLE parcours ADD COLUMN isEscapeGame INTEGER NOT NULL DEFAULT 0;`);
    await _db.execAsync(`ALTER TABLE parcours ADD COLUMN timeLimitMinutes INTEGER;`);
  } catch (e) {
    // L'erreur est normale si les colonnes existent déjà
  }
  
  try {
    await _db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_history (
        syncId      TEXT PRIMARY KEY,
        parcoursId  TEXT NOT NULL,
        score       INTEGER NOT NULL,
        completedAt TEXT NOT NULL,
        isSynced    INTEGER NOT NULL DEFAULT 0
      );
    `);
  } catch (e) {
    console.error("Migration error user_history:", e);
  }
  })();
  return _initPromise;
}

// ─── Types internes SQLite ────────────────────────────────────────────────────
// SQLite stocke les booléens en INTEGER (0/1) et les objets en JSON TEXT

interface ParcoursSQLite {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  accessibility: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  coverImage: string | null;
  pathGeoJSON: string | null;
  // mascotteNom/mascotteImg retirés du backend mais colonnes SQL gardées pour compatibilité
  isPMRFriendly: number;
  isChildFriendly: number;
  isMentalHandicapFriendly: number;
  isEscapeGame: number;
  isCoupDeCoeur: number | null;
  timeLimitMinutes: number | null;
  updatedAt: string | null;
  downloadedAt: number;
  isCompleted: number;
}

interface EtapeSQLite {
  id: string;
  parcoursId: string;
  orderNum: number;
  lat: number;
  lng: number;
  title: string;
  // transitionText retiré du backend mais colonne SQL gardée pour compatibilité
}

interface JeuSQLite {
  id: string;
  etapeId: string;
  orderNum: number;
  type: string;
  question: string;
  explication: string | null;
  audioLocalPath: string | null;
  imageLocalPath: string | null;
  donneesJeu: string | null;
  reponse: string | null;
}

interface OfflineQueueSQLite {
  id: number;
  syncId: string;
  type: string;
  payload: string;
  createdAt: number;
  attempts: number;
}

// ─── Conversions SQLite ↔ TypeScript ─────────────────────────────────────────

function rowToParcours(row: ParcoursSQLite): Parcours & { downloadedAt: number; isCompleted: boolean } {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    difficulty: row.difficulty as Parcours['difficulty'],
    accessibility: row.accessibility as Parcours['accessibility'],
    distanceKm: row.distanceKm ?? undefined,
    durationMin: row.durationMin ?? undefined,
    coverImage: row.coverImage ?? undefined,
    pathGeoJSON: row.pathGeoJSON ?? undefined,
    isPMRFriendly: row.isPMRFriendly === 1,
    isChildFriendly: row.isChildFriendly === 1,
    isMentalHandicapFriendly: row.isMentalHandicapFriendly === 1,
    isEscapeGame: row.isEscapeGame === 1,
    isCoupDeCoeur: row.isCoupDeCoeur === 1,
    timeLimitMinutes: row.timeLimitMinutes ?? undefined,
    status: 'PUBLISHED',
    organismeId: '',
    createdAt: '',
    updatedAt: row.updatedAt ?? '',
    downloadedAt: row.downloadedAt,
    isCompleted: row.isCompleted === 1,
  };
}

function rowToEtape(row: EtapeSQLite): Etape {
  return {
    id: row.id,
    parcoursId: row.parcoursId,
    order: row.orderNum,
    latitude: row.lat,
    longitude: row.lng,
    title: row.title,
    jeux: [],
  };
}

function rowToJeu(row: JeuSQLite): Jeu {
  return {
    id: row.id,
    etapeId: row.etapeId,
    order: row.orderNum,
    type: row.type as Jeu['type'],
    question: row.question,
    explication: row.explication ?? undefined,
    audioLocalPath: row.audioLocalPath ?? undefined,
    imageLocalPath: row.imageLocalPath ?? undefined,
    donneesJeu: row.donneesJeu ? JSON.parse(row.donneesJeu) : undefined,
    reponse: row.reponse ?? undefined,
  };
}

function rowToQueueItem(row: OfflineQueueSQLite): OfflineQueueItem {
  return {
    id: row.id,
    syncId: row.syncId,
    type: row.type as OfflineQueueType,
    payload: row.payload,
    createdAt: row.createdAt,
    attempts: row.attempts,
  };
}

// ─── Opérations Parcours ──────────────────────────────────────────────────────

/**
 * Insère un parcours téléchargé dans SQLite.
 * En cas de conflit sur l'id, remplace l'entrée existante (re-téléchargement).
 */
export async function insertParcours(parcours: Parcours): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    `INSERT OR REPLACE INTO parcours
      (id, title, description, difficulty, accessibility, distanceKm, durationMin,
       coverImage, pathGeoJSON,
       isPMRFriendly, isChildFriendly, isMentalHandicapFriendly, isEscapeGame, timeLimitMinutes,
       updatedAt, downloadedAt, isCompleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      parcours.id,
      parcours.title,
      parcours.description ?? null,
      parcours.difficulty ?? null,
      parcours.accessibility ?? null,
      parcours.distanceKm ?? null,
      parcours.durationMin ?? null,
      parcours.coverImage ?? null,
      parcours.pathGeoJSON ?? null,
      parcours.isPMRFriendly ? 1 : 0,
      parcours.isChildFriendly ? 1 : 0,
      parcours.isMentalHandicapFriendly ? 1 : 0,
      parcours.isEscapeGame ? 1 : 0,
      parcours.timeLimitMinutes ?? null,
      parcours.updatedAt,
      Date.now(),
    ]
  );
}

/**
 * Retourne tous les parcours téléchargés, du plus récent au plus ancien.
 */
export async function getAllParcours(): Promise<(Parcours & { downloadedAt: number; isCompleted: boolean })[]> {
  const db = await getDbSafe();
  const rows = await db.getAllAsync<ParcoursSQLite>(
    'SELECT * FROM parcours ORDER BY downloadedAt DESC'
  );
  return rows.map(rowToParcours);
}

/**
 * Retourne un parcours par son id. Null si non téléchargé.
 */
export async function getParcours(
  id: string
): Promise<(Parcours & { downloadedAt: number; isCompleted: boolean }) | null> {
  const db = await getDbSafe();
  const row = await db.getFirstAsync<ParcoursSQLite>(
    'SELECT * FROM parcours WHERE id = ?',
    [id]
  );
  return row ? rowToParcours(row) : null;
}

/**
 * Vérifie si un parcours est déjà téléchargé.
 */
export async function isParcoursDownloaded(id: string): Promise<boolean> {
  const result = await getParcours(id);
  return result !== null;
}

/**
 * Marque un parcours comme complété (après la synchronisation).
 */
export async function markParcoursCompleted(id: string): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    'UPDATE parcours SET isCompleted = 1 WHERE id = ?',
    [id]
  );
}

/**
 * Supprime un parcours et toutes ses étapes/jeux (CASCADE).
 */
export async function deleteParcours(id: string): Promise<void> {
  const db = await getDbSafe();
  // Suppression explicite en cascade pour garantir le nettoyage même si PRAGMA foreign_keys est ignoré par l'OS
  await db.runAsync('DELETE FROM jeux WHERE etapeId IN (SELECT id FROM etapes WHERE parcoursId = ?)', [id]);
  await db.runAsync('DELETE FROM etapes WHERE parcoursId = ?', [id]);
  await db.runAsync('DELETE FROM parcours WHERE id = ?', [id]);
}

// ─── Opérations Étapes ────────────────────────────────────────────────────────

/**
 * Insère une étape dans SQLite.
 */
export async function insertEtape(etape: Etape): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    `INSERT OR REPLACE INTO etapes
      (id, parcoursId, orderNum, lat, lng, title)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      etape.id,
      etape.parcoursId,
      etape.order,
      etape.latitude,
      etape.longitude,
      etape.title,
    ]
  );
}

/**
 * Retourne toutes les étapes d'un parcours, dans l'ordre.
 */
export async function getEtapesByParcours(parcoursId: string): Promise<Etape[]> {
  const db = await getDbSafe();
  const rows = await db.getAllAsync<EtapeSQLite>(
    'SELECT * FROM etapes WHERE parcoursId = ? ORDER BY orderNum ASC',
    [parcoursId]
  );
  return rows.map(rowToEtape);
}

// ─── Opérations Jeux ──────────────────────────────────────────────────────────

/**
 * Insère un jeu dans SQLite.
 * `donneesJeu` est sérialisé en JSON string.
 */
export async function insertJeu(jeu: Jeu): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    `INSERT OR REPLACE INTO jeux
      (id, etapeId, orderNum, type, question, explication,
       audioLocalPath, imageLocalPath, donneesJeu, reponse)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jeu.id,
      jeu.etapeId,
      jeu.order,
      jeu.type,
      jeu.question,
      jeu.explication ?? null,
      jeu.audioLocalPath ?? null,
      jeu.imageLocalPath ?? null,
      jeu.donneesJeu ? JSON.stringify(jeu.donneesJeu) : null,
      jeu.reponse ?? null,
    ]
  );
}

/**
 * Retourne tous les jeux d'une étape, dans l'ordre.
 */
export async function getJeuxByEtape(etapeId: string): Promise<Jeu[]> {
  const db = await getDbSafe();
  const rows = await db.getAllAsync<JeuSQLite>(
    'SELECT * FROM jeux WHERE etapeId = ? ORDER BY orderNum ASC',
    [etapeId]
  );
  return rows.map(rowToJeu);
}

/**
 * Met à jour les chemins locaux d'un jeu après téléchargement des médias.
 */
export async function updateJeuLocalPaths(
  jeuId: string,
  audioLocalPath?: string,
  imageLocalPath?: string
): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    `UPDATE jeux
     SET audioLocalPath = COALESCE(?, audioLocalPath),
         imageLocalPath = COALESCE(?, imageLocalPath)
     WHERE id = ?`,
    [audioLocalPath ?? null, imageLocalPath ?? null, jeuId]
  );
}

/**
 * Charge un parcours complet depuis SQLite (avec étapes et jeux).
 * Utilisé au démarrage d'une balade hors-ligne.
 */
export async function getParcoursComplet(parcoursId: string): Promise<{
  parcours: Parcours & { downloadedAt: number; isCompleted: boolean };
  etapes: (Etape & { jeux: Jeu[] })[];
} | null> {
  const parcours = await getParcours(parcoursId);
  if (!parcours) return null;

  const etapes = await getEtapesByParcours(parcoursId);

  const etapesAvecJeux = await Promise.all(
    etapes.map(async (etape) => {
      const jeux = await getJeuxByEtape(etape.id);
      return { ...etape, jeux };
    })
  );

  return { parcours, etapes: etapesAvecJeux };
}

// ─── Opérations File d'attente hors-ligne ─────────────────────────────────────

/**
 * Ajoute un item à la file d'attente de synchronisation.
 * Le `syncId` (UUID unique) garantit l'idempotence côté backend.
 */
export async function addToQueue(item: Omit<OfflineQueueItem, 'id' | 'attempts'>): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    `INSERT OR IGNORE INTO offline_queue (syncId, type, payload, createdAt, attempts)
     VALUES (?, ?, ?, ?, 0)`,
    [item.syncId, item.type, item.payload, item.createdAt]
  );
}

/**
 * Retourne tous les items en attente (non encore synchronisés).
 * Filtre les items ayant dépassé le maximum de tentatives.
 */
export async function getPendingQueue(maxAttempts = 3): Promise<OfflineQueueItem[]> {
  const db = await getDbSafe();
  const rows = await db.getAllAsync<OfflineQueueSQLite>(
    'SELECT * FROM offline_queue WHERE attempts < ? ORDER BY createdAt ASC',
    [maxAttempts]
  );
  return rows.map(rowToQueueItem);
}

/**
 * Supprime un item de la file d'attente après synchronisation réussie.
 */
export async function removeFromQueue(syncId: string): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync('DELETE FROM offline_queue WHERE syncId = ?', [syncId]);
}

/**
 * Incrémente le compteur de tentatives d'un item (en cas d'échec réseau).
 */
export async function incrementQueueAttempts(syncId: string): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    'UPDATE offline_queue SET attempts = attempts + 1 WHERE syncId = ?',
    [syncId]
  );
}

/**
 * Retourne le nombre d'items en attente dans la file.
 * Utile pour afficher un badge de synchronisation.
 */
export async function getQueueCount(): Promise<number> {
  const db = await getDbSafe();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_queue WHERE attempts < 3'
  );
  return row?.count ?? 0;
}

// ─── Statistiques de stockage ─────────────────────────────────────────────────

/**
 * Retourne les statistiques de stockage local.
 * Utilisé dans les paramètres (écran "Gérer mes données").
 */
export async function getStorageStats(): Promise<{
  totalParcours: number;
  totalEtapes: number;
  totalJeux: number;
  pendingSync: number;
}> {
  const db = await getDbSafe();

  const [parcoursRow, etapesRow, jeuxRow, queueRow] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM parcours'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM etapes'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM jeux'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM offline_queue WHERE attempts < 3'),
  ]);

  return {
    totalParcours: parcoursRow?.count ?? 0,
    totalEtapes: etapesRow?.count ?? 0,
    totalJeux: jeuxRow?.count ?? 0,
    pendingSync: queueRow?.count ?? 0,
  };
}

export async function clearOfflineQueue(): Promise<void> {
  const db = await getDbSafe();
  await db.execAsync('DELETE FROM offline_queue');
}

// ─── Historique Utilisateur ──────────────────────────────────────────────────

export interface UserHistorySQLite {
  syncId: string;
  parcoursId: string;
  score: number;
  completedAt: string;
  isSynced: number;
}

export async function saveParcoursHistoryLocal(history: Omit<UserHistorySQLite, 'isSynced'>): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_history (syncId, parcoursId, score, completedAt, isSynced)
     VALUES (?, ?, ?, ?, ?)`,
    [history.syncId, history.parcoursId, history.score, history.completedAt, 0]
  );
}

export async function getLocalHistory(): Promise<any[]> {
  const db = await getDbSafe();
  const rows = await db.getAllAsync<any>(`
    SELECT 
      uh.syncId, 
      uh.parcoursId, 
      uh.score, 
      uh.completedAt, 
      uh.isSynced,
      p.title as parcoursTitle,
      p.coverImage as parcoursCoverImage
    FROM user_history uh
    LEFT JOIN parcours p ON uh.parcoursId = p.id
    ORDER BY uh.completedAt DESC
  `);

  return rows.map(row => ({
    syncId: row.syncId,
    parcoursId: row.parcoursId,
    score: row.score,
    completedAt: row.completedAt,
    isSynced: row.isSynced,
    parcours: row.parcoursTitle ? {
      title: row.parcoursTitle,
      coverImage: row.parcoursCoverImage,
    } : undefined
  }));
}

export async function getUnsyncedHistory(): Promise<UserHistorySQLite[]> {
  const db = await getDbSafe();
  return db.getAllAsync<UserHistorySQLite>('SELECT * FROM user_history WHERE isSynced = 0');
}

export async function markHistorySyncedLocal(syncId: string): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync('UPDATE user_history SET isSynced = 1 WHERE syncId = ?', [syncId]);
}

export async function deleteLocalHistory(syncId: string): Promise<void> {
  const db = await getDbSafe();
  await db.runAsync('DELETE FROM user_history WHERE syncId = ?', [syncId]);
}

// ─── Anecdotes (Le saviez-vous) ───────────────────────────────────────────────

export interface AnecdoteSQLite {
  id: string;
  content: string;
  imageUrl: string | null;
  isActive: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function clearAndSaveAnecdotesLocal(anecdotes: AnecdoteSQLite[]): Promise<void> {
  const db = await getDbSafe();
  await db.execAsync('DELETE FROM anecdotes'); // Replace all
  for (const a of anecdotes) {
    await db.runAsync(
      `INSERT INTO anecdotes (id, content, imageUrl, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [a.id, a.content, a.imageUrl, a.isActive, a.createdAt, a.updatedAt]
    );
  }
}

export async function getRandomAnecdoteLocal(): Promise<AnecdoteSQLite | null> {
  const db = await getDbSafe();
  const result = await db.getFirstAsync<AnecdoteSQLite>('SELECT * FROM anecdotes WHERE isActive = 1 ORDER BY RANDOM() LIMIT 1');
  return result || null;
}
