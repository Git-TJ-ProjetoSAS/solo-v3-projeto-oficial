import { useState, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { Search, Loader2 } from 'lucide-react';

export function MapSearchControl() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch (e) {
      console.error('Geocoding error:', e);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(value), 500);
  };

  const flyToResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    map.flyTo([lat, lng], 15, { duration: 1.5 });
    setQuery(result.display_name.split(',').slice(0, 2).join(', '));
    setShowResults(false);
  };

  return (
    <div className="absolute top-3 left-3 z-[1000] w-72">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar município ou local..."
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="w-full h-9 pl-8 pr-8 rounded-lg border border-border bg-background/95 backdrop-blur text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {showResults && results.length > 0 && (
        <ul className="mt-1 rounded-lg border border-border bg-background/95 backdrop-blur shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => flyToResult(r)}
              className="px-3 py-2 text-xs cursor-pointer hover:bg-accent transition-colors border-b border-border/50 last:border-0"
            >
              <p className="font-medium text-foreground truncate">{r.display_name.split(',').slice(0, 2).join(', ')}</p>
              <p className="text-muted-foreground truncate">{r.display_name.split(',').slice(2).join(',').trim()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
