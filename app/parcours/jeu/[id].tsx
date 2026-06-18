import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera,
  CameraRef,
  Map,
  MapRef,
  UserLocation,
  RasterSource,
  Layer,
  GeoJSONSource,
  Marker,
} from '@maplibre/maplibre-react-native';
// MapLibreGL.setAccessToken(null);
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getParcoursComplet } from '@/src/services/database.service';
import { useGameStore } from '@/src/store/game.store';
import { downloadMapTiles, areTilesAvailable, getLocalTileUrlTemplate } from '@/src/services/filesystem.service';
import type { TileDownloadResult } from '@/src/services/filesystem.service';
import type { Parcours, Etape, Jeu } from '@/src/types/api.types';

import { useGpsTrigger } from '@/src/hooks/use-gps-trigger';
import { formatDistance } from '@/src/utils/distance';
import { CarnetTransitionView } from '@/src/components/features/transition/CarnetTransitionView';
import { MiniJeuxManager } from '@/src/components/features/jeux/MiniJeuxManager';
import { calculateBoundingBox } from '@/src/utils/map';

// ─── Types ────────────────────────────────────────────────────────────────────

type ParcoursComplet = {
  parcours: Parcours & { downloadedAt: number; isCompleted: boolean };
  etapes: (Etape & { jeux: Jeu[] })[];
};

type PrepStep = 'loading_data' | 'requesting_gps' | 'downloading_tiles' | 'ready' | 'error';

interface PrepState {
  step: PrepStep;
  tileProgress: number;
  tileStats: TileDownloadResult | null;
  error: string | null;
}

// ─── Écran de préparation ─────────────────────────────────────────────────────

function PrepScreen({
  step,
  tileProgress,
  tileStats,
  error,
  onRetry,
}: {
  step: PrepStep;
  tileProgress: number;
  tileStats: TileDownloadResult | null;
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: tileProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [tileProgress]);

  const stepConfig: Record<PrepStep, { icon: string; label: string; color: string }> = {
    loading_data:      { icon: 'cloud-download-outline', label: 'Chargement des données…',       color: '#10b981' },
    requesting_gps:    { icon: 'navigate-outline',       label: 'Activation du GPS…',            color: '#3b82f6' },
    downloading_tiles: { icon: 'map-outline',            label: 'Préparation de la carte…',      color: '#f59e0b' },
    ready:             { icon: 'checkmark-circle-outline', label: 'Prêt !',                      color: '#10b981' },
    error:             { icon: 'warning-outline',        label: error || 'Erreur',               color: '#ef4444' },
  };

  const config = stepConfig[step];

  return (
    <View style={prepStyles.container}>
      <View style={prepStyles.card}>
        {/* Icône animée */}
        <View style={[prepStyles.iconCircle, { backgroundColor: `${config.color}20` }]}>
          {step !== 'error' && step !== 'ready' ? (
            <ActivityIndicator size="large" color={config.color} />
          ) : (
            <Ionicons name={config.icon as any} size={40} color={config.color} />
          )}
        </View>

        <Text style={prepStyles.title}>Démarrage de la balade</Text>
        <Text style={[prepStyles.stepLabel, { color: config.color }]}>{config.label}</Text>

        {/* Barre de progression tuiles */}
        {step === 'downloading_tiles' && (
          <View style={prepStyles.progressContainer}>
            <View style={prepStyles.progressBar}>
              <Animated.View
                style={[
                  prepStyles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={prepStyles.progressLabel}>
              {Math.round(tileProgress * 100)}% des tuiles de carte
            </Text>
            {tileStats && (
              <Text style={prepStyles.tileStats}>
                ✓ {tileStats.downloaded} DL &nbsp;·&nbsp; 💾 {tileStats.cached} cache
                {tileStats.failed > 0 ? ` · ✗ ${tileStats.failed} échecs` : ''}
              </Text>
            )}
          </View>
        )}

        {step === 'error' && (
          <Pressable style={prepStyles.retryBtn} onPress={onRetry}>
            <Text style={prepStyles.retryText}>Réessayer</Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.back()} style={prepStyles.cancelBtn}>
          <Text style={prepStyles.cancelText}>Annuler</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function JeuScreen() {
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startParcours, currentEtapeOrder, activeParcoursId, completeEtape } = useGameStore();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  // ── États de préparation ──
  const [prepStep, setPrepStep] = useState<PrepStep>('loading_data');
  const [tileProgress, setTileProgress] = useState(0);
  const [tileStats, setTileStats] = useState<TileDownloadResult | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);

  // ── Données ──
  const [data, setData] = useState<ParcoursComplet | null>(null);
  // GeoJSON brut pour ShapeSource
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  // URL des tuiles (mbtiles:// local ou OSM en ligne)
  const [tileUrlTemplates, setTileUrlTemplates] = useState<string[]>([
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  ]);
  const [centerCoord, setCenterCoord] = useState<[number, number] | null>(null);

  // ── Jeu ──
  const [isTransitionActive, setIsTransitionActive] = useState(false);
  const [reachedEtape, setReachedEtape] = useState<Etape | null>(null);
  const [isPlayingGame, setIsPlayingGame] = useState(false);

  // ────────────────────────────────────────────────────────────────────────────
  // Séquence de préparation : données → GPS → tuiles → go
  // ────────────────────────────────────────────────────────────────────────────
  const runPreparation = useCallback(async () => {
    if (!id) return;
    setPrepError(null);

    // ÉTAPE 1 : Charger les données SQLite
    setPrepStep('loading_data');
    let result: ParcoursComplet | null = null;
    try {
      result = await getParcoursComplet(id);
      if (!result) throw new Error('Parcours non trouvé. Avez-vous bien téléchargé ce parcours ?');
      setData(result);

      if (activeParcoursId !== id) startParcours(id);

      // Parser le GeoJSON pour la Polyline
      if (result.parcours.pathGeoJSON) {
        try {
          const geojson = JSON.parse(result.parcours.pathGeoJSON);
          let coords: [number, number][] = [];
          if (geojson.type === 'LineString') coords = geojson.coordinates;
          else if (geojson.type === 'Feature' && geojson.geometry?.type === 'LineString')
            coords = geojson.geometry.coordinates;
          else if (geojson.type === 'FeatureCollection') {
            const line = geojson.features.find((f: any) => f.geometry?.type === 'LineString');
            if (line) coords = line.geometry.coordinates;
          }
          // Stocker le GeoJSON structuré pour MapLibre ShapeSource
          if (coords.length > 0) {
            setRouteGeoJSON({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: coords },
              properties: {},
            });
            // Centre de la carte sur la première étape
            const first = coords[0];
            if (first) setCenterCoord([first[0], first[1]]);
          }
        } catch {}
      }
    } catch (e: any) {
      setPrepError(e.message || 'Erreur lors du chargement des données locales.');
      setPrepStep('error');
      return;
    }

    // ÉTAPE 2 : Demander la permission GPS
    setPrepStep('requesting_gps');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'GPS requis',
          'La localisation GPS est nécessaire pour jouer. Veuillez autoriser l\'accès dans les réglages.',
          [{ text: 'Compris', onPress: () => router.back() }]
        );
        return;
      }

      // Forcer une première position pour que showsUserLocation soit précis dès le départ
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    } catch {
      // Si le GPS échoue, on continue quand même — showsUserLocation le gèrera
    }

    // ÉTAPE 3 : Vérifier / télécharger les tuiles OSM
    setPrepStep('downloading_tiles');
    try {
      const tilesAlreadyAvailable = await areTilesAvailable(id);

      if (tilesAlreadyAvailable) {
        // Tuiles en cache et valides → carte hors-ligne garantie (FS)
        setTileUrlTemplates([getLocalTileUrlTemplate(id)]);
        setTileProgress(1);
        setTileStats({ total: 0, downloaded: 0, cached: 0, failed: 0 });
      } else if (result?.parcours.pathGeoJSON) {
        // Pas de cache → télécharger dans la BDD MBTiles
        const stats = await downloadMapTiles(
          result.parcours.pathGeoJSON,
          id,
          12,
          17,
          (p) => setTileProgress(p)
        );
        setTileStats(stats);

        // Utiliser le cache FS local si au moins 50% de succès
        const successRate = stats.total > 0
          ? (stats.downloaded + stats.cached) / stats.total
          : 0;
        if (successRate >= 0.5) {
          setTileUrlTemplates([getLocalTileUrlTemplate(id)]);
        }
        // Sinon on reste sur l'URL en ligne (fallback si réseau disponible)
      }
    } catch {
      // Échec complet → fallback sur OSM en ligne
    }

    setPrepStep('ready');
  }, [id, activeParcoursId, startParcours]);

  useEffect(() => {
    runPreparation();
  }, [runPreparation]);

  // ── Centrer la caméra sur la cible quand les données sont prêtes ──
  useEffect(() => {
    if (prepStep !== 'ready' || !data) return;
    const currentEtapeIndex = Math.max(0, currentEtapeOrder - 1);
    const currentEtape = data.etapes[currentEtapeIndex];
    if (currentEtape) {
      setTimeout(() => {
        cameraRef.current?.easeTo({
          center: [currentEtape.longitude, currentEtape.latitude],
          zoom: 15,
          duration: 600,
        });
      }, 400);
    }
  }, [prepStep, data, currentEtapeOrder]);

  // ── Déclencheur GPS ──
  const { distanceToNext } = useGpsTrigger({
    etapes: data?.etapes || [],
    currentEtapeOrder,
    isActive: prepStep === 'ready' && data !== null && !isTransitionActive && !isPlayingGame,
    onStepReached: (etape) => {
      setReachedEtape(etape);
      setIsTransitionActive(true);
    },
  });

  // ── Handlers ──
  const handleContinueToGame = () => { setIsTransitionActive(false); setIsPlayingGame(true); };

  const handleGameCompleted = async () => {
    setIsPlayingGame(false);
    setReachedEtape(null);
    const totalEtapes = data?.etapes.length || 0;

    if (currentEtapeOrder >= totalEtapes) {
      completeEtape(totalEtapes);
      try {
        const { markParcoursCompleted, addToQueue } = await import('@/src/services/database.service');
        const { generateUUID } = await import('@/src/utils/uuid');
        await markParcoursCompleted(id);
        const { score, startTime } = useGameStore.getState();
        const tempsPasse = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        await addToQueue({
          syncId: generateUUID(),
          type: 'parcours_completed',
          payload: JSON.stringify({ parcoursId: id, score, tempsPasse }),
          createdAt: Date.now(),
        });
      } catch (err) {
        console.error('Erreur sauvegarde fin de parcours:', err);
      }
      router.replace({ pathname: '/parcours/[id]/victoire', params: { id } });
    } else {
      completeEtape(totalEtapes);
      Alert.alert('Étape validée !', 'Bravo ! En route vers la prochaine étape.', [
        { text: 'Continuer', style: 'default' },
      ]);
    }
  };

  const handleQuitGame = () => {
    Alert.alert('Abandonner le défi ?', 'Vous pourrez réessayer ce défi plus tard.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: () => { setIsPlayingGame(false); setReachedEtape(null); } },
    ]);
  };

  const handleQuit = () => {
    Alert.alert('Quitter la balade', 'Êtes-vous sûr de vouloir quitter ? Votre progression est sauvegardée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Rendu : écran de préparation
  // ────────────────────────────────────────────────────────────────────────────
  if (prepStep !== 'ready') {
    return (
      <PrepScreen
        step={prepStep}
        tileProgress={tileProgress}
        tileStats={tileStats}
        error={prepError}
        onRetry={runPreparation}
      />
    );
  }

  const currentEtapeIndex = Math.max(0, currentEtapeOrder - 1);
  const currentEtape = data!.etapes[currentEtapeIndex] || data!.etapes[0];

  // ────────────────────────────────────────────────────────────────────────────
  // Rendu : carte de navigation
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── CARTE OPENSTREETMAP (MapLibre) ── */}
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        logoPosition={{ bottom: -100, right: -100 }}
        attributionPosition={{ bottom: -100, right: -100 }}
        mapStyle=""
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: centerCoord ?? [2.35, 46.5],
            zoom: 15,
          }}
        />

        {/* Position GPS de l'utilisateur */}
        <UserLocation animated />

        {/* Tuiles OSM — MBTiles local (hors-ligne) ou OSM en ligne (fallback) */}
        <RasterSource
          id="tiles-source"
          tiles={tileUrlTemplates}
          tileSize={256}
          minzoom={12}
          maxzoom={19}
        >
          <Layer id="tiles-layer" type="raster" source="tiles-source" />
        </RasterSource>

        {/* Tracé du parcours */}
        {routeGeoJSON && (
          <GeoJSONSource id="route" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{ 'line-color': '#10b981', 'line-width': 4, 'line-cap': 'round', 'line-join': 'round' } as any}
            />
          </GeoJSONSource>
        )}

        {/* Marqueurs des étapes */}
        {data!.etapes.map((etape, index) => {
          const isPassed = index < currentEtapeIndex;
          const isActive = index === currentEtapeIndex;
          let color = '#9CA3AF';
          if (isPassed) color = '#10B981';
          if (isActive) color = '#F59E0B';
          return (
            <Marker id={`etape-${etape.id}`} key={etape.id} lngLat={[etape.longitude, etape.latitude]}>
              <View style={[styles.markerBubble, { backgroundColor: color }]}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
            </Marker>
          );
        })}
      </Map>

      {/* ── HEADER ── */}
      <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
        <Pressable style={styles.iconBtn} onPress={handleQuit}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </Pressable>
      </View>

      {/* ── FOOTER : Panneau info étape ── */}
      <View style={[styles.footerOverlay, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.objectifCard}>
          <Text style={styles.objectifLabel}>
            Prochaine étape ({currentEtapeOrder}/{data!.etapes.length})
          </Text>
          <Text style={styles.objectifTitle}>{currentEtape?.title || 'Balade terminée !'}</Text>
          <Text style={styles.objectifDesc}>
            Suivez la carte pour vous rendre à cet emplacement. Un mini-jeu se déclenchera
            automatiquement quand vous serez à moins de 15 mètres.
          </Text>

          {/* Distance en direct */}
          {distanceToNext !== null && !isTransitionActive && !isPlayingGame && (
            <View style={styles.distancePill}>
              <Ionicons name="navigate-circle" size={20} color="#10B981" />
              <Text style={styles.distanceText}>À {formatDistance(distanceToNext)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Carnet de Bord (transition au point GPS) */}
      {isTransitionActive && reachedEtape && (
        <CarnetTransitionView etape={reachedEtape} onContinue={handleContinueToGame} />
      )}

      {/* Mini-Jeux */}
      {isPlayingGame && reachedEtape && (
        <MiniJeuxManager
          jeux={(reachedEtape as any).jeux || []}
          etape={reachedEtape}
          onAllCompleted={handleGameCompleted}
          onQuit={handleQuitGame}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const prepStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    gap: 16,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 4,
  },
  cancelText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
  tileStats: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e5e7eb' },

  headerOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  objectifCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 6,
  },
  objectifLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  objectifTitle: { fontSize: 20, fontWeight: '900', color: '#1F2937' },
  objectifDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  distanceText: { color: '#065F46', fontWeight: '700', fontSize: 14 },

  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: { color: 'white', fontWeight: '900', fontSize: 14 },
});
