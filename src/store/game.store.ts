import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GameState {
  activeParcoursId: string | null;
  currentEtapeOrder: number;
  downloadedParcoursIds: string[];
  completedParcoursIds: string[];

  // Tâche 3.5 : Suivi du score et du temps
  score: number;
  startTime: number | null;
  jeuxCompletes: string[];

  startParcours: (parcoursId: string) => void;
  resumeParcours: () => void;
  completeEtape: (totalEtapes: number) => void;
  finishParcours: () => void;
  downloadParcours: (parcoursId: string) => void;
  removeParcours: (parcoursId: string) => void;
  clearAllParcours: () => void;
  completeJeu: (jeuId: string, points: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeParcoursId: null,
      currentEtapeOrder: 0,
      downloadedParcoursIds: [],
      completedParcoursIds: [],

      score: 0,
      startTime: null,
      jeuxCompletes: [],

      startParcours: (parcoursId) =>
        set({ 
          activeParcoursId: parcoursId, 
          currentEtapeOrder: 1,
          score: 0,
          startTime: Date.now(),
          jeuxCompletes: []
        }),

      resumeParcours: () => set((state) => ({ ...state })), // Placeholder

      completeEtape: (totalEtapes) => {
        const { currentEtapeOrder } = get();
        if (currentEtapeOrder < totalEtapes) {
          set({ currentEtapeOrder: currentEtapeOrder + 1 });
        } else {
          get().finishParcours();
        }
      },

      finishParcours: () =>
        set((state) => ({
          completedParcoursIds: state.activeParcoursId
            ? [...new Set([...state.completedParcoursIds, state.activeParcoursId])]
            : state.completedParcoursIds,
          activeParcoursId: null,
          currentEtapeOrder: 0,
        })),

      downloadParcours: (parcoursId) =>
        set((state) => ({
          downloadedParcoursIds: [...new Set([...state.downloadedParcoursIds, parcoursId])],
        })),

      removeParcours: (parcoursId) =>
        set((state) => ({
          downloadedParcoursIds: state.downloadedParcoursIds.filter((id) => id !== parcoursId),
          activeParcoursId: state.activeParcoursId === parcoursId ? null : state.activeParcoursId,
        })),

      clearAllParcours: () =>
        set({
          downloadedParcoursIds: [],
        }),

      completeJeu: (jeuId, points) =>
        set((state) => {
          if (!state.jeuxCompletes.includes(jeuId)) {
            return {
              jeuxCompletes: [...state.jeuxCompletes, jeuId],
              score: state.score + points,
            };
          }
          return state;
        }),
    }),
    {
      name: 'lpo-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
