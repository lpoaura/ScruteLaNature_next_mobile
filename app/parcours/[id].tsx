import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/src/services/api.service';
import { DownloadButton } from '@/src/components/features/parcours/DownloadButton';
import type { Parcours } from '@/src/types/api.types';

const GREEN = '#2D6A4F';

const DIFFICULTY_CONFIG = {
  FACILE: { label: 'Facile', color: '#2E7D32', bg: '#E8F5E9', icon: '🟢' },
  MOYEN: { label: 'Moyen', color: '#F57F17', bg: '#FFF8E1', icon: '🟡' },
  DIFFICILE: { label: 'Difficile', color: '#B71C1C', bg: '#FFEBEE', icon: '🔴' },
} as const;

export default function ParcoursDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadParcours(id);
  }, [id]);

  const loadParcours = async (parcoursId: string) => {
    try {
      setLoading(true);
      const data = await apiService.get<Parcours>(`/mobile/parcours/${parcoursId}`);
      setParcours(data);
    } catch {
      setError('Impossible de charger ce parcours.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    // Sprint 3 : navigation vers le gameplay
    Alert.alert('Bientôt disponible', 'Le mode de jeu arrivera dans la prochaine mise à jour !');
  };

  const diff = parcours?.difficulty ? DIFFICULTY_CONFIG[parcours.difficulty] : null;

  // ─── Chargement ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  // ─── Erreur ──────────────────────────────────────────────────────────────
  if (error || !parcours) {
    return (
      <View style={[styles.errorScreen, { paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorTitle}>Parcours introuvable</Text>
        <Text style={styles.errorSub}>{error ?? 'Une erreur est survenue.'}</Text>
        <Pressable style={styles.retryBtn} onPress={() => id && loadParcours(id)}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const accessItems = [
    { icon: '♿', label: 'Accessible PMR', active: parcours.isPMRFriendly },
    { icon: '👶', label: 'Famille / Enfants', active: parcours.isChildFriendly },
    { icon: '🧩', label: 'Handicap mental', active: parcours.isMentalHandicapFriendly },
  ].filter((a) => a.active);

  // ─── Rendu principal ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Image héro ─────────────────────────────────────────────────── */}
        <View style={styles.heroContainer}>
          {parcours.coverImage ? (
            <Image source={{ uri: parcours.coverImage }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderIcon}>🌲</Text>
            </View>
          )}

          {/* Overlay gradient simulé */}
          <View style={styles.heroOverlay} />

          {/* Bouton retour */}
          <Pressable
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          {/* Titre sur l'image */}
          <View style={[styles.heroTitleContainer, { paddingBottom: insets.bottom > 0 ? 0 : 20 }]}>
            {diff && (
              <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
                <Text style={styles.diffIcon}>{diff.icon}</Text>
                <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
              </View>
            )}
            <Text style={styles.heroTitle}>{parcours.title}</Text>
          </View>
        </View>

        {/* ── Corps ─────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Méta : distance, durée */}
          <View style={styles.metaRow}>
            {parcours.distanceKm != null && (
              <View style={styles.metaCard}>
                <Text style={styles.metaCardIcon}>📍</Text>
                <Text style={styles.metaCardValue}>{parcours.distanceKm.toFixed(1)} km</Text>
                <Text style={styles.metaCardLabel}>Distance</Text>
              </View>
            )}
            {parcours.durationMin != null && (
              <View style={styles.metaCard}>
                <Text style={styles.metaCardIcon}>⏱</Text>
                <Text style={styles.metaCardValue}>{parcours.durationMin} min</Text>
                <Text style={styles.metaCardLabel}>Durée estimée</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {parcours.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.description}>{parcours.description}</Text>
            </View>
          )}

          {/* Mascotte */}
          {parcours.mascotteNom && (
            <View style={styles.mascotteCard}>
              {parcours.mascotteImg ? (
                <Image source={{ uri: parcours.mascotteImg }} style={styles.mascotteImg} resizeMode="contain" />
              ) : (
                <View style={styles.mascotteImgPlaceholder}>
                  <Text style={{ fontSize: 40 }}>🐾</Text>
                </View>
              )}
              <View style={styles.mascotteInfo}>
                <Text style={styles.mascotteLabel}>Votre guide</Text>
                <Text style={styles.mascotteName}>{parcours.mascotteNom}</Text>
                <Text style={styles.mascotteDesc}>M'accompagnera tout au long de la balade</Text>
              </View>
            </View>
          )}

          {/* Accessibilité */}
          {accessItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accessibilité</Text>
              <View style={styles.accessGrid}>
                {accessItems.map((a) => (
                  <View key={a.icon} style={styles.accessChip}>
                    <Text style={styles.accessChipIcon}>{a.icon}</Text>
                    <Text style={styles.accessChipLabel}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ─── Téléchargement / Jouer ─────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mode hors-ligne</Text>
            {id && (
              <DownloadButton
                parcoursId={id}
                onPlay={handlePlay}
                onDownloaded={() => {/* optionnel: rafraîchir l'état parent */}}
              />
            )}
          </View>

          {/* Note légale */}
          <Text style={styles.legalNote}>
            📶 Le téléchargement nécessite une connexion. Une fois téléchargé, jouez partout sans réseau.
          </Text>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF8' },
  scrollContent: { paddingBottom: 120 },

  // Chargement / Erreur
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAF8' },
  loadingText: { fontSize: 16, color: '#888' },
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: '#F8FAF8' },
  errorIcon: { fontSize: 56 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  errorSub: { fontSize: 14, color: '#888', textAlign: 'center' },
  retryBtn: { backgroundColor: GREEN, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Héro
  heroContainer: { height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, backgroundColor: '#C8E6C9', alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderIcon: { fontSize: 80 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Bouton retour
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // Titre héro
  heroTitleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 8,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  diffIcon: { fontSize: 12 },
  diffText: { fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32, letterSpacing: -0.3 },

  // Corps
  body: { padding: 20, gap: 24 },

  // Méta
  metaRow: { flexDirection: 'row', gap: 12 },
  metaCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metaCardIcon: { fontSize: 24 },
  metaCardValue: { fontSize: 18, fontWeight: '800', color: '#111' },
  metaCardLabel: { fontSize: 11, color: '#999', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Sections
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  description: { fontSize: 15, color: '#555', lineHeight: 24 },

  // Mascotte
  mascotteCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mascotteImg: { width: 100, height: 100 },
  mascotteImgPlaceholder: { width: 100, height: 100, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  mascotteInfo: { flex: 1, padding: 16, justifyContent: 'center', gap: 4 },
  mascotteLabel: { fontSize: 11, color: GREEN, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  mascotteName: { fontSize: 18, fontWeight: '800', color: '#111' },
  mascotteDesc: { fontSize: 13, color: '#777' },

  // Accessibilité
  accessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accessChipIcon: { fontSize: 16 },
  accessChipLabel: { fontSize: 13, color: GREEN, fontWeight: '600' },

  // Note légale
  legalNote: { fontSize: 12, color: '#AAA', textAlign: 'center', lineHeight: 18 },
});
