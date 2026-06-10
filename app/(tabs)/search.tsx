import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parcoursService } from '@/src/services/parcours.service';
import type { Parcours } from '@/src/types/api.types';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ============================================================================
// Types & Données
// ============================================================================

type SearchMode = 'parcours' | 'nearby';

interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  isMock?: boolean;
}

const CATEGORIES: Category[] = [
  { id: 'FACILE', label: 'Facile', icon: 'leaf', color: '#4ADE80' },
  { id: 'MOYEN', label: 'Moyen', icon: 'walk', color: '#FACC15' },
  { id: 'DIFFICILE', label: 'Difficile', icon: 'fitness', color: '#F87171' },
  { id: 'PMR', label: 'PMR', icon: 'body', color: '#60A5FA' },
  { id: 'CHILD', label: 'Enfants', icon: 'happy', color: '#A78BFA' },
  { id: 'MENTAL', label: 'Inclusif', icon: 'heart', color: '#F472B6' },
  { id: 'FOREST', label: 'Forêt', icon: 'leaf-outline', color: '#22C55E', isMock: true },
  { id: 'WATER', label: 'Lac/Eau', icon: 'water', color: '#38BDF8', isMock: true },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap positions (distance depuis le bas)
const SNAP_LOW = SCREEN_HEIGHT * 0.3;   // 30% visible
const SNAP_MID = SCREEN_HEIGHT * 0.55;  // 55% visible
const SNAP_HIGH = SCREEN_HEIGHT * 0.88; // 88% visible

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // État local
  const [mode, setMode] = useState<SearchMode>('parcours');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [parcours, setParcours] = useState<Parcours[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Bottom Panel Animation ──────────────────────────────────────────────────
  const panelHeight = useSharedValue(SNAP_MID);
  const startHeight = useSharedValue(SNAP_MID);

  const snapTo = (target: number) => {
    'worklet';
    panelHeight.value = withSpring(target, {
      damping: 25,
      stiffness: 200,
      mass: 0.8,
    });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startHeight.value = panelHeight.value;
    })
    .onUpdate((event) => {
      // Dragging down decreases height, dragging up increases it
      const newHeight = startHeight.value - event.translationY;
      panelHeight.value = Math.max(SNAP_LOW * 0.5, Math.min(SNAP_HIGH, newHeight));
    })
    .onEnd((event) => {
      const currentH = panelHeight.value;
      const velocity = -event.velocityY; // positive = swiping up

      // Determine closest snap point, biased by velocity
      if (velocity > 500) {
        // Fast swipe up → go to next higher snap
        if (currentH < SNAP_MID) snapTo(SNAP_MID);
        else snapTo(SNAP_HIGH);
      } else if (velocity < -500) {
        // Fast swipe down → go to next lower snap
        if (currentH > SNAP_MID) snapTo(SNAP_MID);
        else snapTo(SNAP_LOW);
      } else {
        // Snap to nearest
        const distLow = Math.abs(currentH - SNAP_LOW);
        const distMid = Math.abs(currentH - SNAP_MID);
        const distHigh = Math.abs(currentH - SNAP_HIGH);
        const min = Math.min(distLow, distMid, distHigh);
        if (min === distLow) snapTo(SNAP_LOW);
        else if (min === distMid) snapTo(SNAP_MID);
        else snapTo(SNAP_HIGH);
      }
    });

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

  // ============================================================================
  // Logique
  // ============================================================================

  // 1. Initialiser la position de l'utilisateur au montage
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission localisation refusée, utilisation de Paris');
          setUserLocation({ lat: 48.8566, lng: 2.3522 });
          return;
        }

        const pos = await Location.getCurrentPositionAsync({});
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);

        mapRef.current?.animateToRegion({
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      } catch (e) {
        console.log('Erreur de localisation, fallback sur Paris');
        const fallbackLoc = { lat: 48.8566, lng: 2.3522 };
        setUserLocation(fallbackLoc);

        mapRef.current?.animateToRegion({
          latitude: fallbackLoc.lat,
          longitude: fallbackLoc.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
    })();
  }, []);

  // 2. Recharger les parcours quand le mode change
  useEffect(() => {
    loadParcours();
  }, [mode, userLocation]);

  const loadParcours = async () => {
    setIsLoading(true);
    try {
      if (mode === 'nearby' && userLocation) {
        const nearby = await parcoursService.getNearby({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: 20000,
        });
        setParcours(nearby);
      } else if (mode === 'parcours') {
        const all = await parcoursService.search({});
        setParcours(all);
      }
    } catch (e) {
      console.log('Erreur lors du chargement des parcours', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParcoursSelect = (id: string) => {
    router.push({ pathname: '/parcours/[id]', params: { id } });
  };

  // ============================================================================
  // Rendu
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* --- CARTE EN PLEIN ÉCRAN --- */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 46.8566,
          longitude: 2.3522,
          latitudeDelta: 10,
          longitudeDelta: 10,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {parcours.map((p) => {
          const lat = (p as any).startLat as number | undefined;
          const lng = (p as any).startLng as number | undefined;
          if (!lat || !lng) return null;
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={p.title}
              onCalloutPress={() => handleParcoursSelect(p.id)}
            />
          );
        })}
      </MapView>

      {/* --- PANNEAU GLISSANT CUSTOM --- */}
      <Animated.View style={[styles.panel, panelAnimatedStyle]}>
        {/* Handle de drag */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.handleArea}>
            <View style={styles.handleBar} />
          </View>
        </GestureDetector>

        {/* Contenu scrollable */}
        <ScrollView
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
        >
          {/* Header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Scrute La Nature</Text>
          </View>

          {/* Toggle Switch */}
          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() => setMode('parcours')}
              style={[
                styles.toggleButton,
                mode === 'parcours' && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === 'parcours' && styles.toggleTextActive,
                ]}
              >
                Parcours
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('nearby')}
              style={[
                styles.toggleButton,
                mode === 'nearby' && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === 'nearby' && styles.toggleTextActive,
                ]}
              >
                Autour de moi
              </Text>
            </Pressable>
          </View>

          {/* Indicateur de chargement */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2D6A4F" />
              <Text style={styles.loadingText}>Chargement…</Text>
            </View>
          )}

          {/* Résultat pour le mode nearby */}
          {mode === 'nearby' && !isLoading && (
            <View style={styles.resultInfo}>
              <Ionicons name="navigate-circle-outline" size={20} color="#2D6A4F" />
              <Text style={styles.resultInfoText}>
                {parcours.length > 0
                  ? `${parcours.length} parcours trouvé${parcours.length > 1 ? 's' : ''} à proximité`
                  : 'Aucun parcours trouvé dans un rayon de 20 km'}
              </Text>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="location-outline" size={24} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Où voulez-vous vous balader ?"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories Grid */}
          <Text style={styles.sectionTitle}>Catégories</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryItem}
                onPress={() => {
                  /* Appliquer le filtre */
                }}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${cat.color}20` },
                  ]}
                >
                  <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Action Card */}
          <View style={styles.actionCard}>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Contribuer à la carte</Text>
              <Text style={styles.actionCardSubtitle}>
                Vous connaissez un lieu intéressant ? Partagez-le avec la communauté.
              </Text>
            </View>
            <Pressable style={styles.actionCardButton}>
              <Text style={styles.actionCardButtonText}>+ Ajouter</Text>
            </Pressable>
          </View>

          {/* Liste des parcours (mode nearby) */}
          {mode === 'nearby' && parcours.length > 0 && (
            <View style={styles.parcoursListSection}>
              <Text style={styles.sectionTitle}>Parcours à proximité</Text>
              {parcours.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.parcoursCard}
                  onPress={() => handleParcoursSelect(p.id)}
                >
                  <View style={styles.parcoursCardIcon}>
                    <Ionicons name="trail-sign-outline" size={24} color="#2D6A4F" />
                  </View>
                  <View style={styles.parcoursCardInfo}>
                    <Text style={styles.parcoursCardTitle} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={styles.parcoursCardMeta}>
                      {p.difficulty ?? 'Non défini'} • {p.estimatedDuration ?? '?'} min
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // ── Panel ──
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleArea: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  panelContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  // ── Header ──
  panelHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D6A4F',
    letterSpacing: -0.3,
  },
  // ── Toggle ──
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontWeight: '600',
    fontSize: 15,
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#111827',
  },
  // ── Loading ──
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  // ── Result info ──
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  resultInfoText: {
    color: '#2D6A4F',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  // ── Categories ──
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  categoryItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  // ── Action Card ──
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  actionCardContent: {
    flex: 1,
    paddingRight: 16,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionCardButton: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionCardButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // ── Parcours list ──
  parcoursListSection: {
    marginTop: 8,
  },
  parcoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  parcoursCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  parcoursCardInfo: {
    flex: 1,
  },
  parcoursCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  parcoursCardMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
});
