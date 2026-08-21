import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  Pressable,
  useColorScheme
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/src/components/ui/icon-symbol';
import { socialService } from '@/src/services/social.service';
import type { CommunityReview } from '@/src/types/api.types';
import { useSettingsStore } from '@/src/store/settings.store';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';

  const [feed, setFeed] = useState<CommunityReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [parcoursList, setParcoursList] = useState<{ id: string, title: string }[]>([]);
  const [selectedParcours, setSelectedParcours] = useState<string>('');

  useEffect(() => {
    fetchFeed();
  }, [selectedParcours]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const data = await socialService.getCommunityFeed(selectedParcours || undefined);
      setFeed(data);

      // Extract unique parcours from the feed for the filter dropdown
      if (!selectedParcours) {
        const uniqueParcours = Array.from(new Set(data.map(item => (item.parcours as any).id)))
          .map(id => {
            const p = data.find(item => (item.parcours as any).id === id)?.parcours;
            return { id, title: p?.title || '' };
          });
        setParcoursList(uniqueParcours);
      }
    } catch (error) {
      console.error('Failed to fetch community feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'À l\'instant';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0A0E11' : '#F8FAFC' }}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Avis de la Communauté',
          headerStyle: { backgroundColor: isDark ? '#141B20' : '#FFFFFF' },
          headerTintColor: isDark ? '#F1F5F9' : '#0F172A',
          headerShadowVisible: false,
        }} 
      />

      <View className="p-4 border-b border-slate-200 dark:border-[#202C35] bg-white dark:bg-[#141B20]">
        <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Filtrer par parcours</Text>
        <View className="border border-slate-300 dark:border-[#2B3A44] rounded-xl overflow-hidden bg-slate-50 dark:bg-[#0A0E11]">
          <Picker
            selectedValue={selectedParcours}
            onValueChange={(itemValue) => setSelectedParcours(itemValue)}
            style={{ color: isDark ? '#F1F5F9' : '#0F172A', height: 50 }}
            dropdownIconColor={isDark ? '#F1F5F9' : '#0F172A'}
          >
            <Picker.Item label="Tous les parcours" value="" />
            {parcoursList.map(p => (
              <Picker.Item key={p.id} label={p.title} value={p.id} />
            ))}
          </Picker>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#38BDF8' : '#007E84'} />
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <View className="bg-white dark:bg-[#141B20] p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-[#202C35]">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full mr-3 bg-emerald-100 dark:bg-[#062A24]/80 items-center justify-center">
                  <Text className="text-emerald-700 dark:text-[#34D399] font-bold text-lg">
                    {item.user.pseudo ? item.user.pseudo.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-800 dark:text-slate-100">{item.user.pseudo || 'Anonyme'}</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                    {getTimeAgo(item.createdAt)} • {item.parcours.zonage?.nom ? `${item.parcours.zonage.nom} — ` : ''}{item.parcours.title}
                  </Text>
                </View>
                <View className="bg-amber-100 dark:bg-[#382005]/80 px-2 py-1 rounded-lg flex-row items-center">
                  <IconSymbol name="star.fill" size={12} color="#D97706" />
                  <Text className="text-amber-700 dark:text-[#FBBF24] font-bold text-xs ml-1">{item.rating}</Text>
                </View>
              </View>
              {item.comment && (
                <Text className="text-slate-600 dark:text-slate-300 text-sm leading-5">"{item.comment}"</Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View className="bg-white dark:bg-[#141B20] p-6 rounded-3xl items-center shadow-sm mt-4">
              <IconSymbol name="person.2.badge" size={32} color={isDark ? '#38BDF8' : '#007E84'} />
              <Text className="text-slate-500 dark:text-slate-400 mt-2 text-center">Aucun avis trouvé.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
