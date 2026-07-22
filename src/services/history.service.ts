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
   */
  async getHistory(isGuest: boolean): Promise<any[]> {
    // Si invité, on renvoie juste le local (les parcours locaux n'ont pas forcément les titres complets 
    // s'ils n'ont pas été téléchargés, mais dans le cadre du local on suppose qu'ils y sont).
    // Idéalement on ferait un JOIN local, mais pour l'instant on retourne les raw records.
    if (isGuest) {
      const local = await getLocalHistory();
      return local;
    }

    try {
      // Pour les connectés, on fetch du backend
      const serverHistory = await apiService.get<any[]>('/users/me/history');
      return serverHistory;
    } catch (e) {
      console.warn("Impossible de fetch l'historique serveur, fallback local", e);
      return await getLocalHistory();
    }
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
