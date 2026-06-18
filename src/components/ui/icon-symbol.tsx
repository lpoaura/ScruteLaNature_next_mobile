import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Home, Map as MapIcon, User, Search, Navigation, CheckCircle, Play, Star, Wifi, WifiOff, Code, Send } from 'lucide-react-native';

// Type mapping from SF Symbols to Lucide React Native
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
  | 'wifi.slash';

const MAPPING: Record<IconSymbolName, React.ElementType> = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': Navigation, // Approximate replacement
  'magnifyingglass': Search,
  'person.fill': User,
  'person.2.badge': User, // Approximate
  'person': User,
  'map.fill': MapIcon,
  'cloud.fill': MapIcon, // Approximate or replace later
  'checkmark.circle.fill': CheckCircle,
  'play.fill': Play,
  'star.fill': Star,
  'wifi': Wifi,
  'wifi.slash': WifiOff,
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
  const IconComponent = MAPPING[name];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent size={size} color={color} style={style} />;
}
