/**
 * Génère un UUID v4 aléatoire côté mobile.
 * Utilisé pour les `syncId` dans la file d'attente hors-ligne
 * afin de garantir l'idempotence lors de la synchronisation avec le backend.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
