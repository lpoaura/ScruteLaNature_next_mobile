import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/src/services/api.service';
import { DownloadButton } from '@/src/components/features/parcours/DownloadButton';
import { useGameStore } from '@/src/store/game.store';
import { useAuthStore } from '@/src/store/auth.store';
import { useSettingsStore } from '@/src/store/settings.store';
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import type { Parcours, Etape } from '@/src/types/api.types';
import { TabletWrapper } from '@/src/components/layout/TabletWrapper';
import InviteFriendModal from '@/src/components/social/InviteFriendModal';
import Markdown from 'react-native-markdown-display';

// ─── Constantes ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 340;
const GREEN = '#0087CC';
const GREEN_LIGHT = '#D8E8C5';
const GREEN_MID = '#52B788';

const DIFFICULTY_CONFIG = {
  FACILE: { label: 'Facile', color: '#1B5E20', bg: '#DCEDC8', dot: '#4CAF50' },
  MOYEN:  { label: 'Moyen',  color: '#E65100', bg: '#FFF3E0', dot: '#FF9800' },
  DIFFICILE: { label: 'Difficile', color: '#B71C1C', bg: '#FFEBEE', dot: '#F44336' },
} as const;

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface ParcoursWithEtapes extends Parcours {
  etapes?: Etape[];
  _count?: { reviews?: number };
  averageRating?: number;
}

// ─── Composant EtapeRow ───────────────────────────────────────────────────────

function EtapeRow({
  etape,
  index,
  total,
}: {
  etape: Etape;
  index: number;
  total: number;
}) {
  const isLast = index === total - 1;
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';


  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={styles.etapeRow}
    >
      {/* Ligne verticale + numéro */}
      <View style={styles.etapeIndicator}>
        <View style={styles.etapeNumberBubble}>
          <Text style={styles.etapeNumber}>{index + 1}</Text>
        </View>
        {!isLast && <View style={styles.etapeLine} />}
      </View>

      {/* Contenu */}
      <View style={[styles.etapeContent, isLast && { marginBottom: 0 }, isDark && styles.darkEtapeContent]}>
        <Text style={[styles.etapeTitle, isDark && styles.darkText]} numberOfLines={2}>
          {etape.title}
        </Text>
        {etape.jeux && etape.jeux.length > 0 && (
          <View style={styles.etapeJeuxRow}>
            <Ionicons name="game-controller-outline" size={13} color="#9E9E9E" />
            <Text style={styles.etapeJeuxCount}>
              {etape.jeux.length} jeu{etape.jeux.length > 1 ? 'x' : ''}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Composant StatCard ───────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  delay = 0,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  delay?: number;
  isDark: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[styles.statCardPremium, isDark && styles.darkStatCardPremium]}
    >
      <View style={[styles.statIconBadge, isDark && styles.darkStatIconBadge]}>
        <Ionicons name={icon} size={20} color={isDark ? '#34D399' : '#059669'} />
      </View>
      <Text style={[styles.statValuePremium, isDark && styles.darkText]}>{value}</Text>
      <Text style={[styles.statLabelPremium, isDark && styles.darkTextMuted]}>{label}</Text>
    </Animated.View>
  );
}



// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ParcoursDetailScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string, preview?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [parcours, setParcours] = useState<ParcoursWithEtapes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Authentification
  const isGuest = useAuthStore((state) => state.isGuest);
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';

  const downloadedParcoursIds = useGameStore((state) => state.downloadedParcoursIds);
  const activeParcoursId = useGameStore((state) => state.activeParcoursId);
  const startParcours = useGameStore((state) => state.startParcours);
  const addDownloaded = useGameStore((state) => state.downloadParcours);
  const currentEtapeOrder = useGameStore((state) => state.currentEtapeOrder);
  const completedParcoursIds = useGameStore((state) => state.completedParcoursIds);
  const isDownloaded = id ? downloadedParcoursIds.includes(id) : false;
  const isActive = id ? activeParcoursId === id : false;
  const isCompleted = id ? completedParcoursIds.includes(id) : false;

  // Animation de scroll pour l'effet parallax hero
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Styles animés
  const heroImageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0, HERO_HEIGHT],
          [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.4],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const heroOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, HERO_HEIGHT * 0.5],
      [0.35, 0.75],
      Extrapolation.CLAMP
    ),
  }));

  const navBarStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(45,106,79,${interpolate(
      scrollY.value,
      [HERO_HEIGHT - 100, HERO_HEIGHT - 50],
      [0, 1],
      Extrapolation.CLAMP
    )})`,
  }));

  const titleBarOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT - 100, HERO_HEIGHT - 40],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Chargement
  useEffect(() => {
    if (id) loadParcours(id);
  }, [id]);

  const loadParcours = async (parcoursId: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = preview === 'true' 
        ? `/mobile/parcours/${parcoursId}/preview` 
        : `/mobile/parcours/${parcoursId}/download`;
      const data = await apiService.get<ParcoursWithEtapes>(url);
      setParcours(data);
    } catch {
      setError('Impossible de charger ce parcours.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = useCallback(() => {
    if (!id || !parcours) return;
    
    const startGame = (mode: 'normal' | 'escape') => {
      startParcours(id);
      router.push({ pathname: '/parcours/jeu/[id]', params: { id, preview, mode } });
    };

    if ((parcours as any).isEscapeGame) {
      Alert.alert(
        "Mode de jeu",
        "Voulez-vous jouer en mode Escape Game (chronométré) ou en mode Balade Normale (libre) ?",
        [
          { text: "Balade Normale", onPress: () => startGame('normal'), style: "cancel" },
          { text: "Escape Game", onPress: () => startGame('escape') }
        ]
      );
    } else {
      startGame('normal');
    }
  }, [id, preview, startParcours, router, parcours]);

  const handleDownloaded = useCallback(() => {
    if (id) addDownloaded(id);
  }, [id, addDownloaded]);

  // ─── États de chargement / erreur ─────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.loadingSpinner}>
          <Ionicons name="leaf-outline" size={32} color={GREEN} />
        </View>
        <Text style={styles.loadingText}>Chargement du parcours…</Text>
      </View>
    );
  }

  if (error || !parcours) {
    return (
      <View style={[styles.centeredScreen, { paddingTop: insets.top }]}>
        <Pressable
          style={[styles.floatingBackBtn, { top: insets.top + 12, backgroundColor: GREEN_LIGHT }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </Pressable>
        <Text style={{ fontSize: 56 }}>😕</Text>
        <Text style={styles.errorTitle}>Parcours introuvable</Text>
        <Text style={styles.errorSub}>{error ?? 'Une erreur est survenue.'}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => id && loadParcours(id)}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const diff = parcours.difficulty ? DIFFICULTY_CONFIG[parcours.difficulty] : null;
  const accessDiff = parcours.accessibility ? DIFFICULTY_CONFIG[parcours.accessibility] : null;
  const accessItems = [
    { icon: 'accessibility', label: 'PMR', active: parcours.isPMRFriendly, color: '#1565C0' },
    { icon: 'happy-outline', label: 'Familles', active: parcours.isChildFriendly, color: '#6A1B9A' },
    { icon: 'heart-outline', label: 'Inclusif', active: parcours.isMentalHandicapFriendly, color: '#AD1457' },
  ].filter((a) => a.active);

  const etapes = parcours.etapes ?? [];
  const nbJeux = etapes.reduce((acc, e) => acc + (e.jeux?.length ?? 0), 0);
  const hasRatings = (parcours.averageRating ?? 0) > 0;

  // Mode Chasse : on calcule le nombre d'étapes visibles
  const visibleEtapesCount = isCompleted
    ? etapes.length
    : isActive
    ? Math.max(1, currentEtapeOrder)
    : 1;

  const visibleEtapes = etapes.slice(0, visibleEtapesCount);
  const hiddenEtapesCount = etapes.length - visibleEtapesCount;

  // ─── Rendu principal ──────────────────────────────────────────────────────

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* ── Barre de navigation flottante (apparaît au scroll) ────────────── */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.stickyNav, { paddingTop: insets.top }, navBarStyle]}
      >
        <TabletWrapper maxWidth={768} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Animated.View style={titleBarOpacityStyle}>
            <Pressable style={styles.stickyBackBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </Animated.View>
          <Animated.Text style={[styles.stickyTitle, titleBarOpacityStyle]} numberOfLines={1}>
            {preview === 'true' ? '🚧 TEST :' : ''} {parcours.title}
          </Animated.Text>
          <View style={{ width: 40 }} />
        </TabletWrapper>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, alignItems: 'center' }}
      >
        <TabletWrapper maxWidth={768}>
        {/* ── Image hero avec parallax ─────────────────────────────────── */}
        <View style={styles.heroWrapper}>
          <Animated.View style={[styles.heroImageContainer, heroImageStyle]}>
            {parcours.coverImage ? (
              <Image
                source={{ uri: resolveMediaUrl(parcours.coverImage) }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={{ fontSize: 90 }}>🌿</Text>
              </View>
            )}
          </Animated.View>

          {/* Overlay gradient */}
          <Animated.View style={[styles.heroGradient, heroOverlayStyle]} />

          <Pressable
            style={[styles.floatingBackBtn, { top: insets.top + 12, left: 16 }]}
            onPress={() => router.back()}
          >
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          {/* Badge MODE TEST si actif */}
          {preview === 'true' && (
            <View style={[styles.floatingBackBtn, { top: insets.top + 12, right: 20, width: 'auto', paddingHorizontal: 12, backgroundColor: '#EF4444' }]}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>MODE TEST</Text>
            </View>
          )}

          {/* Badge difficulté + titre */}
          <View style={styles.heroBottom}>
            <BlurView intensity={isDark ? 50 : 30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
            <View style={styles.heroBottomContent}>
              <View style={styles.badgesRow}>
                {diff && (
                  <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
                    <Ionicons name="extension-puzzle" size={14} color={diff.color} />
                    <Text style={[styles.diffText, { color: diff.color }]}>
                      Énigmes : {diff.label}
                    </Text>
                  </View>
                )}
                {accessDiff && (
                  <View style={[styles.diffBadge, { backgroundColor: accessDiff.bg }]}>
                    <Ionicons name="walk" size={14} color={accessDiff.color} />
                    <Text style={[styles.diffText, { color: accessDiff.color }]}>
                      Terrain : {accessDiff.label}
                    </Text>
                  </View>
                )}
                {(parcours as any).isEscapeGame && (
                  <View style={[styles.diffBadge, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="lock-closed" size={14} color="#F59E0B" />
                    <Text style={[styles.diffText, { color: '#F59E0B' }]}>
                      Escape Game
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroTitle}>{parcours.title}</Text>
              {parcours.zonage && (
                <View style={styles.zonageRow}>
                  <Ionicons name="location" size={16} color={isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)"} />
                  <Text style={[styles.zonageText, isDark ? {color: 'rgba(255,255,255,0.9)'} : {color: 'rgba(0,0,0,0.8)'}]}>{parcours.zonage.nom}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Corps ───────────────────────────────────────────────────────── */}
        <View style={[styles.body, isDark && styles.darkBody]}>

          {/* Stats (distance / durée / étapes / jeux) */}
          <Animated.View entering={FadeInDown.springify()} style={styles.statsScrollWrapper}>
            <View style={styles.statsScrollContent}>
              {(parcours as any).isEscapeGame && (parcours as any).timeLimitMinutes != null ? (
                <StatCard icon="timer-outline" value={`${(parcours as any).timeLimitMinutes} min`} label="Temps Limite" delay={0} isDark={isDark} />
              ) : (
                parcours.durationMin != null && <StatCard icon="time" value={`${parcours.durationMin} min`} label="Durée" delay={0} isDark={isDark} />
              )}
              {parcours.distanceKm != null && <StatCard icon="navigate" value={`${parcours.distanceKm.toFixed(1)} km`} label="Distance" delay={60} isDark={isDark} />}
              {etapes.length > 0 && <StatCard icon="map" value={`${etapes.length}`} label="Étapes" delay={120} isDark={isDark} />}
              {hasRatings && <StatCard icon="star" value={parcours.averageRating!.toFixed(1)} label="Note" delay={240} isDark={isDark} />}
            </View>
          </Animated.View>

          {/* ── Section : À propos (Synopsis) ────────────────────────────── */}
          {parcours.description && (
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={[styles.aboutPanel, isDark && styles.darkActionPanel]}
            >
              <Markdown style={isDark ? darkMarkdownStyles : markdownStyles}>{parcours.description}</Markdown>
            </Animated.View>
          )}

          {/* ── Section : Télécharger / Jouer ──────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={[styles.actionPanel, isDark && styles.darkActionPanel]}
          >
            {id && (
              <DownloadButton
                parcoursId={id}
                onPlay={handlePlay}
                onDownloaded={handleDownloaded}
                isPreview={preview === 'true'}
              />
            )}

            {id && !isGuest && (
              <Pressable
                style={[styles.inviteButtonPremium, isDark && styles.darkInviteButtonPremium]}
                onPress={() => setShowInviteModal(true)}
              >
                <View style={styles.inviteButtonIconWrapper}>
                  <Ionicons name="people" size={20} color={GREEN} />
                </View>
                <Text style={[styles.inviteButtonTextPremium, isDark && styles.darkText]}>Inviter un ami au défi</Text>
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#94A3B8' : '#9CA3AF'} />
              </Pressable>
            )}

            <View style={styles.offlineNoteContainer}>
              <Ionicons name="cloud-offline" size={16} color={isDark ? '#64748B' : '#9CA3AF'} />
              <Text style={[styles.offlineNoteText, isDark && styles.darkTextMuted]}>
                Jouez partout, même sans réseau.
              </Text>
            </View>
          </Animated.View>

          {/* ── Section : Accessibilité ─────────────────────────────────── */}
          {accessItems.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={[styles.aboutPanel, isDark && styles.darkActionPanel]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconBadge}>
                  <Ionicons name="accessibility" size={20} color={GREEN} />
                </View>
                <Text style={[styles.sectionTitlePremium, isDark && styles.darkText]}>Accessibilité</Text>
              </View>
              <View style={styles.accessRow}>
                {accessItems.map((a) => (
                  <View key={a.label} style={[styles.accessChipPremium, isDark && { backgroundColor: `${a.color}20`, borderColor: `${a.color}40` }, !isDark && { backgroundColor: `${a.color}15`, borderColor: `${a.color}30` }]}>
                    <Ionicons name={a.icon as any} size={18} color={a.color} />
                    <Text style={[styles.accessChipLabelPremium, { color: a.color }]}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}



          {/* ── CTA final si déjà téléchargé ───────────────────────────── */}
          {isDownloaded && (
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              style={styles.ctaCard}
            >
              <View style={styles.ctaCardLeft}>
                <Text style={styles.ctaCardEmoji}>🎒</Text>
              </View>
              <View style={styles.ctaCardContent}>
                <Text style={styles.ctaCardTitle}>Prêt pour l'aventure !</Text>
                <Text style={styles.ctaCardSub}>
                  Ce parcours est disponible hors-ligne.
                </Text>
              </View>
            </Animated.View>
          )}

        </View>
        </TabletWrapper>
      </Animated.ScrollView>

      {/* ── Modale d'invitation ── */}
      {id && (
        <InviteFriendModal
          visible={showInviteModal}
          parcoursId={id}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* ── Header Flottant (apparaît au scroll) ── */}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },

  // ── Navigation flottante ──
  stickyNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  stickyBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stickyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 8,
  },

  // ── Hero ──
  heroWrapper: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImageContainer: {
    position: 'absolute',
    top: -HERO_HEIGHT * 0.4,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 1.8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  floatingBackBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  heroBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  heroBottomContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 56,
    gap: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 34,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  zonageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zonageText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // ── Corps ──
  body: {
    flex: 1,
    paddingTop: 0,
  },
  darkBody: {
    backgroundColor: '#0F172A',
  },

  // ── Stats Row ──
  statsScrollWrapper: {
    marginTop: -24,
    marginBottom: 24,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  statsScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCardPremium: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  darkStatCardPremium: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    shadowOpacity: 0.3,
  },
  statIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8E8C5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  darkStatIconBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  statValuePremium: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statLabelPremium: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  actionPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  darkActionPanel: {
    backgroundColor: '#1E293B',
  },
  inviteButtonPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  darkInviteButtonPremium: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  inviteButtonIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D8E8C5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteButtonTextPremium: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  offlineNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  offlineNoteText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  aboutPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#D8E8C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitlePremium: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  descriptionPremium: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  accessChipPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  accessChipLabelPremium: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Sections ──
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIcon: { fontSize: 22 },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    color: '#9E9E9E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Sections ──
  section: { gap: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },

  // ── Etapes Mystères ──
  hiddenEtapesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 8,
  },
  hiddenEtapesText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Download / Play ──
  offlineNote: {
    textAlign: 'center',
    color: '#9E9E9E',
    fontSize: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D8E8C5',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
  },
  inviteButtonText: {
    color: GREEN,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },

  // ── Accessibilité ──
  accessRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  accessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  accessChipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Étapes ──
  etapeCountBadge: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  etapeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
  },
  etapeList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  etapeRow: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 56,
  },
  etapeIndicator: {
    alignItems: 'center',
    width: 28,
  },
  etapeNumberBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  etapeNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  etapeLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#D8E8C5',
    marginVertical: 4,
    marginBottom: 0,
    borderRadius: 1,
  },
  etapeContent: {
    flex: 1,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7F5',
    gap: 4,
    marginBottom: 0,
  },
  etapeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  etapeJeuxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  etapeJeuxCount: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },

  // ── CTA final ──
  ctaCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  ctaCardLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(45,106,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCardEmoji: { fontSize: 24 },
  ctaCardContent: { flex: 1, gap: 2 },
  ctaCardTitle: { fontSize: 15, fontWeight: '700', color: GREEN },
  ctaCardSub: { fontSize: 13, color: '#558B2F' },

  // ── États de chargement / erreur ──
  centeredScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F5',
    padding: 32,
    gap: 12,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  loadingText: { fontSize: 15, color: '#888', fontWeight: '500' },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center' },
  errorSub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  darkContainer: { backgroundColor: '#0F172A' },
  darkCard: { backgroundColor: '#1E293B', shadowColor: '#000' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
  darkEtapeContent: { borderBottomColor: '#334155' },
  darkHiddenEtapesBanner: { backgroundColor: '#1E293B', borderColor: '#334155' },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#4A4A4A',
    lineHeight: 24,
  },
  strong: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  em: {
    fontStyle: 'italic',
  },
});

const darkMarkdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
  },
  strong: {
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  em: {
    fontStyle: 'italic',
  },
});
