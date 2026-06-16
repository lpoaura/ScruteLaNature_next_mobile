import { apiService } from './api.service';
import type { ReviewPayload } from '@/src/types/api.types';

export const socialService = {
  /**
   * Soumettre un avis (note + commentaire) pour un parcours
   * → POST /social/reviews
   */
  submitReview: (payload: ReviewPayload): Promise<void> =>
    apiService.post<void>('/social/reviews', payload),
};
