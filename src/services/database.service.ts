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
 * Retourne l'instance SQLite (singleton).
 * Appeler `initDatabase()` avant tout usage.
 */
function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('Base de données non initialisée. Appelez initDatabase() d\'abord.');
  return _db;
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Ouvre la base de données et crée toutes les tables si elles n'existent pas.
 * À appeler une seule fois au démarrage de l'application (dans _layout.tsx).
 */
export async function initDatabase(): Promise<void> {
  _db = await SQLite.openDatabaseAsync('lpo_balades.db');

  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    -- ─── Parcours téléchargés ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS parcours (
      id                      TEXT PRIMARY KEY,
      title                   TEXT NOT NULL,
      description             TEXT,
      difficulty              TEXT,
      distanceKm              REAL,
      durationMin             INTEGER,
      coverImage              TEXT,
      pathGeoJSON             TEXT,
      mascotteNom             TEXT,
      mascotteImg             TEXT,
      isPMRFriendly           INTEGER NOT NULL DEFAULT 0,
      isChildFriendly         INTEGER NOT NULL DEFAULT 0,
      isMentalHandicapFriendly INTEGER NOT NULL DEFAULT 0,
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
  `);
}

// ─── Types internes SQLite ────────────────────────────────────────────────────
// SQLite stocke les booléens en INTEGER (0/1) et les objets en JSON TEXT

interface ParcoursSQLite {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  coverImage: string | null;
  pathGeoJSON: string | null;
  // mascotteNom/mascotteImg retirés du backend mais colonnes SQL gardées pour compatibilité
  isPMRFriendly: number;
  isChildFriendly: number;
  isMentalHandicapFriendly: number;
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
    distanceKm: row.distanceKm ?? undefined,
    durationMin: row.durationMin ?? undefined,
    coverImage: row.coverImage ?? undefined,
    pathGeoJSON: row.pathGeoJSON ?? undefined,
    isPMRFriendly: row.isPMRFriendly === 1,
    isChildFriendly: row.isChildFriendly === 1,
    isMentalHandicapFriendly: row.isMentalHandicapFriendly === 1,
    status: 'PUBLISHED',
    organismeId: '',
    createdAt: '',
    updatedAt: '',
    downloadedAt: row.downloadedAt,
    isCompleted: row.isCompleted === 1,
  };
}

function rowToEtape(row: EtapeSQLite): Etape {
  return {
    id: row.id,
    parcoursId: row.parcoursId,
    order: row.orderNum,
    lat: row.lat,
    lng: row.lng,
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
  const db = getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO parcours
      (id, title, description, difficulty, distanceKm, durationMin,
       coverImage, pathGeoJSON,
       isPMRFriendly, isChildFriendly, isMentalHandicapFriendly,
       downloadedAt, isCompleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      parcours.id,
      parcours.title,
      parcours.description ?? null,
      parcours.difficulty ?? null,
      parcours.distanceKm ?? null,
      parcours.durationMin ?? null,
      parcours.coverImage ?? null,
      parcours.pathGeoJSON ?? null,
      parcours.isPMRFriendly ? 1 : 0,
      parcours.isChildFriendly ? 1 : 0,
      parcours.isMentalHandicapFriendly ? 1 : 0,
      Date.now(),
    ]
  );
}

/**
 * Retourne tous les parcours téléchargés, du plus récent au plus ancien.
 */
export async function getAllParcours(): Promise<(Parcours & { downloadedAt: number; isCompleted: boolean })[]> {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  await db.runAsync(
    'UPDATE parcours SET isCompleted = 1 WHERE id = ?',
    [id]
  );
}

/**
 * Supprime un parcours et toutes ses étapes/jeux (CASCADE).
 */
export async function deleteParcours(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM parcours WHERE id = ?', [id]);
}

// ─── Opérations Étapes ────────────────────────────────────────────────────────

/**
 * Insère une étape dans SQLite.
 */
export async function insertEtape(etape: Etape): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO etapes
      (id, parcoursId, orderNum, lat, lng, title)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      etape.id,
      etape.parcoursId,
      etape.order,
      etape.lat,
      etape.lng,
      etape.title,
    ]
  );
}

/**
 * Retourne toutes les étapes d'un parcours, dans l'ordre.
 */
export async function getEtapesByParcours(parcoursId: string): Promise<Etape[]> {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  await db.runAsync('DELETE FROM offline_queue WHERE syncId = ?', [syncId]);
}

/**
 * Incrémente le compteur de tentatives d'un item (en cas d'échec réseau).
 */
export async function incrementQueueAttempts(syncId: string): Promise<void> {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();

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
