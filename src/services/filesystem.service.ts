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
 * Retourne le chemin du fichier MBTiles d'un parcours.
 * Format : {documentDirectory}/parcours/{parcoursId}/tiles.mbtiles
 * Ce fichier est une base SQLite contenant toutes les tuiles OSM.
 */
export function getParcoursMbtilesPath(parcoursId: string): string {
  return `${getParcoursDir(parcoursId)}tiles.mbtiles`;
}

/**
 * @deprecated Utiliser getParcoursMbtilesPath à la place.
 * Conservé temporairement pour compatibilité.
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
 * Retourne l'URI local de l'image de couverture si elle a été téléchargée
 */
export function getLocalCoverImage(
  parcoursId: string,
  coverImageUrl: string | undefined
): string | null {
  if (!coverImageUrl) return null;
  const ext = getExtension(coverImageUrl, 'jpg');
  return `${getParcoursDir(parcoursId)}cover.${ext}`;
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

// ─── Téléchargement des tuiles de carte (OSM) → format MBTiles ───────────────
//
// Les tuiles sont stockées dans une base SQLite au format MBTiles standard.
// Ce format est nativement supporté par MapLibre via le protocole mbtiles://
// Structure SQLite :
//   table tiles(zoom_level INT, tile_column INT, tile_row INT, tile_data BLOB)
// Note: MBTiles utilise l'axe Y inversé (TMS) par rapport à OSM (XYZ).
//       tile_row = (2^zoom - 1) - y_osm

/**
 * Taille minimale en octets pour qu'une tuile soit valide (pas une page d'erreur HTML).
 */
const MIN_TILE_SIZE_BYTES = 200;

/**
 * Sous-domaines OSM pour équilibrer la charge réseau.
 */
const OSM_SUBDOMAINS = ['a', 'b', 'c'];

/**
 * Résultat retourné par downloadMapTiles.
 */
export interface TileDownloadResult {
  total: number;
  downloaded: number;
  cached: number;
  failed: number;
}

/**
 * Initialise la structure MBTiles dans la base SQLite.
 * Crée les tables tiles et metadata si elles n'existent pas.
 */

/**
 * Télécharge et stocke les tuiles OSM dans un fichier MBTiles (SQLite)
 * couvrant le tracé GeoJSON d'un parcours.
 *
 * MapLibre peut lire ce fichier directement via `mbtiles://chemin/vers/tiles.mbtiles`.
 *
 * @param geojsonString  GeoJSON du tracé (LineString ou FeatureCollection)
 * @param parcoursId     ID du parcours
 * @param minZoom        Zoom minimal (défaut 12)
 * @param maxZoom        Zoom maximal (défaut 17)
 * @param onProgress     Callback [0..1] de progression
 */
export async function downloadMapTiles(
  geojsonString: string | null | undefined,
  parcoursId: string,
  minZoom = 12,
  maxZoom = 17,
  extraCoords: { lat: number, lng: number }[] = [],
  onProgress?: (progress: number) => void
): Promise<TileDownloadResult> {
  const result: TileDownloadResult = { total: 0, downloaded: 0, cached: 0, failed: 0 };
  if (!geojsonString) return result;

  const bbox = calculateBoundingBox(geojsonString, 0.005, extraCoords);
  if (!bbox) return result;

  const tilesDir = getParcoursTilesDir(parcoursId);
  await ensureDir(tilesDir);

  type TileReq = { z: number; x: number; y: number };
  const tilesToDownload: TileReq[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = lon2tile(bbox.minLng, z);
    const maxX = lon2tile(bbox.maxLng, z);
    // On garde l'axe Y OSM classique
    const minY = lat2tile(bbox.maxLat, z);
    const maxY = lat2tile(bbox.minLat, z);

    for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
      for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
        tilesToDownload.push({ z, x, y });
      }
    }
  }

  result.total = tilesToDownload.length;
  if (result.total === 0) return result;

  const BATCH_SIZE = 4;
  const BATCH_DELAY_MS = 120;
  let processed = 0;

  for (let i = 0; i < result.total; i += BATCH_SIZE) {
    const batch = tilesToDownload.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ({ z, x, y }) => {
        // Enregistrement dans {tilesDir}/{z}/{x}/{y}.png
        const tileDir = `${tilesDir}${z}/${x}/`;
        await ensureDir(tileDir);
        
        const tilePath = `${tileDir}${y}.png`;
        
        const info = await FileSystem.getInfoAsync(tilePath);
        if (info.exists && 'size' in info && info.size && info.size > MIN_TILE_SIZE_BYTES) {
          return 'cached';
        }

        const subdomain = OSM_SUBDOMAINS[(x + y + z) % OSM_SUBDOMAINS.length];
        const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

        try {
          const res = await FileSystem.downloadAsync(url, tilePath, {
            headers: {
              'User-Agent': 'ScruteLaNature/1.0 (contact@lpo.fr)',
              'Accept': 'image/png, image/*;q=0.8',
            },
          });

          if (res.status !== 200) {
            await FileSystem.deleteAsync(tilePath, { idempotent: true });
            return 'failed';
          }

          const fileInfo = await FileSystem.getInfoAsync(tilePath);
          const size = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size ?? 0) : 0;
          if (size < MIN_TILE_SIZE_BYTES) {
            await FileSystem.deleteAsync(tilePath, { idempotent: true });
            return 'failed';
          }

          return 'downloaded';
        } catch {
          await FileSystem.deleteAsync(tilePath, { idempotent: true });
          return 'failed';
        }
      })
    );

    for (const r of batchResults) {
      if (r === 'cached') result.cached++;
      else if (r === 'downloaded') result.downloaded++;
      else result.failed++;
    }

    processed += batch.length;
    onProgress?.(processed / result.total);

    if (i + BATCH_SIZE < result.total) {
      await new Promise<void>((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(
    `[Tiles FS] Terminé : ${result.downloaded} DL / ${result.cached} cache / ${result.failed} échecs / ${result.total} total`
  );
  return result;
}

/**
 * Vérifie si le fichier MBTiles d'un parcours existe et contient des tuiles.
 */
export async function areTilesAvailable(parcoursId: string): Promise<boolean> {
  const tilesDir = getParcoursTilesDir(parcoursId);
  const info = await FileSystem.getInfoAsync(tilesDir);
  if (!info.exists) return false;
  // S'il y a un dossier 12 (zoom min), on considère que le cache existe.
  const z12Info = await FileSystem.getInfoAsync(tilesDir + '12/');
  return z12Info.exists;
}

/**
 * Retourne l'URI MBTiles pour MapLibre si disponible, sinon null (fallback en ligne).
 * MapLibre utilise le protocole : mbtiles://{chemin absolu}
 */
export function getLocalTileUrlTemplate(parcoursId: string): string {
  // On retourne un template URL du filesystem pour MapLibre RasterSource
  // format attendu : file:///chemin/.../tiles/{z}/{x}/{y}.png
  return `${getParcoursTilesDir(parcoursId)}{z}/{x}/{y}.png`;
}

/**
 * Formate une taille en octets en chaîne lisible (ex: 15.4 Mo)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return '0 o';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
