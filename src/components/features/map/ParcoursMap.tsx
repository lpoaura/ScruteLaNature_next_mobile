import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { UrlTile, Polyline, Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { getParcoursTilesDir } from '@/src/services/filesystem.service';
import { calculateBoundingBox } from '@/src/utils/map';
import * as FileSystem from 'expo-file-system/legacy';

interface ParcoursMapProps {
  parcoursId: string;
  geojsonString?: string | null;
  isOffline?: boolean;
}

export default function ParcoursMap({
  parcoursId,
  geojsonString,
  isOffline = false,
}: ParcoursMapProps) {
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [offlineTilesExist, setOfflineTilesExist] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (isOffline) {
      (async () => {
        // Vérifier si le dossier des tuiles existe
        const tilesDir = getParcoursTilesDir(parcoursId);
        const info = await FileSystem.getInfoAsync(tilesDir);
        setOfflineTilesExist(info.exists);
      })();
    }
  }, [isOffline, parcoursId]);

  // Extraire les coordonnées du GeoJSON pour tracer la ligne
  const routeCoordinates = useMemo(() => {
    if (!geojsonString) return [];
    try {
      const geojson = JSON.parse(geojsonString);
      if (geojson.type === 'FeatureCollection') {
        const lineFeature = geojson.features.find((f: any) => f.geometry?.type === 'LineString');
        if (lineFeature) {
          return lineFeature.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          }));
        }
      } else if (geojson.type === 'LineString') {
        return geojson.coordinates.map(([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        }));
      } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'LineString') {
        return geojson.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        }));
      }
    } catch (e) {
      console.warn('GeoJSON invalide', e);
    }
    return [];
  }, [geojsonString]);

  // Calcul de la région initiale (Bounding Box)
  const initialRegion = useMemo<Region | undefined>(() => {
    if (!geojsonString) return undefined;
    const bbox = calculateBoundingBox(geojsonString);
    if (!bbox) return undefined;

    const latDelta = bbox.maxLat - bbox.minLat;
    const lngDelta = bbox.maxLng - bbox.minLng;

    return {
      latitude: (bbox.maxLat + bbox.minLat) / 2,
      longitude: (bbox.maxLng + bbox.minLng) / 2,
      latitudeDelta: Math.max(latDelta * 1.5, 0.01),
      longitudeDelta: Math.max(lngDelta * 1.5, 0.01),
    };
  }, [geojsonString]);

  const tileUrl = isOffline && offlineTilesExist
    ? `${getParcoursTilesDir(parcoursId)}{z}/{x}/{y}.png`
    : 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={hasLocationPermission}
        showsCompass={true}
        mapType="none" // IMPORTANT: Désactive le fond de carte par défaut (Google/Apple)
      >
        <UrlTile
          urlTemplate={tileUrl}
          maximumZ={19}
          offlineMode={isOffline} // Pour forcer la lecture du cache local si fourni par l'OS
        />

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#10b981" // emerald-500
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapView>

      {isOffline && !offlineTilesExist && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Les cartes hors-ligne ne sont pas disponibles pour ce parcours.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb', // gray-200 pour le fond en attendant le chargement
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  warningContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  warningText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
  },
});
