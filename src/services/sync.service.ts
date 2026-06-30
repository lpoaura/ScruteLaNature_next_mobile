import NetInfo from '@react-native-community/netinfo';
import { apiService } from './api.service';
import {
  getPendingQueue,
  removeFromQueue,
  incrementQueueAttempts,
} from './database.service';

let isSyncing = false;

/**
 * Parcourt la file d'attente hors-ligne (offline_queue) et tente d'envoyer 
 * les données au serveur API. 
 * Supprime l'entrée en cas de succès, incrémente les tentatives en cas d'échec.
 */
export async function syncPendingData() {
  if (isSyncing) return;

  // On vérifie d'abord qu'on a du réseau
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  isSyncing = true;
  try {
    const items = await getPendingQueue(3); // Limité à 3 tentatives max
    if (items.length === 0) return;

    console.log(`[Sync] Démarrage de la synchro : ${items.length} éléments en attente.`);

    let syncedCount = 0;

    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload);
        
        if (item.type === 'parcours_completed') {
          await apiService.post('/mobile/sync', {
            parcoursCompleted: [{
              syncId: item.syncId,
              parcoursId: payload.parcoursId,
              score: payload.score || 0,
              completedAt: new Date(item.createdAt).toISOString(),
            }]
          });
        } else {
          // Si on ajoute d'autres types d'évènements plus tard (ex: observations)
          console.warn(`[Sync] Type inconnu: ${item.type}`);
        }
        
        // Succès -> On retire l'élément de la file d'attente
        await removeFromQueue(item.syncId);
        console.log(`[Sync] Élément ${item.syncId} synchronisé avec succès.`);
        syncedCount++;
        
      } catch (err: any) {
        console.error(`[Sync] Erreur pour l'élément ${item.syncId}:`, err.message);
        // Échec -> On incrémente le nombre de tentatives
        await incrementQueueAttempts(item.syncId);
      }
    }
    
    console.log('[Sync] Synchronisation terminée.');

    // Rafraîchir le profil (points, niveau) si au moins un élément a été synchronisé
    if (syncedCount > 0) {
      try {
        const { authService } = await import('./auth.service');
        const { useAuthStore } = await import('../store/auth.store');
        
        const updatedProfile = await authService.getProfile();
        useAuthStore.getState().updateUser(updatedProfile);
        console.log('[Sync] Profil mis à jour suite à la synchronisation.');
      } catch (err) {
        console.error('[Sync] Impossible de rafraîchir le profil:', err);
      }
    }

  } catch (err) {
    console.error('[Sync] Erreur globale lors de la synchronisation:', err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Initialise l'écouteur de changement d'état du réseau.
 * À appeler une seule fois au démarrage de l'application (ex: dans _layout.tsx).
 */
export function initSyncListener() {
  // Se déclenche à chaque changement de statut (wifi activé, retour 4G, etc.)
  NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncPendingData();
    }
  });
}
