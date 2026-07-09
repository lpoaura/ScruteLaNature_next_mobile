import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'system';

interface SettingsState {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  theme: ThemeType;
  pushNotificationsEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemeType) => void;
  setPushNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      vibrationEnabled: true,
      theme: 'system',
      pushNotificationsEnabled: true, // Defaulting to true, but since we mock, it's just a UI state
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setPushNotificationsEnabled: (enabled) => set({ pushNotificationsEnabled: enabled }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
