import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, Geojson } from 'react-native-maps';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getParcoursComplet } from '@/src/services/database.service';
import { useGameStore } from '@/src/store/game.store';
import type { Parcours, Etape, Jeu } from '@/src/types/api.types';

import { useGpsTrigger } from '@/src/hooks/use-gps-trigger';
import { formatDistance } from '@/src/utils/distance';
import { CarnetTransitionView } from '@/src/components/features/transition/CarnetTransitionView';

import { MiniJeuxManager } from '@/src/components/features/jeux/MiniJeuxManager';

type ParcoursComplet = {
  parcours: Parcours & { downloadedAt: number; isCompleted: boolean };
  etapes: (Etape & { jeux: Jeu[] })[];
};

export default function JeuScreen() {
  // Empêcher l'écran de se verrouiller pendant la balade
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startParcours, currentEtapeOrder, activeParcoursId, completeEtape } = useGameStore();

  const [data, setData] = useState<ParcoursComplet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any | null>(null);

  // État local pour savoir si on est en train de faire un jeu
  const [isTransitionActive, setIsTransitionActive] = useState(false);
  const [reachedEtape, setReachedEtape] = useState<Etape | null>(null);
  const [isPlayingGame, setIsPlayingGame] = useState(false);

  // Charger les données hors-ligne
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const result = await getParcoursComplet(id);
        if (!result) {
          setError('Parcours non trouvé ou non téléchargé.');
          return;
        }
        setData(result);

        // Activer le parcours dans le store si ce n'est pas déjà le cas
        if (activeParcoursId !== id) {
          startParcours(id);
        }

        // Parser le GeoJSON si présent
        if (result.parcours.pathGeoJSON) {
          try {
            setGeoJsonData(JSON.parse(result.parcours.pathGeoJSON));
          } catch (e) {
            console.warn('Invalid GeoJSON in DB', e);
          }
        }
      } catch (e) {
        setError('Erreur lors du chargement des données locales.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Déclencheur GPS
  const { distanceToNext } = useGpsTrigger({
    etapes: data?.etapes || [],
    currentEtapeOrder,
    isActive: !isLoading && !error && data !== null && !isTransitionActive && !isPlayingGame,
    onStepReached: (etape) => {
      // Le GPS dit qu'on est arrivé !
      setReachedEtape(etape);
      setIsTransitionActive(true);
    },
  });

  const handleContinueToGame = () => {
    setIsTransitionActive(false);
    setIsPlayingGame(true);
  };

  const handleGameCompleted = async () => {
    setIsPlayingGame(false);
    setReachedEtape(null);

    const totalEtapes = data?.etapes.length || 0;
    
    if (currentEtapeOrder >= totalEtapes) {
      // C'était la dernière étape !
      completeEtape(totalEtapes);
      
      // Mettre à jour la base SQLite locale + File d'attente de Sync
      try {
        const { markParcoursCompleted, addToQueue } = await import('@/src/services/database.service');
        const { generateUUID } = await import('@/src/utils/uuid');
        await markParcoursCompleted(id);
        
        const { score, startTime } = useGameStore.getState();
        const tempsPasse = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        const syncPayload = {
          parcoursId: id,
          score: score,
          tempsPasse: tempsPasse,
          syncId: generateUUID(),
        };

        await addToQueue({
          syncId: syncPayload.syncId,
          type: 'parcours_completed',
          payload: JSON.stringify(syncPayload),
          createdAt: Date.now(),
        });
      } catch (err) {
        console.error('Erreur lors de la sauvegarde de fin de parcours:', err);
      }

      Alert.alert(
        "Félicitations !", 
        "Vous avez terminé ce parcours avec succès. L'écran de victoire sera disponible bientôt !",
        [{ text: "Quitter", style: "default", onPress: () => router.back() }]
      );
    } else {
      completeEtape(totalEtapes);
      Alert.alert(
        "Étape validée !", 
        "Bravo ! En route vers la prochaine étape.",
        [{ text: "Continuer", style: "default" }]
      );
    }
  };

  const handleQuitGame = () => {
    Alert.alert(
      "Abandonner le défi ?",
      "Vous pourrez réessayer ce défi plus tard.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Abandonner", 
          style: "destructive", 
          onPress: () => {
            setIsPlayingGame(false);
            setReachedEtape(null);
          }
        }
      ]
    );
  };

  const handleQuit = () => {
    Alert.alert(
      'Quitter la balade',
      'Êtes-vous sûr de vouloir quitter ? Votre progression (étapes validées) est sauvegardée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2D6A4F" />
        <Text style={styles.loadingText}>Préparation de la carte hors-ligne...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  // L'étape actuelle à atteindre (order commence à 1 dans le jeu, index à 0)
  const currentEtapeIndex = Math.max(0, currentEtapeOrder - 1);
  const currentEtape = data.etapes[currentEtapeIndex] || data.etapes[0];

  return (
    <View style={styles.container}>
      {/* CARTE */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={true}
        initialRegion={
          currentEtape
            ? {
                latitude: currentEtape.latitude,
                longitude: currentEtape.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
      >
        {/* Tracé GPS du parcours */}
        {geoJsonData && (
          <Geojson
            geojson={geoJsonData}
            strokeColor="#2D6A4F"
            fillColor="#2D6A4F"
            strokeWidth={4}
          />
        )}

        {/* Marqueurs pour chaque étape */}
        {data.etapes.map((etape, index) => {
          const isPassed = index < currentEtapeIndex;
          const isActive = index === currentEtapeIndex;

          let color = '#9CA3AF'; // Gris si à venir
          if (isPassed) color = '#10B981'; // Vert si validée
          if (isActive) color = '#F59E0B'; // Orange si c'est la prochaine cible

          return (
            <Marker
              key={etape.id}
              coordinate={{ latitude: etape.latitude, longitude: etape.longitude }}
              title={etape.title}
            >
              <View style={[styles.markerBubble, { backgroundColor: color }]}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* HEADER (Bouton Quitter flottant) */}
      <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
        <Pressable style={styles.iconBtn} onPress={handleQuit}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </Pressable>
      </View>

      {/* FOOTER (Panneau d'information d'étape) */}
      <View style={[styles.footerOverlay, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.objectifCard}>
          <Text style={styles.objectifLabel}>Prochaine étape ({currentEtapeOrder}/{data.etapes.length})</Text>
          <Text style={styles.objectifTitle}>{currentEtape?.title || "Balade terminée !"}</Text>
          <Text style={styles.objectifDesc}>
            Suivez la carte pour vous rendre à cet emplacement. Un mini-jeu se déclenchera automatiquement quand vous serez à moins de 15 mètres.
          </Text>
          
          {/* Distance en direct */}
          {distanceToNext !== null && !isTransitionActive && !isPlayingGame && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 8, alignSelf: 'flex-start' }}>
              <Ionicons name="navigate-circle" size={20} color="#10B981" />
              <Text style={{ marginLeft: 6, color: '#065F46', fontWeight: 'bold' }}>
                À {formatDistance(distanceToNext)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Carnet de Bord (Modale de transition au point GPS) */}
      {isTransitionActive && reachedEtape && (
        <CarnetTransitionView
          etape={reachedEtape}
          onContinue={handleContinueToGame}
        />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 16, color: '#2D6A4F', fontWeight: '600' },
  errorText: { marginTop: 16, color: '#EF4444', textAlign: 'center', fontWeight: '600', marginBottom: 24 },
  backBtn: { backgroundColor: '#2D6A4F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  backBtnText: { color: 'white', fontWeight: 'bold' },
  
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
  },
  objectifLabel: { fontSize: 12, fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  objectifTitle: { fontSize: 20, fontWeight: '900', color: '#1F2937', marginBottom: 8 },
  objectifDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  markerBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: { color: 'white', fontWeight: '900', fontSize: 14 },
});
