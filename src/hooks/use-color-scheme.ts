import { useColorScheme as useNativeColorScheme, Appearance } from 'react-native';
import { useSettingsStore } from '@/src/store/settings.store';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

export function useColorScheme() {
  const systemColorScheme = useNativeColorScheme();
  const appearanceScheme = Appearance.getColorScheme();
  const { colorScheme: nativeWindScheme } = useNativeWindColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  
  if (settingsTheme === 'system') {
    return systemColorScheme ?? appearanceScheme ?? (nativeWindScheme as 'light' | 'dark' | undefined) ?? 'light';
  }
  
  return settingsTheme as 'light' | 'dark';
}
