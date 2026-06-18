import { apiService } from './api.service';
import type { ReviewPayload, Friendship } from '@/src/types/api.types';

export const socialService = {
  /**
   * Soumettre un avis (note + commentaire) pour un parcours
   * → POST /social/reviews
   */
  submitReview: (payload: ReviewPayload): Promise<void> =>
    apiService.post<void>('/social/reviews', payload),

  /**
   * Récupérer la liste des amis acceptés
   * → GET /social/friends
   */
  getFriends: (): Promise<Friendship[]> =>
    apiService.get<Friendship[]>('/social/friends'),

  /**
   * Récupérer les demandes d'amis en attente (reçues)
   * → GET /social/friends/requests
   */
  getFriendRequests: (): Promise<Friendship[]> =>
    apiService.get<Friendship[]>('/social/friends/requests'),

  /**
   * Envoyer une demande d'ami à un utilisateur via son pseudo
   * → POST /social/friends/request
   */
  sendFriendRequest: (pseudo: string): Promise<Friendship> =>
    apiService.post<Friendship>('/social/friends/request', { pseudo }),

  /**
   * Accepter ou refuser une demande d'ami reçue
   * → POST /social/friends/:id/respond
   */
  respondFriendRequest: (friendshipId: string, accept: boolean): Promise<Friendship> =>
    apiService.post<Friendship>(`/social/friends/${friendshipId}/respond`, { accept }),
};
