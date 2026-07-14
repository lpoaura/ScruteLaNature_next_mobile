import { useState, useEffect, useCallback } from 'react';
import { getAllParcours, awaitDatabaseReady } from '@/src/services/database.service';
import { getParcoursFilesSize, formatBytes, getLocalCoverImage } from '@/src/services/filesystem.service';
import { parcoursService } from '@/src/services/parcours.service';
import { useGameStore } from '@/src/store/game.store';
import type { Parcours } from '@/src/types/api.types';

export type DownloadedParcoursData = {
  parcours: Parcours & { downloadedAt: number; isCompleted: boolean };
  sizeBytes: number;
  sizeFormatted: string;
  hasUpdate: boolean;
  localCoverImage: string | null;
};

export function useDownloadedParcours() {
  const [data, setData] = useState<DownloadedParcoursData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // S'abonner aux IDs pour recharger quand l'utilisateur télécharge/supprime un parcours
  const downloadedIds = useGameStore((state) => state.downloadedParcoursIds);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await awaitDatabaseReady();
      // 1. Récupérer les parcours depuis SQLite
      const localParcours = await getAllParcours();
      
      if (localParcours.length === 0) {
        setData([]);
        setIsLoading(false);
        return;
      }

      // 2. Vérifier les mises à jour sur le serveur (si en ligne)
      let remoteMap = new Map<string, string>();
      try {
        const remoteParcours = await parcoursService.search();
        remoteParcours.forEach(p => remoteMap.set(p.id, p.updatedAt));
      } catch (err) {
        // Mode hors-ligne ou erreur serveur, on ignore silencieusement
      }

      // 3. Calculer la taille de chaque parcours et consolider les données
      const processedData: DownloadedParcoursData[] = await Promise.all(
        localParcours.map(async (p) => {
          const sizeBytes = await getParcoursFilesSize(p.id);
          
          let hasUpdate = false;
          // Si on a récupéré le updatedAt du serveur et qu'il est plus récent que le nôtre
          if (p.updatedAt && remoteMap.has(p.id)) {
            const remoteDate = remoteMap.get(p.id)!;
            if (new Date(remoteDate) > new Date(p.updatedAt)) {
              hasUpdate = true;
            }
          }

          return {
            parcours: p,
            sizeBytes,
            sizeFormatted: formatBytes(sizeBytes),
            hasUpdate,
            localCoverImage: getLocalCoverImage(p.id, p.coverImage),
          };
        })
      );

      setData(processedData);
    } catch (error) {
      console.error('Erreur lors du chargement des parcours téléchargés:', error);
    } finally {
      setIsLoading(false);
    }
  }, [downloadedIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, isLoading, refresh: loadData };
}
