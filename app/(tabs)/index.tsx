import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import { useGameStore } from '@/src/store/game.store';
import { IconSymbol } from '@/src/components/ui/icon-symbol';

// Mocks pour le carrousel
const SELECTIONS = [
  {
    id: '1',
    title: 'Forêt de Brocéliande',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80',
    mascot: '🦉',
  },
  {
    id: '2',
    title: 'Sentier du Littoral',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80',
    mascot: '🦀',
  },
  {
    id: '3',
    title: 'Marais Poitevin',
    image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80',
    mascot: '🐸',
  },
];

const COMMUNITY_FEED = [
  {
    id: '1',
    user: 'Camille R.',
    avatar: 'https://i.pravatar.cc/150?u=camille',
    parcours: 'Forêt de Brocéliande',
    rating: 5,
    comment: 'Superbe balade en famille ! Les explications sur les chênes centenaires étaient passionnantes.',
    timeAgo: 'Il y a 2h'
  },
  {
    id: '2',
    user: 'Thomas D.',
    avatar: 'https://i.pravatar.cc/150?u=thomas',
    parcours: 'Sentier du Littoral',
    rating: 4,
    comment: 'Très beau panorama, mais attention au vent sur la pointe.',
    timeAgo: 'Il y a 5h'
  }
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeParcoursId, currentEtapeOrder, downloadedParcoursIds } = useGameStore();

  // Mock sync state - On pourra relier à une logique SQLite / Network plus tard
  const isSyncing = false; 

  return (
    <ScrollView 
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. En-tête (Personnalisation & Statut) */}
      <View className="px-6 mb-8 flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-slate-800">
            Bonjour {user?.pseudo || 'Aventurier'} 👋
          </Text>
          <View className="flex-row items-center mt-3">
            <View className="bg-emerald-100 px-3 py-1.5 rounded-full flex-row items-center mr-3 shadow-sm">
              <IconSymbol name="star.fill" size={16} color="#10B981" />
              <Text className="text-emerald-700 font-bold ml-1.5 text-sm">
                Niveau {user?.level || 1}
              </Text>
            </View>
            <View className="bg-amber-100 px-3 py-1.5 rounded-full flex-row items-center shadow-sm">
              <Text className="text-amber-700 font-bold text-sm">
                {user?.totalPoints || 0} pts
              </Text>
            </View>
          </View>
        </View>
        <View className="bg-white p-2.5 rounded-full shadow-sm ml-4">
          {isSyncing ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <IconSymbol name="checkmark.circle.fill" size={24} color="#10B981" />
          )}
        </View>
      </View>

      {/* Bulle Nature (Le saviez-vous ?) */}
      <View className="px-6 mb-8">
        <View className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex-row items-center shadow-sm">
          <View className="bg-emerald-200/50 p-3 rounded-full mr-4">
            <IconSymbol name="leaf.fill" size={24} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-emerald-900 font-bold mb-1">Le saviez-vous ?</Text>
            <Text className="text-emerald-800 text-sm leading-5">
              Le chardonneret élégant se nourrit principalement de graines de chardons, d'où il tire son nom !
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Action Immédiate (Call to Action dynamique) */}
      <View className="px-6 mb-10">
        <Text className="text-lg font-bold text-slate-800 mb-4">Prêt pour l'aventure ?</Text>
        
        {activeParcoursId ? (
          <Pressable 
            className="bg-emerald-600 rounded-3xl p-6 shadow-md flex-row items-center justify-between active:opacity-90"
            onPress={() => router.push(`/parcours/${activeParcoursId}`)}
          >
            <View className="flex-1 mr-4">
              <Text className="text-emerald-100 font-medium mb-1">Balade en cours</Text>
              <Text className="text-white text-2xl font-bold mb-2">Reprendre ma balade</Text>
              <Text className="text-emerald-50 text-sm font-medium">Étape {currentEtapeOrder}</Text>
            </View>
            <View className="bg-white/20 p-4 rounded-full">
              <IconSymbol name="play.fill" size={32} color="#fff" />
            </View>
          </Pressable>
        ) : downloadedParcoursIds.length > 0 ? (
          <Pressable 
            className="bg-indigo-600 rounded-3xl p-6 shadow-md flex-row items-center justify-between active:opacity-90"
            onPress={() => router.push(`/parcours/${downloadedParcoursIds[0]}`)}
          >
            <View className="flex-1 mr-4">
              <Text className="text-indigo-100 font-medium mb-1">Téléchargé</Text>
              <Text className="text-white text-2xl font-bold mb-2">Départ hors-ligne</Text>
              <Text className="text-indigo-50 text-sm font-medium">Jouer sans réseau</Text>
            </View>
            <View className="bg-white/20 p-4 rounded-full">
              <IconSymbol name="play.fill" size={32} color="#fff" />
            </View>
          </Pressable>
        ) : (
          <Pressable 
            className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-8 items-center justify-center active:bg-slate-50"
            onPress={() => router.navigate('/search')}
          >
            <View className="bg-emerald-100 p-4 rounded-full mb-4">
              <IconSymbol name="map.fill" size={32} color="#10B981" />
            </View>
            <Text className="text-slate-800 text-xl font-bold mb-2 text-center">Aucune balade prévue</Text>
            <Text className="text-slate-500 text-center px-4">
              Découvrez les parcours autour de vous et lancez-vous dans la nature !
            </Text>
          </Pressable>
        )}
      </View>

      {/* 3. Sélections LPO (Découverte) */}
      <View>
        <View className="px-6 flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-slate-800">Coups de cœur de la région</Text>
          <Pressable onPress={() => router.navigate('/search')}>
            <Text className="text-emerald-600 font-semibold">Voir tout</Text>
          </Pressable>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
        >
          {SELECTIONS.map((item) => (
            <Pressable 
              key={item.id}
              className="w-64 bg-white rounded-3xl shadow-sm overflow-hidden active:opacity-90"
              onPress={() => router.navigate('/search')}
            >
              <Image 
                source={{ uri: item.image }} 
                className="w-full h-32"
                resizeMode="cover"
              />
              <View className="p-4 flex-row justify-between items-center">
                <Text className="text-slate-800 font-bold flex-1 text-base" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text className="text-2xl ml-2">{item.mascot}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 4. La Vie de la Communauté (Social) */}
      <View className="mt-8 mb-4">
        <View className="px-6 flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-slate-800">La Vie de la Communauté</Text>
          <Pressable>
            <Text className="text-emerald-600 font-semibold">Voir tout</Text>
          </Pressable>
        </View>

        <View className="px-6 gap-4">
          {COMMUNITY_FEED.map((item) => (
            <View key={item.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <View className="flex-row items-center mb-3">
                <Image source={{ uri: item.avatar }} className="w-10 h-10 rounded-full mr-3" />
                <View className="flex-1">
                  <Text className="font-bold text-slate-800">{item.user}</Text>
                  <Text className="text-xs text-slate-500">{item.timeAgo} • {item.parcours}</Text>
                </View>
                <View className="bg-amber-100 px-2 py-1 rounded-lg flex-row items-center">
                  <IconSymbol name="star.fill" size={12} color="#D97706" />
                  <Text className="text-amber-700 font-bold text-xs ml-1">{item.rating}</Text>
                </View>
              </View>
              <Text className="text-slate-600 text-sm leading-5">"{item.comment}"</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
