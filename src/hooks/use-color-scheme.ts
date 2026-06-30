import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useSettingsStore } from '@/src/store/settings.store';

export function useColorScheme() {
  const systemColorScheme = useNativeColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  
  if (settingsTheme === 'system') {
    return systemColorScheme;
  }
  
  return settingsTheme as 'light' | 'dark';
}
