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
   * Récupérer le flux d'actualité de la communauté (10 derniers avis)
   */
  getCommunityFeed: (parcoursId?: string): Promise<import('@/src/types/api.types').CommunityReview[]> => {
    const url = parcoursId ? `/mobile/community/feed?parcoursId=${parcoursId}` : '/mobile/community/feed';
    return apiService.get<import('@/src/types/api.types').CommunityReview[]>(url);
  },

  /**
   * Rechercher des utilisateurs par pseudo
   * → GET /social/users/search?q=XYZ
   */
  searchUsers: (query: string): Promise<Array<{ id: string; pseudo: string }>> =>
    apiService.get<Array<{ id: string; pseudo: string }>>(`/social/users/search?q=${encodeURIComponent(query)}`),

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
   */
  respondFriendRequest: async (friendshipId: string, accept: boolean): Promise<void> => {
    if (accept) {
      await apiService.patch<void>(`/social/friends/${friendshipId}/accept`, {});
    } else {
      await apiService.delete<void>(`/social/friends/${friendshipId}`);
    }
  },

  /**
   * Envoyer une invitation de parcours à un ami
   */
  sendParcoursInvitation: (receiverId: string, parcoursId: string): Promise<any> =>
    apiService.post<any>('/social/invitations', { receiverId, parcoursId }),

  /**
   * Lister les invitations de parcours reçues
   */
  getParcoursInvitations: (): Promise<any[]> =>
    apiService.get<any[]>('/social/invitations'),

  /**
   * Répondre à une invitation de parcours
   */
  respondToInvitation: async (invitationId: string, accept: boolean): Promise<void> => {
    if (accept) {
      await apiService.patch<void>(`/social/invitations/${invitationId}/accept`, {});
    } else {
      await apiService.delete<void>(`/social/invitations/${invitationId}`);
    }
  },
};
