import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type IconSymbolName = 
  | 'house.fill'
  | 'paperplane.fill'
  | 'chevron.left.forwardslash.chevron.right'
  | 'chevron.right'
  | 'magnifyingglass'
  | 'person.fill'
  | 'person.2.badge'
  | 'person'
  | 'map.fill'
  | 'cloud.fill'
  | 'checkmark.circle.fill'
  | 'play.fill'
  | 'star.fill'
  | 'wifi'
  | 'wifi.slash'
  | 'leaf.fill'
  | 'download';

const MAPPING: Record<IconSymbolName, keyof typeof Ionicons.glyphMap> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code-slash',
  'chevron.right': 'chevron-forward',
  'magnifyingglass': 'search',
  'person.fill': 'person',
  'person.2.badge': 'people',
  'person': 'person-outline',
  'map.fill': 'map',
  'cloud.fill': 'cloud',
  'checkmark.circle.fill': 'checkmark-circle',
  'play.fill': 'play',
  'star.fill': 'star',
  'wifi': 'wifi',
  'wifi.slash': 'wifi-outline', // Ionicons doesn't have a great wifi-slash, using outline or we can use another
  'leaf.fill': 'leaf',
  'download': 'download',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: string;
}) {
  const iconName = MAPPING[name];
  if (!iconName) {
    return null;
  }
  return <Ionicons name={iconName} size={size} color={color} style={style as any} />;
}
