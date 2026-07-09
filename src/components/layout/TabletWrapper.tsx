import React from 'react';
import { View, StyleSheet, useWindowDimensions, StyleProp, ViewStyle } from 'react-native';

interface TabletWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

export function TabletWrapper({ children, style, maxWidth = 768 }: TabletWrapperProps) {
  const { width } = useWindowDimensions();
  // On considère comme tablette tout écran supérieur à 768px de large
  const isTablet = width >= 768;

  return (
    <View style={[styles.container, isTablet && { maxWidth, alignSelf: 'center' }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
