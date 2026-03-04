import { Tabs } from 'expo-router';
import React from 'react';

import { FloatingTabBar } from '@/src/components/floating-tab-bar';
import { IconSymbol } from '@/src/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'search',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="paperplane.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
