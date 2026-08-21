import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  InteractionManager,
  Image,
} from 'react-native';
import {
  Camera,
  CameraRef,
  Map,
  MapRef,
  UserLocation,
  RasterSource,
  Layer,
  Marker,
  GeoJSONSource,
  Images,
} from '@maplibre/maplibre-react-native';
// Désactiver le message de télémétrie MapLibre (n'est plus nécessaire en v11)
// MapLibreGL.setAccessToken(null);
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parcoursService } from '@/src/services/parcours.service';
import { formatDuration } from '@/src/utils/format';
import { useSettingsStore } from '@/src/store/settings.store';
import { useColorScheme } from 'react-native';
import type { Parcours } from '@/src/types/api.types';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { TabletWrapper } from '@/src/components/layout/TabletWrapper';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

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
  { id: 'MOYEN', label: 'Moyen', icon: 'walk', color: '#EFCB8C' },
  { id: 'DIFFICILE', label: 'Difficile', icon: 'fitness', color: '#F87171' },
  { id: 'PMR', label: 'PMR', icon: 'body', color: '#60A5FA' },
  { id: 'CHILD', label: 'Enfants', icon: 'happy', color: '#A78BFA' },
  { id: 'MENTAL', label: 'Handicap mental', icon: 'heart', color: '#F472B6' },
  { id: 'ESCAPE', label: 'Escape Game', icon: 'lock-closed', color: '#F59E0B' },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap positions (distance depuis le bas)
const SNAP_LOW = SCREEN_HEIGHT * 0.3;
const SNAP_MID = SCREEN_HEIGHT * 0.55;
const SNAP_HIGH = SCREEN_HEIGHT * 0.88;

// Position par défaut (centre de la France) — utilisée pendant que le GPS résout
const DEFAULT_REGION = {
  latitude: 46.2276,
  longitude: 2.2137,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const isFocused = useIsFocused();
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';

  // ── État ──
  const [mode, setMode] = useState<SearchMode>('parcours');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [parcours, setParcours] = useState<Parcours[]>([]);
  const [allMapParcours, setAllMapParcours] = useState<Parcours[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const lastMarkerPressRef = useRef<number>(0);

  // Lazy loading : on attend la fin des animations de navigation avant de monter
  // les composants lourds (MapView). Cela empêche le blocage du thread JS
  // qui rendait le menu tactile non-réactif.
  const [isReady, setIsReady] = useState(false);

  // ── Bottom Panel Animation ──
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

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startHeight.value = panelHeight.value;
        })
        .onUpdate((event) => {
          const newHeight = startHeight.value - event.translationY;
          panelHeight.value = Math.max(SNAP_LOW * 0.5, Math.min(SNAP_HIGH, newHeight));
        })
        .onEnd((event) => {
          const currentH = panelHeight.value;
          const velocity = -event.velocityY;

          if (velocity > 500) {
            if (currentH < SNAP_MID) snapTo(SNAP_MID);
            else snapTo(SNAP_HIGH);
          } else if (velocity < -500) {
            if (currentH > SNAP_MID) snapTo(SNAP_MID);
            else snapTo(SNAP_LOW);
          } else {
            const distLow = Math.abs(currentH - SNAP_LOW);
            const distMid = Math.abs(currentH - SNAP_MID);
            const distHigh = Math.abs(currentH - SNAP_HIGH);
            const min = Math.min(distLow, distMid, distHigh);
            if (min === distLow) snapTo(SNAP_LOW);
            else if (min === distMid) snapTo(SNAP_MID);
            else snapTo(SNAP_HIGH);
          }
        }),
    [panelHeight, startHeight]
  );

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

  const locationBtnAnimatedStyle = useAnimatedStyle(() => ({
    bottom: panelHeight.value + 16,
  }));

  // ── Lazy mount + démontage au blur ──
  // Le MapView est un composant natif lourd : tant qu'il est monté, il congestionne
  // le thread JS, ce qui rend le tab bar (Pressable → onPress sur le thread JS)
  // non-réactif — d'où "le menu ne marche plus", surtout après un reload où le
  // MapView se monte sans transition douce (InteractionManager ne joue plus son rôle).
  // Solution : on ne monte le MapView QUE lorsque l'onglet est focus, et on le
  // démonte dès qu'on le quitte pour libérer le thread JS sur les autres onglets.
  useEffect(() => {
    if (!isFocused) {
      setIsReady(false);
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    
});
    return () => task.cancel();
  }, [isFocused]);

  // ── Localisation — lancée APRÈS le montage des composants lourds ──
  useEffect(() => {
    if (!isReady || !isFocused) return;
    
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        if (status !== 'granted') {
          setHasLocationPermission(false);
          setUserLocation(null);
          return;
        }
        setHasLocationPermission(true);

        // getLastKnownPositionAsync est INSTANTANÉ (cache GPS du système)
        // et ne bloque jamais le thread JS contrairement à getCurrentPositionAsync
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && isMounted) {
          const loc = { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
          setUserLocation(loc);
          cameraRef.current?.easeTo({
            center: [loc.lng, loc.lat],
            zoom: 11,
            duration: 600,
          });
        }

        // Ensuite, en arrière-plan, on demande une position continue avec watchPositionAsync
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (pos) => {
            if (!isMounted) return;
            const freshLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            
            // Ne recentrer la caméra automatiquement que si on n'avait aucune position avant
            const shouldCenter = !userLocation && !lastKnown;
            
            setUserLocation(freshLoc);

            if (shouldCenter) {
              cameraRef.current?.easeTo({
                center: [freshLoc.lng, freshLoc.lat],
                zoom: 11,
                duration: 600,
              });
            }
          }
        );

        if (!isMounted) {
          // Si le composant a été démonté pendant l'attente de watchPositionAsync
          sub.remove();
        } else {
          locationSubscription = sub;
        }
      } catch (err) {
        if (isMounted) {
          // Silenced localization warning to avoid console spam when GPS is off
          setUserLocation(null);
        }
      }
    })();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isReady, isFocused]);

  // ── Chargement de tous les parcours pour la carte ──
  useEffect(() => {
    if (!isReady) return;
    parcoursService.search({}).then(setAllMapParcours).catch(console.log);
  }, [isReady]);

  // ── Chargement des parcours ──
  useEffect(() => {
    if (!isReady) return;
    loadParcours();
  }, [mode, userLocation, isReady]);

  const loadParcours = useCallback(async () => {
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
        const all = await parcoursService.search({
});
        setParcours(all);
      }
    } catch (e) {
      console.log('Erreur lors du chargement des parcours', e);
    } finally {
      setIsLoading(false);
    }
  }, [mode, userLocation]);

  const handleParcoursSelect = useCallback((id: string) => {
    router.push({ pathname: '/parcours/[id]', params: { id } 
});
  }, []);

  const handleCenterLocation = useCallback(async () => {
    if (userLocation) {
      cameraRef.current?.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 11,
        duration: 500,
      });
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          alert("Permission de localisation requise pour cette fonctionnalité.");
          return;
        }
        setHasLocationPermission(true);
        const pos = await Location.getCurrentPositionAsync({});
        const freshLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(freshLoc);
        cameraRef.current?.easeTo({
          center: [freshLoc.lng, freshLoc.lat],
          zoom: 11,
          duration: 500,
        });
      } catch (e) {
        alert("Impossible d'obtenir votre position. Vérifiez si votre GPS est activé.");
      }
    }
  }, [userLocation]);

  // ============================================================================
  // Rendu
  // ============================================================================

  const applyCategoryFilter = React.useCallback((p: Parcours) => {
    if (!selectedCategory) return true;
    switch (selectedCategory) {
      case 'FACILE': return p.difficulty === 'FACILE';
      case 'MOYEN': return p.difficulty === 'MOYEN';
      case 'DIFFICILE': return p.difficulty === 'DIFFICILE';
      case 'PMR': return p.isPMRFriendly === true;
      case 'CHILD': return p.isChildFriendly === true;
      case 'MENTAL': return p.isMentalHandicapFriendly === true;
      case 'ESCAPE': return (p as any).isEscapeGame === true;
      default: return true;
    }
  }, [selectedCategory]);

  const filteredMapParcours = React.useMemo(() => {
    return allMapParcours.filter(p => 
      (!searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.zonage?.nom && p.zonage.nom.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      applyCategoryFilter(p)
    );
  }, [allMapParcours, searchQuery, applyCategoryFilter]);
  
  const filteredListParcours = React.useMemo(() => {
    return parcours.filter(p => 
      (!searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.zonage?.nom && p.zonage.nom.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      applyCategoryFilter(p)
    );
  }, [parcours, searchQuery, applyCategoryFilter]);

  const badgesImages = React.useMemo(() => {
    const dict: Record<string, string> = {};
    filteredMapParcours.forEach(p => {
      if (p.badge?.imageUrl) {
        dict[`badge-${p.id}`] = resolveMediaUrl(p.badge.imageUrl);
      }
    });
    return dict;
  }, [filteredMapParcours]);

  const geoJsonData = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: filteredMapParcours.map((p) => {
        const firstEtape = (p as any).etapes?.[0];
        const lat = firstEtape?.latitude;
        const lng = firstEtape?.longitude;
        if (!lat || !lng) return null;
        return {
          type: 'Feature',
          id: p.id,
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          properties: {
            id: p.id,
            hasBadge: !!p.badge?.imageUrl,
            badgeImageId: `badge-${p.id}`,
            cluster: false,
          },
        };
      }).filter(Boolean),
    };
  }, [filteredMapParcours]);

  // Phase de chargement — afficher un placeholder léger au lieu de bloquer le menu
  if (!isReady) {
    return (
      <View style={[styles.container, isDark && styles.darkContainer]}>
        <View style={styles.loadingPlaceholder}>
          <ActivityIndicator size="large" color="#0087CC" />
          <Text style={styles.loadingPlaceholderText}>Chargement de la carte…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* --- CARTE EN PLEIN ÉCRAN (OpenStreetMap via MapLibre) --- */}
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        logoPosition={{ bottom: -100, right: -100 }}
        attributionPosition={{ bottom: -100, right: -100 }}
        mapStyle=""
        onPress={() => {
          if (Date.now() - lastMarkerPressRef.current > 300) {
            setSelectedMarkerId(null);
          }
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [DEFAULT_REGION.longitude, DEFAULT_REGION.latitude],
            zoom: 5,
          }}
        />

        {/* Tuiles OpenStreetMap — 100% gratuit */}
        <RasterSource
          id="osm-source"
          tiles={['https://tile.openstreetmap.org/{z}/{x}/{y}.png']}
          tileSize={256}
          maxzoom={19}
          attribution="© OpenStreetMap contributors"
        >
          <Layer id="osm-layer" type="raster" source="osm-source" />
        </RasterSource>

        {/* Position GPS de l'utilisateur - Gérée uniquement par le composant natif pour éviter les sauts de puce */}
        {hasLocationPermission && <UserLocation animated />}

        <Images images={badgesImages} />

        <GeoJSONSource
          id="parcours-source"
          data={geoJsonData as any}
          cluster={true}
          clusterRadius={40}
          clusterMaxZoom={14}
          onPress={(event: any) => {
            const feature = event.features[0];
            if (!feature) return;

            if (feature.properties?.cluster) {
              const [lng, lat] = feature.geometry.coordinates;
              cameraRef.current?.easeTo({
                center: [lng, lat],
                zoom: 12,
                duration: 500
              });
              return;
            }

            const pId = feature.properties?.id;
            if (pId) {
              lastMarkerPressRef.current = Date.now();
              if (selectedMarkerId === pId) {
                handleParcoursSelect(pId);
              } else {
                setSelectedMarkerId(pId);
              }
            }
          }}
        >
          {/* Cercle par défaut pour les parcours sans badge */}
          <Layer type="circle"
            id="default-marker-layer"
            filter={['!', ['get', 'hasBadge']]}
            style={{
              circleRadius: 14,
              circleColor: '#007E84',
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 3,
            }}
          />

          {/* Badge pour les parcours avec badge */}
          <Layer type="symbol"
            id="badge-marker-layer"
            filter={['get', 'hasBadge']}
            style={{
              iconImage: ['get', 'badgeImageId'],
              iconSize: 0.15,
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
            }}
          />

          {/* Clusters */}
          <Layer type="circle"
            id="cluster-circles"
            filter={['has', 'point_count']}
            style={{
              circleRadius: 20,
              circleColor: '#0087CC',
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 3,
            }}
          />
          <Layer type="symbol"
            id="cluster-counts"
            filter={['has', 'point_count']}
            style={{
              textField: '{point_count}',
              textSize: 15,
              textColor: '#FFFFFF',
            }}
          />
        </GeoJSONSource>

        {/* Bulle info sur le parcours sélectionné */}
        {selectedMarkerId && (
          (() => {
            const sp = filteredMapParcours.find(p => p.id === selectedMarkerId);
            if (!sp) return null;
            const lat = (sp as any).etapes?.[0]?.latitude;
            const lng = (sp as any).etapes?.[0]?.longitude;
            if (!lat || !lng) return null;

            return (
              <Marker
                id="selected-popover"
                lngLat={[lng, lat]}
                anchor="bottom"
                style={{ zIndex: 100 }}
              >
                <View style={[styles.markerContainer, { paddingBottom: 16 }]}>
                  <View style={[styles.markerBubble, isDark && styles.darkCard]}>
                    <Text style={[styles.markerText, isDark && styles.darkText]} numberOfLines={1}>{sp.title}</Text>
                    <Text style={[styles.markerMeta, isDark && styles.darkTextMuted]}>{sp.difficulty} • {formatDuration(sp.durationMin)}</Text>
                    <Text style={{ fontSize: 10, color: '#0087CC', marginTop: 4, fontWeight: '700' }}>Voir le parcours ➔</Text>
                  </View>
                </View>
              </Marker>
            );
          })()
        )}
      </Map>


      {/* --- BOUTON LOCALISATION --- */}
      <Animated.View style={[styles.locationBtnContainer, locationBtnAnimatedStyle]}>
        <Pressable style={[styles.locationBtn, isDark && styles.darkCard]} onPress={handleCenterLocation}>
          <Ionicons name="navigate" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </Pressable>
      </Animated.View>

      {/* --- PANNEAU GLISSANT CUSTOM --- */}
      <Animated.View style={[styles.panel, isDark && styles.darkPanel, panelAnimatedStyle]}>
        <TabletWrapper maxWidth={768}>
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
          <View style={[styles.toggleContainer, isDark && { backgroundColor: '#141B20' }]}>
            <Pressable
              onPress={() => setMode('parcours')}
              style={[
                styles.toggleButton,
                mode === 'parcours' && styles.toggleButtonActive,
                mode === 'parcours' && isDark && { backgroundColor: '#202C35' },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === 'parcours' && styles.toggleTextActive,
                  mode === 'parcours' && isDark && { color: '#F8FAFC' },
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
                mode === 'nearby' && isDark && { backgroundColor: '#202C35' },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === 'nearby' && styles.toggleTextActive,
                  mode === 'nearby' && isDark && { color: '#F8FAFC' },
                ]}
              >
                Autour de moi
              </Text>
            </Pressable>
          </View>

          {/* Indicateur de chargement */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0087CC" />
              <Text style={styles.loadingText}>Chargement…</Text>
            </View>
          )}

          {/* Résultat pour le mode nearby */}
          {mode === 'nearby' && !isLoading && (
            <View style={styles.resultInfo}>
              <Ionicons name="navigate-circle-outline" size={20} color="#0087CC" />
              <Text style={styles.resultInfoText}>
                {parcours.length > 0
                  ? `${parcours.length} parcours trouvé${parcours.length > 1 ? 's' : ''} à proximité`
                  : 'Aucun parcours trouvé dans un rayon de 20 km'}
              </Text>
            </View>
          )}

          {/* Search Bar */}
          <View style={[styles.searchBar, isDark && styles.darkSearchBar]}>
            <Ionicons name="location-outline" size={24} color="#9CA3AF" />
            <TextInput
              style={[styles.searchInput, isDark && styles.darkText]}
              placeholder="Où voulez-vous vous balader ?"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Contenu affiché seulement si on ne recherche pas */}
          {searchQuery.length === 0 && (
            <>
              {/* Categories Grid */}
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Catégories</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={styles.categoryItem}
                    onPress={() => {
                      setSelectedCategory(prev => prev === cat.id ? null : cat.id);
                    }}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: selectedCategory === cat.id ? cat.color : `${cat.color}20` },
                      ]}
                    >
                      <Ionicons name={cat.icon as any} size={24} color={selectedCategory === cat.id ? '#FFF' : cat.color} />
                    </View>
                    <Text style={[styles.categoryLabel, isDark && styles.darkTextMuted, selectedCategory === cat.id && { fontWeight: '700', color: isDark ? '#FFF' : '#111827' }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>

            </>
          )}

          {/* Liste des parcours (mode nearby ou recherche active) */}
          {(mode === 'nearby' || searchQuery.length > 0 || selectedCategory) && filteredListParcours.length > 0 && (
            <View style={styles.parcoursListSection}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
                {(searchQuery.length > 0 || selectedCategory) ? 'Résultats de recherche' : 'Parcours à proximité'}
              </Text>
              {filteredListParcours.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.parcoursCard, isDark && styles.darkCard]}
                  onPress={() => handleParcoursSelect(p.id)}
                >
                  <View style={styles.parcoursCardIcon}>
                    {p.coverImage ? (
                      <Image source={{ uri: resolveMediaUrl(p.coverImage) }} style={styles.parcoursImage} />
                    ) : (
                      <Ionicons name="trail-sign-outline" size={24} color="#0087CC" />
                    )}
                  </View>
                  <View style={styles.parcoursCardInfo}>
                    <Text style={[styles.parcoursCardTitle, isDark && styles.darkText]} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={[styles.parcoursCardMeta, isDark && styles.darkTextMuted]}>
                      {p.difficulty ?? 'Non défini'} • {formatDuration(p.durationMin)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </Pressable>
              ))}
            </View>
          )}


          {/* Aucun résultat de recherche */}
          {(searchQuery.length > 0 || selectedCategory) && filteredListParcours.length === 0 && (
            <View style={styles.resultInfo}>
              <Ionicons name="search-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.resultInfoText, { color: '#6B7280' }]}>
                Aucun parcours ne correspond à vos critères.
              </Text>
            </View>
          )}
        </ScrollView>
        </TabletWrapper>
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
  // ── Loading placeholder ──
  loadingPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F5',
    gap: 16,
  },
  loadingPlaceholderText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
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
    color: '#0087CC',
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
    backgroundColor: '#D8E8C5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  resultInfoText: {
    color: '#0087CC',
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
    backgroundColor: '#0087CC',
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
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#D8E8C5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  parcoursImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  // ── Floating Button ──
  locationBtnContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  locationBtn: {
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  // ── Marker MapLibre (bulle de parcours) ──
  markerContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  markerMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007E84',
    marginTop: 2,
  },

  darkContainer: { backgroundColor: '#0A0E11' },
  darkHeader: { backgroundColor: '#141B20', borderBottomColor: '#202C35' },
  darkPanel: { backgroundColor: '#0A0E11' },
  darkCard: { backgroundColor: '#141B20', borderColor: '#202C35', shadowColor: '#000' },
  darkSearchBar: { backgroundColor: '#141B20', borderColor: '#202C35' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
});