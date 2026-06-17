import React from 'react';
import { type ReactNode } from 'react';
import { Map, RasterSource, Layer, GeoJSONSource } from '@maplibre/maplibre-react-native';
import type {
  CameraRef,
  InitialViewState,
  LngLat,
  StyleSpecification,
} from '@maplibre/maplibre-react-native';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type MapRegion = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export const EMPTY_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [],
};

export function toLngLat(coordinate: LatLng): LngLat {
  return [coordinate.longitude, coordinate.latitude];
}

export function regionToZoom(region: Pick<MapRegion, 'longitudeDelta'>): number {
  const zoom = Math.log2(360 / Math.max(region.longitudeDelta, 0.000001));
  return Math.max(0, Math.min(19, zoom));
}

export function regionToInitialViewState(region?: MapRegion): InitialViewState | undefined {
  if (!region) return undefined;
  return {
    center: [region.longitude, region.latitude],
    zoom: regionToZoom(region),
    pitch: 0,
    bearing: 0,
  };
}

export function easeCameraToRegion(
  camera: CameraRef | null,
  region: MapRegion,
  duration = 600
) {
  camera?.easeTo({
    center: [region.longitude, region.latitude],
    zoom: regionToZoom(region),
    duration,
  });
}

export function lineStringFromLatLng(coordinates: LatLng[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: coordinates.map(toLngLat),
    },
  };
}

export function OsmRasterLayer({
  id = 'osm',
  tileUrl,
  maxZoom = 19,
}: {
  id?: string;
  tileUrl: string;
  maxZoom?: number;
}) {
  return (
    <RasterSource id={`${id}-source`} tiles={[tileUrl]} maxzoom={maxZoom} tileSize={256}>
      <Layer id={`${id}-layer`} type="raster" source={`${id}-source`} />
    </RasterSource>
  );
}

export function RouteLine({
  id = 'route',
  coordinates,
  color = '#10b981',
  width = 4,
}: {
  id?: string;
  coordinates: LatLng[];
  color?: string;
  width?: number;
}) {
  if (coordinates.length === 0) return null;

  return (
    <GeoJSONSource id={`${id}-source`} data={lineStringFromLatLng(coordinates)}>
      <Layer
        id={`${id}-layer`}
        type="line"
        source={`${id}-source`}
        layout={{
          'line-join': 'round',
          'line-cap': 'round',
        }}
        paint={{
          'line-color': color,
          'line-width': width,
        }}
      />
    </GeoJSONSource>
  );
}

export function BaseMap({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Map>, 'mapStyle'> & { children?: ReactNode }) {
  return (
    <Map
      {...props}
      mapStyle={EMPTY_MAP_STYLE}
      logo={false}
      attribution={false}
      scaleBar={false}
    >
      {children}
    </Map>
  );
}
