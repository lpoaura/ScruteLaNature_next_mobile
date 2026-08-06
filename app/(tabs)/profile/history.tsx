import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Trophy, MapPin, Trash2 } from 'lucide-react-native';
import { HistoryService } from '@/src/services/history.service';
import { useAuthStore } from '@/src/store/auth.store';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { resolveMediaUrl, getLocalCoverImage } from '@/src/services/filesystem.service';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const isGuest = useAuthStore((state: any) => state.isGuest);

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await HistoryService.getHistory(isGuest);
        // Trier par date décroissante
        const sortedData = data.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        setHistory(sortedData);
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [isGuest]);

  const handleDelete = async (syncId: string, parcoursId: string) => {
    try {
      await HistoryService.deleteHistoryItem(syncId, isGuest);
      setHistory(prev => prev.filter(item => item.syncId !== syncId));
    } catch (e) {
      console.error("Failed to delete history item", e);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const hasParcoursData = !!item.parcours;
    
    // On affiche le titre du parcours s'il est dispo (backend ou jointure locale SQLite)
    const title = hasParcoursData ? item.parcours.title : `Parcours ${item.parcoursId.substring(0, 8)}`;
    const score = item.score;
    const date = new Date(item.completedAt).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    
    // Détermination de l'image (marche pour les URLs web et les URIs locales file://)
    const coverUrl = hasParcoursData && item.parcours.coverImage
      ? resolveMediaUrl(item.parcours.coverImage)
      : undefined;

    return (
      <Pressable 
        onPress={() => router.push(`/parcours/${item.parcoursId}`)}
        style={[styles.card, isDark && styles.darkCard]}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImagePlaceholder, isDark && styles.darkCardImagePlaceholder]}>
            <MapPin size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </View>
        )}
        
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, isDark && styles.darkText]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.cardDate, isDark && styles.darkTextMuted]}>{date}</Text>
          
          <View style={styles.cardStats}>
            <View style={styles.statBadge}>
              <Trophy size={14} color="#fbbf24" style={styles.statIcon} />
              <Text style={styles.statText}>{score} pts</Text>
            </View>
          </View>
        </View>

        <Pressable 
          onPress={() => handleDelete(item.syncId, item.parcoursId)}
          style={styles.deleteButton}
        >
          <Trash2 size={20} color="#EF4444" />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={isDark ? '#F8FAFC' : '#141B20'} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Mon Historique</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0087CC" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centerContainer}>
          <Clock size={48} color={isDark ? '#4B5563' : '#9CA3AF'} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, isDark && styles.darkText]}>Aucun parcours terminé pour le moment.</Text>
          <Text style={[styles.emptySubtext, isDark && styles.darkTextMuted]}>
            Lancez-vous dans l'aventure pour commencer à remplir votre historique !
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.syncId || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  darkContainer: {
    backgroundColor: '#0A0E11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#141B20',
  },
  darkText: {
    color: '#F8FAFC',
  },
  darkTextMuted: {
    color: '#94A3B8',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#141B20',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#141B20',
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  cardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkCardImagePlaceholder: {
    backgroundColor: '#202C35',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#141B20',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statIcon: {
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
