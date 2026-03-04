export type TileType = 'osm' | 'satellite';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const TILE_URLS: Record<TileType, { url: string; attribution: string; maxNativeZoom: number }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxNativeZoom: 19,
  },
  satellite: {
    url: GOOGLE_MAPS_API_KEY
      ? `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_API_KEY}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: GOOGLE_MAPS_API_KEY ? '&copy; Google Maps' : '&copy; Esri',
    maxNativeZoom: GOOGLE_MAPS_API_KEY ? 22 : 18,
  },
};
