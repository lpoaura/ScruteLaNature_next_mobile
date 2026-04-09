import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/src/hooks/use-theme-color';

export interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  /** Change la couleur d'arrière-plan avec un nom précis, ou laisse faire le thème automatiquement */
  backgroundColorName?: 'background' | 'tint' | 'text';
}

/**
 * Template de page générique et réutilisable.
 * Gère automatiquement :
 * - Le mode Sombre / Clair via useThemeColor
 * - L'encoche iPhone (Dynamic Island) et Top Notch
 * - L'espace inférieur pour ne pas être masqué par la barre de navigation
 */
export function ScreenWrapper({
  children,
  style,
  backgroundColorName = 'background',
  ...rest
}: ScreenWrapperProps) {
  // useThemeColor détecte automatiquement src/theme/theme.ts pour la couleur
  const backgroundColor = useThemeColor({}, backgroundColorName);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor, // Applique la couleur de fond Sombre ou Claire
          paddingTop: insets.top, // Protège le haut de l'écran
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Assure que la page prend tout l'écran
  },
});
