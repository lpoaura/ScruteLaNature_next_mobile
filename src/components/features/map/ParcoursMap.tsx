import React, { useMemo, useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  Camera,
  Map,
  UserLocation,
  RasterSource,
  Layer,
  GeoJSONSource,
  Logger,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { areTilesAvailable, getLocalTileUrlTemplate } from '@/src/services/filesystem.service';
import { calculateBoundingBox } from '@/src/utils/map';

// Suppress MapLibre network errors (like missing tiles or no internet) from showing a Redbox in dev
Logger.setLogCallback((log) => {
  const { message } = log;
  if (
    message.includes('Unable to resolve host') ||
    message.includes('Failed to load tile') ||
    message.includes('Request failed') ||
    message.includes('hostname')
  ) {
    return true; // Return true to suppress the log
  }
  return false;
});

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
        const exist = await areTilesAvailable(parcoursId);
        setOfflineTilesExist(exist);
      })();
    }
  }, [isOffline, parcoursId]);

  // Extraire les coordonnées du GeoJSON pour tracer la ligne
  const routeGeoJSON = useMemo(() => {
    if (!geojsonString) return null;
    try {
      const geojson = JSON.parse(geojsonString);
      let coords: [number, number][] = [];
      if (geojson.type === 'FeatureCollection') {
        const lineFeature = geojson.features.find((f: any) => f.geometry?.type === 'LineString');
        if (lineFeature) coords = lineFeature.geometry.coordinates;
      } else if (geojson.type === 'LineString') {
        coords = geojson.coordinates;
      } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'LineString') {
        coords = geojson.geometry.coordinates;
      }
      if (coords.length > 0) {
        return {
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: coords },
          properties: {},
        };
      }
    } catch (e) {
      console.warn('GeoJSON invalide', e);
    }
    return null;
  }, [geojsonString]);

  // Calcul de la région initiale (Bounding Box)
  const centerAndZoom = useMemo(() => {
    if (!geojsonString) return null;
    const bbox = calculateBoundingBox(geojsonString);
    if (!bbox) return null;
    return {
      center: [(bbox.maxLng + bbox.minLng) / 2, (bbox.maxLat + bbox.minLat) / 2] as [number, number],
      zoom: 13,
    };
  }, [geojsonString]);

  const tileUrlTemplates = isOffline && offlineTilesExist
    ? [getLocalTileUrlTemplate(parcoursId)]
    : ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        logoPosition={{ bottom: -100, right: -100 }}
        attributionPosition={{ bottom: -100, right: -100 }}
        mapStyle=""
      >
        <Camera
          initialViewState={{
            center: centerAndZoom?.center ?? [2.35, 46.5],
            zoom: centerAndZoom?.zoom ?? 5,
          }}
        />
        {hasLocationPermission && <UserLocation animated heading />}

        <RasterSource id="osm" tiles={tileUrlTemplates} tileSize={256}>
          <Layer id="osm-layer" type="raster" source="osm" />
        </RasterSource>

        {routeGeoJSON && (
          <GeoJSONSource id="route" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{ 'line-color': '#007E84', 'line-width': 4, 'line-cap': 'round', 'line-join': 'round' } as any}
            />
          </GeoJSONSource>
        )}
      </Map>

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
