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

// ─── Téléchargement des tuiles de carte (OSM) ──────────────────────────────────

/**
 * Télécharge les tuiles de carte OpenStreetMap pour une Bounding Box (via un GeoJSON).
 * Les tuiles sont sauvegardées localement pour usage hors-ligne.
 *
 * @param geojsonString GeoJSON représentant le tracé du parcours
 * @param parcoursId    Identifiant du parcours
 * @param minZoom       Niveau de zoom minimal (défaut: 14)
 * @param maxZoom       Niveau de zoom maximal (défaut: 17)
 */
export async function downloadMapTiles(
  geojsonString: string | null | undefined,
  parcoursId: string,
  minZoom = 14,
  maxZoom = 17,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (!geojsonString) return;

  const bbox = calculateBoundingBox(geojsonString);
  if (!bbox) return;

  const tilesDir = getParcoursTilesDir(parcoursId);
  await ensureDir(tilesDir);

  type TileReq = { x: number; y: number; z: number };
  const tilesToDownload: TileReq[] = [];

  // 1. Calculer toutes les tuiles nécessaires
  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = lon2tile(bbox.minLng, z);
    const maxX = lon2tile(bbox.maxLng, z);
    const minY = lat2tile(bbox.maxLat, z); // Note: maxLat correspond au minY car l'axe Y descend
    const maxY = lat2tile(bbox.minLat, z);

    for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
      for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
        tilesToDownload.push({ x, y, z });
      }
    }
  }

  const totalTiles = tilesToDownload.length;
  if (totalTiles === 0) return;

  // 2. Télécharger les tuiles par lots (batch) pour ne pas saturer le réseau
  const BATCH_SIZE = 5;
  let downloadedCount = 0;

  for (let i = 0; i < totalTiles; i += BATCH_SIZE) {
    const batch = tilesToDownload.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (tile) => {
        const { x, y, z } = tile;
        const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        const localTileDir = `${tilesDir}${z}/${x}/`;
        const localPath = `${localTileDir}${y}.png`;

        await ensureDir(localTileDir);

        const info = await FileSystem.getInfoAsync(localPath);
        if (!info.exists) {
          try {
            await FileSystem.downloadAsync(url, localPath);
          } catch (err) {
            console.warn(`[Tiles] Échec téléchargement tuile ${z}/${x}/${y}:`, err);
          }
        }
      })
    );

    downloadedCount += batch.length;
    onProgress?.(downloadedCount / totalTiles);
  }
}

