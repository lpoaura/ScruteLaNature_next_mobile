import { apiService } from './api.service';
import {
  insertParcours,
  insertEtape,
  insertJeu,
  updateJeuLocalPaths,
} from './database.service';
import {
  downloadCoverImage,
  downloadMedia,
  getMediaFilename,
  deleteParcoursFiles,
  downloadMapTiles,
} from './filesystem.service';
import type {
  Parcours,
  ParcoursDownload,
  SearchParcoursParams,
  NearbyParcoursParams,
} from '@/src/types/api.types';

// ─── Service Parcours ─────────────────────────────────────────────────────────

export const parcoursService = {

  // ─── Recherche filtrée ──────────────────────────────────────────────────
  /**
   * Recherche des parcours publiés avec filtres optionnels.
   * → GET /mobile/parcours/search
   *
   * Filtres disponibles :
   * - zonageId   : zone géographique LPO
   * - difficulty : FACILE | MOYEN | DIFFICILE
   * - isPMRFriendly, isChildFriendly, isMentalHandicapFriendly
   */
  search: (params: SearchParcoursParams = {}): Promise<Parcours[]> => {
    const query = new URLSearchParams();
    if (params.zonageId)                  query.set('zonageId', params.zonageId);
    if (params.difficulty)                query.set('difficulty', params.difficulty);
    if (params.isPMRFriendly)             query.set('isPMRFriendly', 'true');
    if (params.isChildFriendly)           query.set('isChildFriendly', 'true');
    if (params.isMentalHandicapFriendly)  query.set('isMentalHandicapFriendly', 'true');

    const qs = query.toString();
    return apiService.get<Parcours[]>(`/mobile/parcours/search${qs ? `?${qs}` : ''}`);
  },

  // ─── Parcours à proximité ───────────────────────────────────────────────
  /**
   * Retourne les parcours publiés dans un rayon autour d'une position GPS.
   * → GET /mobile/parcours/nearby?lat=&lng=&radius=
   *
   * @param radius Rayon en mètres (défaut backend : 10 000m)
   */
  getNearby: (params: NearbyParcoursParams): Promise<Parcours[]> => {
    const query = new URLSearchParams({
      latitude: params.lat.toString(),
      longitude: params.lng.toString(),
    });
    if (params.radius) {
      const radiusKm = params.radius / 1000;
      query.set('radiusKm', radiusKm.toString());
    }

    return apiService.get<Parcours[]>(`/mobile/parcours/nearby?${query.toString()}`);
  },

  // ─── Téléchargement complet pour le mode hors-ligne ────────────────────
  /**
   * Télécharge un parcours complet pour le mode hors-ligne.
   *
   * Séquence :
   * 1. Appel API → méga-JSON (parcours + étapes + jeux + médias)
   * 2. Insertion dans SQLite (parcours, étapes, jeux)
   * 3. Téléchargement de l'image de couverture
   * 4. Téléchargement de chaque image/audio de jeu
   * 5. Mise à jour des chemins locaux dans SQLite
   *
   * @param id         Id du parcours à télécharger
   * @param onProgress Callback de progression (0 à 1) pour afficher une barre
   */
  download: async (
    id: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    // ── Étape 1 : Récupérer le JSON complet depuis l'API ──────────────────
    onProgress?.(0.05);
    const data = await apiService.get<ParcoursDownload>(`/mobile/parcours/${id}/download`);

    // ── Étape 2 : Insérer dans SQLite ─────────────────────────────────────
    onProgress?.(0.10);
    await insertParcours(data);

    // ── Étape 3 : Insérer les étapes et jeux ─────────────────────────────
    // Construire la liste de tous les jeux pour le téléchargement médias
    type MediaItem = { jeuId: string; url: string; type: 'image' | 'audio' };
    const mediaItems: MediaItem[] = [];

    for (const etape of data.etapes) {
      await insertEtape(etape);
      for (const jeu of etape.jeux) {
        await insertJeu(jeu);
        if (jeu.imageUrl) mediaItems.push({ jeuId: jeu.id, url: jeu.imageUrl, type: 'image' });
        if (jeu.audioUrl) mediaItems.push({ jeuId: jeu.id, url: jeu.audioUrl, type: 'audio' });
      }
    }

    onProgress?.(0.20);

    // ── Étape 4 : Télécharger l'image de couverture ───────────────────────
    await downloadCoverImage(data.coverImage, id);
    onProgress?.(0.25);

    // ── Étape 5 : Télécharger les médias des jeux ─────────────────────────
    if (mediaItems.length === 0) {
      // S'il n'y a pas de médias, on passe directement aux tuiles
      try {
        if (data.pathGeoJSON) {
          await downloadMapTiles(data.pathGeoJSON, id, 12, 17, (p) => onProgress?.(0.25 + p * 0.75));
        }
      } catch (err) {
        console.warn(`[Download] Échec tuiles:`, err);
      }
      onProgress?.(1);
      return;
    }

    // On garde 10% pour la carte
    const progressPerItem = 0.65 / mediaItems.length;

    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      try {
        const filename = getMediaFilename(item.jeuId, item.type, item.url);
        const localPath = await downloadMedia(item.url, id, filename);

        // Mettre à jour le chemin local dans SQLite
        if (item.type === 'image') {
          await updateJeuLocalPaths(item.jeuId, undefined, localPath);
        } else {
          await updateJeuLocalPaths(item.jeuId, localPath, undefined);
        }
      } catch (err) {
        // Un média en échec ne bloque pas le reste du téléchargement
        console.warn(`[Download] Média ignoré (${item.url}):`, err);
      }

      onProgress?.(0.25 + progressPerItem * (i + 1));
    }

    // ── Étape 6 : Télécharger les tuiles de carte OSM ─────────────────────
    // On alloue les derniers 10% de la progression au téléchargement des tuiles
    try {
      if (data.pathGeoJSON) {
        await downloadMapTiles(
          data.pathGeoJSON,
          id,
          12,
          17,
          (p) => onProgress?.(0.90 + p * 0.10)
        );
      }
    } catch (err) {
      console.warn(`[Download] Échec du téléchargement des tuiles pour le parcours ${id}:`, err);
    }

    onProgress?.(1);
  },

  // ─── Suppression d'un parcours téléchargé ──────────────────────────────
  /**
   * Supprime un parcours du stockage local :
   * - Supprime les données SQLite (CASCADE sur étapes et jeux)
   * - Supprime les fichiers médias locaux
   *
   * À importer depuis database.service pour le SQLite,
   * cette fonction gère la partie FileSystem.
   */
  deleteLocal: async (parcoursId: string): Promise<void> => {
    await deleteParcoursFiles(parcoursId);
    // La suppression SQLite se fait via database.service.deleteParcours()
    // séparément pour séparer les responsabilités
  },
};
