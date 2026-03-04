import { kml } from '@tmcw/togeojson';
import area from '@turf/area';
import centroid from '@turf/centroid';
import { polygon as turfPolygon } from '@turf/helpers';

export interface ImportedPolygon {
  geojson: GeoJSON.Geometry;
  areaHa: number;
  centerLat: number;
  centerLng: number;
}

function extractFirstPolygon(geojson: GeoJSON.GeoJSON): GeoJSON.Polygon | null {
  if (geojson.type === 'Polygon') return geojson;
  if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') return geojson.geometry;
  if (geojson.type === 'FeatureCollection') {
    for (const f of geojson.features) {
      if (f.geometry?.type === 'Polygon') return f.geometry;
    }
  }
  return null;
}

export async function importGeoFile(file: File): Promise<ImportedPolygon> {
  const text = await file.text();
  let geojsonData: GeoJSON.GeoJSON;

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'kml') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    geojsonData = kml(doc) as GeoJSON.GeoJSON;
  } else if (ext === 'geojson' || ext === 'json') {
    geojsonData = JSON.parse(text);
  } else {
    throw new Error('Formato não suportado. Use .kml, .geojson ou .json');
  }

  const polygon = extractFirstPolygon(geojsonData);
  if (!polygon) {
    throw new Error('Nenhum polígono encontrado no arquivo');
  }

  const turfPoly = turfPolygon(polygon.coordinates);
  const areaM2 = area(turfPoly);
  const areaHa = Math.round((areaM2 / 10000) * 100) / 100;
  const center = centroid(turfPoly);
  const [lng, lat] = center.geometry.coordinates;

  return { geojson: polygon, areaHa, centerLat: lat, centerLng: lng };
}
