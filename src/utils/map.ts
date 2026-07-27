/**
 * Utilitaires pour la cartographie hors-ligne (OpenStreetMap)
 */

/**
 * Boîte englobante d'un tracé GPS
 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Calcule la Bounding Box à partir d'un fichier GeoJSON (LineString).
 * @param padding Padding optionnel en degrés (ex: 0.005 pour ~500m) pour élargir la zone
 */
export function calculateBoundingBox(
  geojsonString: string, 
  padding: number = 0,
  extraCoords: { lat: number, lng: number }[] = []
): BoundingBox | null {
  try {
    const geojson = JSON.parse(geojsonString);
    let coordinates: [number, number][] = [];

    if (geojson.type === 'FeatureCollection') {
      geojson.features.forEach((feature: any) => {
        if (feature.geometry?.type === 'LineString') {
          coordinates = coordinates.concat(feature.geometry.coordinates);
        } else if (feature.geometry?.type === 'Polygon') {
          feature.geometry.coordinates.forEach((ring: any) => {
            coordinates = coordinates.concat(ring);
          });
        }
      });
    } else if (geojson.type === 'LineString') {
      coordinates = geojson.coordinates;
    } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'LineString') {
      coordinates = geojson.geometry.coordinates;
    }

    // Include extra coordinates (like etapes)
    extraCoords.forEach(c => {
      coordinates.push([c.lng, c.lat]);
    });

    if (coordinates.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    coordinates.forEach(([lng, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    return { 
      minLat: minLat - padding, 
      maxLat: maxLat + padding, 
      minLng: minLng - padding, 
      maxLng: maxLng + padding 
    };
  } catch (err) {
    console.error('Erreur lors du calcul de la Bounding Box du GeoJSON:', err);
    return null;
  }
}

/**
 * Convertit une longitude en coordonnée X de tuile (Tile X)
 */
export function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

/**
 * Convertit une latitude en coordonnée Y de tuile (Tile Y)
 */
export function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}
