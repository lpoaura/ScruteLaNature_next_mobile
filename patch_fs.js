const fs = require('fs');
let content = fs.readFileSync('src/services/filesystem.service.ts', 'utf-8');

// Supprimer imports inutiles
content = content.replace("import * as SQLite from 'expo-sqlite';\n", "");
content = content.replace("import { toByteArray } from 'base64-js';\n", "");

// Supprimer hexTable et base64ToHex
content = content.replace(/const hexTable[\s\S]*?return hexString;\n}\n/m, "");

// Remplacer initMbtilesDb
content = content.replace(/async function initMbtilesDb[\s\S]*?\}\n/m, "");

// Remplacer downloadMapTiles
const newDownloadMapTiles = `
export async function downloadMapTiles(
  geojsonString: string | null | undefined,
  parcoursId: string,
  minZoom = 12,
  maxZoom = 17,
  onProgress?: (progress: number) => void
): Promise<TileDownloadResult> {
  const result: TileDownloadResult = { total: 0, downloaded: 0, cached: 0, failed: 0 };
  if (!geojsonString) return result;

  const bbox = calculateBoundingBox(geojsonString, 0.005);
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
        const tileDir = \`\${tilesDir}\${z}/\${x}/\`;
        await ensureDir(tileDir);
        
        const tilePath = \`\${tileDir}\${y}.png\`;
        
        const info = await FileSystem.getInfoAsync(tilePath);
        if (info.exists && 'size' in info && info.size && info.size > MIN_TILE_SIZE_BYTES) {
          return 'cached';
        }

        const subdomain = OSM_SUBDOMAINS[(x + y + z) % OSM_SUBDOMAINS.length];
        const url = \`https://\${subdomain}.tile.openstreetmap.org/\${z}/\${x}/\${y}.png\`;

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
    \`[Tiles FS] Terminé : \${result.downloaded} DL / \${result.cached} cache / \${result.failed} échecs / \${result.total} total\`
  );
  return result;
}
`;
content = content.replace(/export async function downloadMapTiles[\s\S]*?return result;\n}/m, newDownloadMapTiles.trim());

// Remplacer areTilesAvailable
const newAreTilesAvailable = `
export async function areTilesAvailable(parcoursId: string): Promise<boolean> {
  const tilesDir = getParcoursTilesDir(parcoursId);
  const info = await FileSystem.getInfoAsync(tilesDir);
  if (!info.exists) return false;
  // S'il y a un dossier 12 (zoom min), on considère que le cache existe.
  const z12Info = await FileSystem.getInfoAsync(tilesDir + '12/');
  return z12Info.exists;
}
`;
content = content.replace(/export async function areTilesAvailable[\s\S]*?\}\n/m, newAreTilesAvailable.trim() + '\n');

// Remplacer getMbtilesUri
const newLocalTileUrl = `
export function getLocalTileUrlTemplate(parcoursId: string): string {
  // On retourne un template URL du filesystem pour MapLibre RasterSource
  // format attendu : file:///chemin/.../tiles/{z}/{x}/{y}.png
  return \`\${getParcoursTilesDir(parcoursId)}{z}/{x}/{y}.png\`;
}
`;
content = content.replace(/export function getMbtilesUri[\s\S]*?\}\n/m, newLocalTileUrl.trim() + '\n');

fs.writeFileSync('src/services/filesystem.service.ts', content);
