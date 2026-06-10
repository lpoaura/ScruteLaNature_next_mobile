import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import type { Parcours } from '@/src/types/api.types';

const GREEN = '#2D6A4F';
const GREEN_LIGHT = '#E8F5E9';

interface ParcoursCardProps {
  parcours: Parcours;
  isDownloaded?: boolean;
}

const DIFFICULTY_CONFIG = {
  FACILE: { label: 'Facile', color: '#2E7D32', bg: '#E8F5E9' },
  MOYEN: { label: 'Moyen', color: '#F57F17', bg: '#FFF8E1' },
  DIFFICILE: { label: 'Difficile', color: '#B71C1C', bg: '#FFEBEE' },
} as const;

export function ParcoursCard({ parcours, isDownloaded = false }: ParcoursCardProps) {
  const router = useRouter();
  const diff = parcours.difficulty ? DIFFICULTY_CONFIG[parcours.difficulty] : null;

  const accessibilityIcons = [
    parcours.isPMRFriendly && '♿',
    parcours.isChildFriendly && '👶',
    parcours.isMentalHandicapFriendly && '🧩',
  ].filter(Boolean);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/parcours/[id]', params: { id: parcours.id } })}
    >
      {/* Image de couverture */}
      <View style={styles.imageContainer}>
        {parcours.coverImage ? (
          <Image
            source={{ uri: parcours.coverImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>🌲</Text>
          </View>
        )}

        {/* Badge difficulté */}
        {diff && (
          <View style={[styles.difficultyBadge, { backgroundColor: diff.bg }]}>
            <Text style={[styles.difficultyText, { color: diff.color }]}>{diff.label}</Text>
          </View>
        )}

        {/* Indicateur téléchargé */}
        {isDownloaded && (
          <View style={styles.downloadedBadge}>
            <Text style={styles.downloadedIcon}>✓</Text>
          </View>
        )}
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{parcours.title}</Text>

        {/* Distance + Durée */}
        <View style={styles.metaRow}>
          {parcours.distanceKm != null && (
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>{parcours.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
          {parcours.durationMin != null && (
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>⏱</Text>
              <Text style={styles.metaText}>{parcours.durationMin} min</Text>
            </View>
          )}
        </View>

        {/* Accessibilité */}
        {accessibilityIcons.length > 0 && (
          <View style={styles.accessRow}>
            {accessibilityIcons.map((icon, i) => (
              <Text key={i} style={styles.accessIcon}>{icon}</Text>
            ))}
          </View>
        )}

        {/* Mascotte */}
        {parcours.mascotteNom && (
          <Text style={styles.mascotte}>🐾 {parcours.mascotteNom}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  imageContainer: { height: 160, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: { fontSize: 48 },
  difficultyBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  difficultyText: { fontSize: 12, fontWeight: '700' },
  downloadedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadedIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  content: { padding: 14, gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111', lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaIcon: { fontSize: 12 },
  metaText: { fontSize: 12, color: '#555', fontWeight: '500' },
  accessRow: { flexDirection: 'row', gap: 6 },
  accessIcon: { fontSize: 16 },
  mascotte: { fontSize: 12, color: GREEN, fontWeight: '500' },
});
