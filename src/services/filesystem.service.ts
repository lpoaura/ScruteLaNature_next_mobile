// expo-file-system v19 a renommé l'API classique dans le sous-module /legacy
import * as FileSystem from 'expo-file-system/legacy';
import { EXPO_PUBLIC_API_IMAGES } from '@/src/constants/config';
import { calculateBoundingBox, lon2tile, lat2tile } from '@/src/utils/map';

// ─── Répertoires de base ──────────────────────────────────────────────────────

const BASE_DIR = FileSystem.documentDirectory ?? 'file:///';

/**
 * Retourne le chemin du dossier local d'un parcours téléchargé.
 * Structure : {documentDirectory}/parcours/{parcoursId}/
 */
export function getParcoursDir(parcoursId: string): string {
  return `${BASE_DIR}parcours/${parcoursId}/`;
}

/**
 * Retourne le chemin du dossier local des tuiles OSM d'un parcours.
 * Structure : {documentDirectory}/parcours/{parcoursId}/tiles/
 */
export function getParcoursTilesDir(parcoursId: string): string {
  return `${getParcoursDir(parcoursId)}tiles/`;
}

/**
 * Retourne le chemin du dossier local des observations photo.
 * Structure : {documentDirectory}/observations/
 */
export function getObservationsDir(): string {
  return `${BASE_DIR}observations/`;
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Crée un répertoire s'il n'existe pas encore (avec parents).
 */
export async function ensureDir(dirPath: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dirPath);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
}

/**
 * Résout une URL de média : si relative, la préfixe avec l'API_BASE_URL.
 */
export function resolveMediaUrl(url: string): string {
  // S'assurer que l'URL de base ne contient pas /api à la fin ni de slash final
  const baseImgUrl = EXPO_PUBLIC_API_IMAGES.replace(/\/api\/?$/, '').replace(/\/$/, '');

  // Remplace localhost par l'IP configurée dans API_BASE_URL (utile pour les tests sur téléphone)
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    const path = url.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, '');
    return `${baseImgUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${baseImgUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Extrait l'extension d'une URL de fichier (ignore les query params).
 */
function getExtension(url: string, fallback: string): string {
  const cleanUrl = url.split('?')[0];
  const lastSlashIndex = cleanUrl.lastIndexOf('/');
  const lastDotIndex = cleanUrl.lastIndexOf('.');
  if (lastDotIndex > lastSlashIndex) {
    return cleanUrl.substring(lastDotIndex + 1).toLowerCase();
  }
  return fallback;
}

// ─── Téléchargement de médias ─────────────────────────────────────────────────

/**
 * Télécharge un fichier média (image ou audio) dans le dossier local du parcours.
 *
 * - Si le fichier existe déjà localement → retourne son URI sans re-télécharger
 * - Sinon → télécharge depuis le backend et sauvegarde localement
 *
 * @param url        URL du fichier (relative ou absolue)
 * @param parcoursId Id du parcours (organisation en sous-dossiers)
 * @param filename   Nom du fichier local (ex: "image_jeu123.jpg")
 * @returns URI local du fichier
 */
export async function downloadMedia(
  url: string,
  parcoursId: string,
  filename: string
): Promise<string> {
  const dir = getParcoursDir(parcoursId);
  await ensureDir(dir);

  const localPath = `${dir}${filename}`;

  // Vérifier si déjà téléchargé → évite les re-téléchargements inutiles
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) return localPath;

  const resolvedUrl = resolveMediaUrl(url);
  const result = await FileSystem.downloadAsync(resolvedUrl, localPath);

  if (result.status !== 200) {
    throw new Error(`Échec téléchargement (${result.status}): ${resolvedUrl}`);
  }

  return result.uri;
}

/**
 * Télécharge l'image de couverture d'un parcours.
 * Retourne l'URI local ou null si pas de coverImage.
 */
export async function downloadCoverImage(
  coverImageUrl: string | undefined,
  parcoursId: string
): Promise<string | null> {
  if (!coverImageUrl) return null;
  const ext = getExtension(coverImageUrl, 'jpg');
  const filename = `cover.${ext}`;
  return downloadMedia(coverImageUrl, parcoursId, filename);
}

/**
 * Génère un nom de fichier local unique pour un jeu.
 */
export function getMediaFilename(
  jeuId: string,
  type: 'image' | 'audio',
  url: string
): string {
  const ext = getExtension(url, type === 'audio' ? 'mp3' : 'jpg');
  return `${type}_${jeuId}.${ext}`;
}

// ─── Gestion du stockage ──────────────────────────────────────────────────────

/**
 * Supprime tous les fichiers locaux d'un parcours (images, audios).
 * À appeler quand l'utilisateur supprime un parcours téléchargé.
 */
export async function deleteParcoursFiles(parcoursId: string): Promise<void> {
  const dir = getParcoursDir(parcoursId);
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}

/**
 * Calcule la taille totale des fichiers d'un parcours (en octets).
 */
export async function getParcoursFilesSize(parcoursId: string): Promise<number> {
  const dir = getParcoursDir(parcoursId);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return 0;

  const files = await FileSystem.readDirectoryAsync(dir);
  let totalSize = 0;

  for (const file of files) {
    const fileInfo = await FileSystem.getInfoAsync(`${dir}${file}`);
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size) {
      totalSize += fileInfo.size;
    }
  }

  return totalSize;
}

/**
 * Sauvegarde une photo d'observation dans le dossier local.
 * Retourne l'URI local du fichier.
 */
export async function saveObservationPhoto(
  sourceUri: string,
  syncId: string
): Promise<string> {
  const dir = getObservationsDir();
  await ensureDir(dir);
  const localPath = `${dir}${syncId}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: localPath });
  return localPath;
}

// ─── Téléchargement des tuiles de carte (OSM) ─────────────────────────────────

/**
 * Taille minimale en octets pour qu'un fichier soit considéré comme une vraie tuile.
 * Une tuile OSM valide fait au moins 200 octets ; en dessous c'est une erreur HTML.
 */
const MIN_TILE_SIZE_BYTES = 200;

/**
 * Serveurs de tuiles OSM (sous-domaines).
 * On les fait tourner pour ne pas taper toujours le même serveur.
 */
const OSM_SUBDOMAINS = ['a', 'b', 'c'];

/**
 * Télécharge une seule tuile OSM et valide qu'elle est bien une image PNG.
 * Retourne true si la tuile est prête (téléchargée ou déjà en cache), false en cas d'échec.
 */
async function downloadSingleTile(
  z: number,
  x: number,
  y: number,
  localPath: string
): Promise<boolean> {
  // Vérifier si la tuile existe déjà et est valide
  const existing = await FileSystem.getInfoAsync(localPath);
  if (existing.exists) {
    const size = 'size' in existing ? (existing.size ?? 0) : 0;
    if (size >= MIN_TILE_SIZE_BYTES) return true; // déjà en cache et valide
    // Corrompue → on la supprime et on re-télécharge
    await FileSystem.deleteAsync(localPath, { idempotent: true });
  }

  // Rotation des sous-domaines OSM pour équilibrer la charge
  const subdomain = OSM_SUBDOMAINS[(x + y + z) % OSM_SUBDOMAINS.length];
  const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const result = await FileSystem.downloadAsync(url, localPath, {
      headers: {
        // OSM exige un User-Agent identifiant correctement l'application
        'User-Agent': 'ScruteLaNature/1.0 (contact@lpo.fr)',
        'Accept':     'image/png, image/*;q=0.8',
      },
    });

    if (result.status !== 200) {
      // Réponse non-image (ex: 403, 429, 503) → supprimer le fichier téléchargé
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      console.warn(`[Tiles] HTTP ${result.status} pour ${z}/${x}/${y}`);
      return false;
    }

    // Vérifier la taille réelle du fichier téléchargé
    const info = await FileSystem.getInfoAsync(localPath);
    const size = info.exists && 'size' in info ? (info.size ?? 0) : 0;
    if (size < MIN_TILE_SIZE_BYTES) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      return false;
    }

    return true;
  } catch (err) {
    await FileSystem.deleteAsync(localPath, { idempotent: true });
    return false;
  }
}

/**
 * Résultat retourné par downloadMapTiles pour un reporting précis.
 */
export interface TileDownloadResult {
  total: number;
  downloaded: number;
  cached: number;
  failed: number;
}

/**
 * Télécharge et met en cache les tuiles OpenStreetMap couvrant le tracé GeoJSON
 * d'un parcours, pour les niveaux de zoom spécifiés.
 *
 * Chaque tuile est validée (statut HTTP 200 + taille minimale) avant d'être
 * conservée. Les tuiles corrompues ou les erreurs serveur n'encombrent pas le
 * stockage local.
 *
 * @param geojsonString  GeoJSON du tracé (LineString ou FeatureCollection)
 * @param parcoursId     ID du parcours (pour l'arborescence de stockage)
 * @param minZoom        Zoom minimal (défaut 14)
 * @param maxZoom        Zoom maximal (défaut 17)
 * @param onProgress     Callback [0..1] indiquant la progression
 */
export async function downloadMapTiles(
  geojsonString: string | null | undefined,
  parcoursId: string,
  minZoom = 12,
  maxZoom = 17,
  onProgress?: (progress: number) => void
): Promise<TileDownloadResult> {
  const result: TileDownloadResult = { total: 0, downloaded: 0, cached: 0, failed: 0 };
  if (!geojsonString) return result;

  // Ajout d'un padding de ~500m (0.005) pour avoir une marge autour du parcours
  const bbox = calculateBoundingBox(geojsonString, 0.005);
  if (!bbox) return result;

  const tilesDir = getParcoursTilesDir(parcoursId);
  await ensureDir(tilesDir);

  // ── 1. Construire la liste de toutes les tuiles à télécharger ──────────────
  type TileReq = { x: number; y: number; z: number };
  const tilesToDownload: TileReq[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = lon2tile(bbox.minLng, z);
    const maxX = lon2tile(bbox.maxLng, z);
    // Note : maxLat donne le minY car l'axe Y est inversé en projection Mercator
    const minY = lat2tile(bbox.maxLat, z);
    const maxY = lat2tile(bbox.minLat, z);

    for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
      for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
        tilesToDownload.push({ x, y, z });
      }
    }
  }

  result.total = tilesToDownload.length;
  if (result.total === 0) return result;

  // ── 2. Télécharger par lots de 4 avec pause entre chaque lot ──────────────
  // OSM impose une limite de ~2 req/s par IP. 4 en parallèle + 100ms de pause
  // = ~40 req/s max, ce qui est raisonnable et respecte leur politique.
  const BATCH_SIZE = 4;
  const BATCH_DELAY_MS = 100;
  let processed = 0;

  for (let i = 0; i < result.total; i += BATCH_SIZE) {
    const batch = tilesToDownload.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ({ x, y, z }) => {
        const localTileDir = `${tilesDir}${z}/${x}/`;
        const localPath = `${localTileDir}${y}.png`;
        await ensureDir(localTileDir);

        // Vérifier le cache avant de télécharger
        const existing = await FileSystem.getInfoAsync(localPath);
        if (existing.exists) {
          const size = 'size' in existing ? (existing.size ?? 0) : 0;
          if (size >= MIN_TILE_SIZE_BYTES) return 'cached';
          await FileSystem.deleteAsync(localPath, { idempotent: true });
        }

        const ok = await downloadSingleTile(z, x, y, localPath);
        return ok ? 'downloaded' : 'failed';
      })
    );

    // Comptabiliser les résultats
    for (const r of batchResults) {
      if (r === 'cached') result.cached++;
      else if (r === 'downloaded') result.downloaded++;
      else result.failed++;
    }

    processed += batch.length;
    onProgress?.(processed / result.total);

    // Respecter le rate-limit OSM entre chaque lot
    if (i + BATCH_SIZE < result.total) {
      await new Promise<void>((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(
    `[Tiles] Terminé : ${result.downloaded} DL / ${result.cached} cache / ${result.failed} échecs / ${result.total} total`
  );
  return result;
}

/**
 * Vérifie si les tuiles d'un parcours sont disponibles localement.
 * Utile pour décider si on peut jouer hors-ligne.
 */
export async function areTilesAvailable(parcoursId: string): Promise<boolean> {
  const tilesDir = getParcoursTilesDir(parcoursId);
  const info = await FileSystem.getInfoAsync(tilesDir);
  if (!info.exists) return false;

  // Vérifier qu'il y a au moins quelques fichiers dans le répertoire
  try {
    const items = await FileSystem.readDirectoryAsync(tilesDir);
    return items.length > 0;
  } catch {
    return false;
  }
}

