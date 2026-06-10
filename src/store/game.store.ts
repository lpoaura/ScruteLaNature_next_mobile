import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GameState {
  activeParcoursId: string | null;
  currentEtapeOrder: number;
  downloadedParcoursIds: string[];
  completedParcoursIds: string[];

  startParcours: (parcoursId: string) => void;
  resumeParcours: () => void;
  finishParcours: () => void;
  downloadParcours: (parcoursId: string) => void;
  removeParcours: (parcoursId: string) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      activeParcoursId: null,
      currentEtapeOrder: 0,
      downloadedParcoursIds: [],
      completedParcoursIds: [],

      startParcours: (parcoursId) =>
        set({ activeParcoursId: parcoursId, currentEtapeOrder: 1 }),

      resumeParcours: () => set((state) => ({ ...state })), // Placeholder

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
    }),
    {
      name: 'lpo-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
