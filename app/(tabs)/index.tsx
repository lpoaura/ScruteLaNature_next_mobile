import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import * as Location from 'expo-location';
import { useAuthStore } from '@/src/store/auth.store';
import { useGameStore } from '@/src/store/game.store';
import { useDownloadedParcours } from '@/src/hooks/use-downloaded-parcours';
import { IconSymbol } from '@/src/components/ui/icon-symbol';
import { TabletWrapper } from '@/src/components/layout/TabletWrapper';
import { parcoursService } from '@/src/services/parcours.service';
import { syncAnecdotes, getRandomAnecdote } from '@/src/services/anecdotes.service';
import type { Parcours, CommunityReview } from '@/src/types/api.types';
import type { AnecdoteSQLite } from '@/src/services/database.service';
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { useNetInfo } from '@react-native-community/netinfo';
import { socialService } from '@/src/services/social.service';

export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'À l\'instant';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `Il y a ${diffInDays} j`;
  return `Il y a ${Math.floor(diffInDays / 30)} mois`;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const activeParcoursId = useGameStore((state) => state.activeParcoursId);
  const currentEtapeOrder = useGameStore((state) => state.currentEtapeOrder);
  const downloadedParcoursIds = useGameStore((state) => state.downloadedParcoursIds);
  const { data: downloadedData } = useDownloadedParcours();
  const netInfo = useNetInfo();

  // Indicateur dynamique basé sur la connexion réelle
  const isOnline = netInfo.isConnected && netInfo.isInternetReachable !== false;

  const [coupsDeCoeur, setCoupsDeCoeur] = useState<Parcours[]>([]);
  const [loadingCoupsDeCoeur, setLoadingCoupsDeCoeur] = useState(true);

  const [anecdote, setAnecdote] = useState<AnecdoteSQLite | null>(null);

  const [communityFeed, setCommunityFeed] = useState<CommunityReview[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const refreshProfile = useAuthStore((state: any) => state.refreshProfile);

  // Attendre que l'auth soit chargée depuis le stockage sécurisé avant tout appel API
  useEffect(() => {
    if (!isInitialized) return;
    refreshProfile();
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const fetchFeed = async () => {
      try {
        setLoadingFeed(true);
        const data = await socialService.getCommunityFeed();
        setCommunityFeed(data);
      } catch (err) {
        console.error('Erreur chargement communauté', err);
      } finally {
        setLoadingFeed(false);
      }
    };
    if (isOnline) {
      fetchFeed();
    } else {
      setLoadingFeed(false);
    }
  }, [isOnline, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const initAnecdotes = async () => {
      // 1. Lancer la synchro en arrière-plan (sans bloquer l'UI)
      syncAnecdotes().then(async () => {
        // 2. Mettre à jour l'anecdote si on a récupéré de nouvelles données
        const random = await getRandomAnecdote();
        if (random) setAnecdote(random);
      });
      
      // 3. Afficher immédiatement une anecdote locale si dispo
      const local = await getRandomAnecdote();
      if (local) setAnecdote(local);
    };
    initAnecdotes();
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const fetchCoupsDeCoeur = async () => {
      try {
        setLoadingCoupsDeCoeur(true);
        let lat = 46.2276; // Centre de la France par défaut
        let lng = 2.2137;
        
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let location = await Location.getLastKnownPositionAsync();
            if (!location) {
              // Timeout after 2 seconds to avoid blocking the UI forever
              location = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
              ]);
            }
            if (location) {
              lat = location.coords.latitude;
              lng = location.coords.longitude;
            }
          }
        } catch (locationErr) {
          // Silencing the warning to avoid spamming the console when GPS is disabled
        }
        
        const data = await parcoursService.getNearby({ lat, lng, radius: 500000, isCoupDeCoeur: true });
        setCoupsDeCoeur(data);
      } catch (err) {
        console.error('Erreur chargement coups de coeur', err);
      } finally {
        setLoadingCoupsDeCoeur(false);
      }
    };
    fetchCoupsDeCoeur();
  }, [isInitialized]);

  const activeParcours = downloadedData.find(d => d.parcours.id === activeParcoursId)?.parcours;

  return (
    <ScrollView 
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120, alignItems: 'center' }}
      showsVerticalScrollIndicator={false}
    >
      <TabletWrapper maxWidth={768}>
        {/* 1. En-tête (Personnalisation & Statut) */}
        <View className="px-6 mb-8 flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            Bonjour {user?.pseudo || 'Aventurier'} 👋
          </Text>
          <View className="flex-row items-center mt-3">
            <View className="bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1.5 rounded-full flex-row items-center mr-3 shadow-sm">
              <IconSymbol name="star.fill" size={16} color="#007E84" />
              <Text className="text-emerald-700 dark:text-emerald-300 font-bold ml-1.5 text-sm">
                Niveau {user?.level || 1}
              </Text>
            </View>
            <View className="bg-amber-100 dark:bg-amber-900/50 px-3 py-1.5 rounded-full flex-row items-center shadow-sm">
              <Text className="text-amber-700 dark:text-amber-300 font-bold text-sm">
                {user?.totalPoints || 0} pts
              </Text>
            </View>
          </View>
        </View>
        
        {/* Indicateur de connexion */}
        <View className="items-center ml-4">
          <View className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-sm mb-1">
            {isOnline ? (
              <IconSymbol name="wifi" size={20} color="#007E84" />
            ) : (
              <IconSymbol name="wifi.slash" size={20} color="#EF4444" />
            )}
          </View>
          <Text className={`text-[10px] font-bold ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </Text>
        </View>
      </View>

      {/* Bulle Nature (Le saviez-vous ?) */}
      {anecdote && (
        <View className="px-6 mb-8">
          <View className="bg-emerald-50 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-3xl p-5 flex-row items-center shadow-sm">
            <View className="bg-emerald-200/50 dark:bg-emerald-900/50 p-3 rounded-full mr-4 overflow-hidden h-14 w-14 flex items-center justify-center">
              {anecdote.imageUrl ? (
                <Image source={{ uri: anecdote.imageUrl }} className="w-full h-full" resizeMode="contain" />
              ) : (
                <IconSymbol name="leaf.fill" size={24} color="#059669" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-emerald-900 dark:text-emerald-100 font-bold mb-1">Le saviez-vous ?</Text>
              <Text className="text-emerald-800 dark:text-emerald-200 text-sm leading-5">
                {anecdote.content}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 2. Action Immédiate (Call to Action dynamique) */}
      <View className="px-6 mb-10">
        <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Prêt pour l'aventure ?</Text>
        
        {activeParcoursId ? (
          <Link href={`/parcours/${activeParcoursId}`} asChild>
            <Pressable 
              className="bg-emerald-600 rounded-3xl p-6 shadow-md flex-row items-center justify-between active:opacity-90"
            >
              <View className="flex-1 mr-4">
                <Text className="text-emerald-100 font-medium mb-1">Balade en cours</Text>
                <Text className="text-white text-2xl font-bold mb-2" numberOfLines={2}>
                  {activeParcours ? activeParcours.title : 'Reprendre ma balade'}
                </Text>
                <Text className="text-emerald-50 text-sm font-medium">Étape {currentEtapeOrder}</Text>
              </View>
              <View className="bg-white/20 p-4 rounded-full">
                <IconSymbol name="play.fill" size={32} color="#fff" />
              </View>
            </Pressable>
          </Link>
        ) : downloadedData.length > 0 ? (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-xs">Vos téléchargements</Text>
              <Link href="/(tabs)/profile/downloads" asChild>
                <Pressable><Text className="text-emerald-600 font-semibold text-sm">Gérer</Text></Pressable>
              </Link>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {downloadedData.map((item) => (
                <Link key={item.parcours.id} href={`/parcours/${item.parcours.id}`} asChild>
                  <Pressable className="bg-indigo-600 rounded-3xl p-5 shadow-md flex-row items-center w-72 active:opacity-90">
                    <View className="flex-1 mr-3">
                      <Text className="text-white text-lg font-bold mb-1" numberOfLines={1}>{item.parcours.title}</Text>
                      <View className="flex-row items-center">
                        <IconSymbol name="download" size={14} color="#e0e7ff" />
                        <Text className="text-indigo-100 text-xs font-medium ml-1">
                          {item.sizeFormatted}
                        </Text>
                      </View>
                      {item.hasUpdate && (
                        <View className="bg-amber-400/20 px-2 py-0.5 rounded-md self-start mt-1.5 border border-amber-400/30">
                          <Text className="text-amber-100 text-[10px] font-bold">⚠️ Mise à jour dispo</Text>
                        </View>
                      )}
                    </View>
                    <View className="bg-white/20 p-3 rounded-full">
                      <IconSymbol name="play.fill" size={24} color="#fff" />
                    </View>
                  </Pressable>
                </Link>
              ))}
            </ScrollView>
          </View>
        ) : (
          <Link href="/(tabs)/search" asChild>
            <Pressable 
              className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 items-center justify-center active:bg-slate-50 dark:active:bg-slate-700"
            >
              <View className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-full mb-4">
                <IconSymbol name="map.fill" size={32} color="#007E84" />
              </View>
              <Text className="text-slate-800 dark:text-slate-100 text-xl font-bold mb-2 text-center">Aucune balade prévue</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center px-4">
                Découvrez les parcours autour de vous et lancez-vous dans la nature !
              </Text>
            </Pressable>
          </Link>
        )}
      </View>

      {/* 3. Sélections LPO (Découverte) */}
      <View>
        <View className="px-6 flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Coups de cœur de la région</Text>
          <Link href="/(tabs)/search" asChild>
            <Pressable>
              <Text className="text-emerald-600 font-semibold">Voir tout</Text>
            </Pressable>
          </Link>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
        >
          {loadingCoupsDeCoeur ? (
            <ActivityIndicator size="small" color="#007E84" />
          ) : coupsDeCoeur.length > 0 ? (
            coupsDeCoeur.map((item) => (
              <Link key={item.id} href={`/parcours/${item.id}`} asChild>
                <Pressable 
                  className="w-64 bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden active:opacity-90"
                >
                  {item.coverImage ? (
                    <Image 
                      source={{ uri: resolveMediaUrl(item.coverImage) }} 
                      className="w-full h-32"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-32 bg-emerald-800/20 items-center justify-center">
                      <IconSymbol name="leaf.fill" size={32} color="#059669" />
                    </View>
                  )}
                  <View className="p-4 flex-row justify-between items-center">
                    <Text className="text-slate-800 dark:text-slate-100 font-bold flex-1 text-base" numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))
          ) : (
            <Text className="text-slate-500">Aucun coup de cœur trouvé.</Text>
          )}
        </ScrollView>
      </View>

      {/* 4. La Vie de la Communauté (Social) */}
      <View className="mt-8 mb-4">
        <View className="px-6 flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">La Vie de la Communauté</Text>
          <Pressable>
            <Text className="text-emerald-600 font-semibold">Voir tout</Text>
          </Pressable>
        </View>

        <View className="px-6 gap-4">
          {loadingFeed ? (
            <ActivityIndicator size="small" color="#007E84" />
          ) : communityFeed.length > 0 ? (
            communityFeed.map((item) => (
              <View key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full mr-3 bg-emerald-100 dark:bg-emerald-900/50 items-center justify-center">
                    <Text className="text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                      {item.user.pseudo ? item.user.pseudo.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-slate-800 dark:text-slate-100">{item.user.pseudo || 'Anonyme'}</Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                      {getTimeAgo(item.createdAt)} • {item.parcours.zonage?.nom ? `${item.parcours.zonage.nom} — ` : ''}{item.parcours.title}
                    </Text>
                  </View>
                  <View className="bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded-lg flex-row items-center">
                    <IconSymbol name="star.fill" size={12} color="#D97706" />
                    <Text className="text-amber-700 dark:text-amber-300 font-bold text-xs ml-1">{item.rating}</Text>
                  </View>
                </View>
                {item.comment && (
                  <Text className="text-slate-600 dark:text-slate-300 text-sm leading-5">"{item.comment}"</Text>
                )}
              </View>
            ))
          ) : (
            <View className="bg-white dark:bg-slate-800 p-6 rounded-3xl items-center shadow-sm">
              <IconSymbol name="person.2.badge" size={32} color="#007E84" />
              <Text className="text-slate-500 dark:text-slate-400 mt-2 text-center">Aucun avis récent.</Text>
            </View>
          )}
        </View>
      </View>
      </TabletWrapper>
    </ScrollView>
  );
}
