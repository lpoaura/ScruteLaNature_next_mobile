import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDownloadedParcours } from '@/src/hooks/use-downloaded-parcours';
import { parcoursService } from '@/src/services/parcours.service';
import { useGameStore } from '@/src/store/game.store';
import { ChevronLeft, Inbox, Image as ImageIcon, RefreshCw, Trash2, AlertCircle } from 'lucide-react-native';
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { TabletWrapper } from '@/src/components/layout/TabletWrapper';
import { useState } from 'react';

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: downloadedData, isLoading, refresh } = useDownloadedParcours();
  const removeParcours = useGameStore((state) => state.removeParcours);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Supprimer ce parcours ?',
      `Voulez-vous vraiment supprimer "${title}" de vos téléchargements ? Cela libérera de l'espace sur votre téléphone.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(id);
              await parcoursService.deleteLocal(id);
              removeParcours(id);
              // refresh() sera appelé automatiquement grâce à l'abonnement dans useDownloadedParcours
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer le parcours.');
            } finally {
              setIsDeleting(null);
            }
          }
        }
      ]
    );
  };

  const handleUpdate = async (id: string) => {
    try {
      setIsUpdating(id);
      await parcoursService.download(id);
      await refresh();
      Alert.alert('Succès', 'Le parcours a été mis à jour avec la dernière version.');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le parcours.');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900" style={{ paddingTop: insets.top }}>
      {/* HEADER */}
      <View className="px-4 py-4 flex-row items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Pressable onPress={() => router.back()} className="p-2 mr-2">
          <ChevronLeft size={24} color="#64748B" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 flex-1">
          Mes téléchargements
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <TabletWrapper maxWidth={768}>
          {isLoading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#007E84" />
              <Text className="text-slate-500 mt-4">Chargement de vos parcours...</Text>
            </View>
          ) : downloadedData.length === 0 ? (
            <View className="items-center justify-center py-20 px-8">
              <View className="bg-emerald-100 dark:bg-emerald-900/50 p-6 rounded-full mb-6">
                <Inbox size={48} color="#007E84" />
              </View>
              <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
                Aucun parcours téléchargé
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center">
                Téléchargez des parcours depuis la carte pour pouvoir les jouer sans connexion internet.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {downloadedData.map((item) => (
                <View 
                  key={item.parcours.id} 
                  className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex-row items-center"
                >
                  <View className="bg-slate-100 dark:bg-slate-700 w-16 h-16 rounded-2xl mr-4 overflow-hidden">
                    {item.localCoverImage || item.parcours.coverImage ? (
                      <Image 
                        source={{ uri: item.localCoverImage || (item.parcours.coverImage ? resolveMediaUrl(item.parcours.coverImage) : undefined) }} 
                        className="w-full h-full" 
                        onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <ImageIcon size={24} color="#94A3B8" />
                      </View>
                    )}
                  </View>

                  <View className="flex-1 mr-2">
                    <Text className="text-slate-800 dark:text-slate-100 font-bold mb-1" numberOfLines={2}>
                      {item.parcours.title}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        Taille : {item.sizeFormatted}
                      </Text>
                    </View>
                    
                    {item.hasUpdate && (
                      <View className="flex-row items-center mt-1">
                        <AlertCircle size={14} color="#F59E0B" />
                        <Text className="text-amber-600 dark:text-amber-400 text-xs font-bold ml-1">
                          Mise à jour disponible
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center gap-2">
                    {item.hasUpdate && (
                      <Pressable 
                        onPress={() => handleUpdate(item.parcours.id)}
                        disabled={isUpdating === item.parcours.id}
                        className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-full"
                      >
                        {isUpdating === item.parcours.id ? (
                          <ActivityIndicator size="small" color="#007E84" />
                        ) : (
                          <RefreshCw size={20} color="#007E84" />
                        )}
                      </Pressable>
                    )}
                    
                    <Pressable 
                      onPress={() => handleDelete(item.parcours.id, item.parcours.title)}
                      disabled={isDeleting === item.parcours.id}
                      className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full"
                    >
                      {isDeleting === item.parcours.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Trash2 size={20} color="#EF4444" />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </TabletWrapper>
      </ScrollView>
    </View>
  );
}
