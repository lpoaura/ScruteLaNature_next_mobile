import { apiService } from './api.service';
import { getLocalHistory, saveParcoursHistoryLocal, addToQueue, deleteLocalHistory } from './database.service';

export interface HistoryRecord {
  syncId: string;
  parcoursId: string;
  score: number;
  completedAt: string;
}

export const HistoryService = {
  /**
   * Enregistre un parcours terminé.
   * - Sauvegarde toujours en local
   * - Tente d'envoyer au serveur ou place dans la file d'attente hors-ligne
   */
  async recordCompletion(parcoursId: string, score: number, isGuest: boolean): Promise<void> {
    const syncId = Math.random().toString(36).substring(2, 15);
    const completedAt = new Date().toISOString();

    const record: HistoryRecord = { syncId, parcoursId, score, completedAt };

    // 1. Sauvegarde locale (pour tous, y compris les invités)
    await saveParcoursHistoryLocal(record);

    // 2. Si non-invité, on synchronise avec le serveur
    if (!isGuest) {
      await addToQueue({
        syncId,
        type: 'parcours_completed',
        payload: JSON.stringify(record),
        createdAt: Date.now(),
      });
    }
  },

  /**
   * Récupère l'historique complet (local + serveur si connecté)
   * Déduplique par parcoursId et garde uniquement le meilleur score
   */
  async getHistory(isGuest: boolean): Promise<any[]> {
    let rawHistory: any[] = [];

    if (isGuest) {
      rawHistory = await getLocalHistory();
    } else {
      try {
        // Pour les connectés, on fetch du backend
        rawHistory = await apiService.get<any[]>('/users/me/history');
      } catch (e) {
        console.warn("Impossible de fetch l'historique serveur, fallback local", e);
        rawHistory = await getLocalHistory();
      }
    }

    // Grouper par parcoursId et conserver le meilleur score
    const bestScoresMap = new Map<string, any>();
    
    for (const item of rawHistory) {
      const existing = bestScoresMap.get(item.parcoursId);
      if (!existing || item.score > existing.score) {
        bestScoresMap.set(item.parcoursId, item);
      } else if (item.score === existing.score) {
        // En cas d'égalité, on garde le plus récent
        if (new Date(item.completedAt).getTime() > new Date(existing.completedAt).getTime()) {
          bestScoresMap.set(item.parcoursId, item);
        }
      }
    }

    return Array.from(bestScoresMap.values());
  },

  /**
   * Supprime un élément de l'historique
   */
  async deleteHistoryItem(syncId: string, isGuest: boolean): Promise<void> {
    // 1. Supprime en local
    await deleteLocalHistory(syncId);

    // 2. Supprime sur le serveur si connecté
    if (!isGuest) {
      try {
        await apiService.delete(`/users/me/history/${syncId}`);
      } catch (e) {
        console.warn("Impossible de supprimer l'historique sur le serveur", e);
      }
    }
  }
};
