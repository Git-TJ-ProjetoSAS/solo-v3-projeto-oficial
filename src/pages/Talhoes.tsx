import { useState, lazy, Suspense } from 'react';
import { useTalhoes } from '@/hooks/useTalhoes';

import { useUserProfile } from '@/hooks/useUserProfile';
import { TalhaoFormDialog } from '@/components/talhoes/TalhaoFormDialog';
import { TalhaoCard } from '@/components/talhoes/TalhaoCard';
import { TalhaoComparative } from '@/components/talhoes/TalhaoComparative';
import { TalhaoListSidebar } from '@/components/talhoes/TalhaoListSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, LayoutGrid, BarChart3, Loader2, TreePine, MapPin, Satellite, Navigation, Map } from 'lucide-react';
import { toast } from 'sonner';

const TalhaoMapView = lazy(() =>
  import('@/components/talhoes/TalhaoMapView').then(m => ({ default: m.TalhaoMapView }))
);
const TalhaoSatelliteView = lazy(() =>
  import('@/components/talhoes/TalhaoSatelliteView').then(m => ({ default: m.TalhaoSatelliteView }))
);
const FarmOverviewMap = lazy(() =>
  import('@/components/talhoes/FarmOverviewMap').then(m => ({ default: m.FarmOverviewMap }))
);

export default function Talhoes() {
  const { talhoes, loading, deleteTalhao, createTalhao, updateTalhao, geocodeMissingCoords } = useTalhoes();
  const { profile } = useUserProfile();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTalhao, setEditingTalhao] = useState<typeof talhoes[number] | null>(null);
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<{ geojson: any; areaHa: number; centerLat: number; centerLng: number } | null>(null);
  const [redrawingTalhaoId, setRedrawingTalhaoId] = useState<string | null>(null);

  const missingCoords = talhoes.filter(t => t.center_lat === null || t.center_lng === null);

  const handleBulkGeocode = async () => {
    if (!profile?.endereco_propriedade) {
      toast.error('Cadastre o endereço da propriedade no seu perfil primeiro');
      return;
    }
    setGeocoding(true);
    await geocodeMissingCoords(profile.endereco_propriedade);
    setGeocoding(false);
  };

  const selectedTalhao = talhoes.find(t => t.id === selectedTalhaoId);

  const handleSavePolygon = async (name: string, geojson: any, areaHa: number, centerLat: number, centerLng: number) => {
    await createTalhao({
      name,
      area_ha: areaHa,
      row_spacing_cm: 350,
      plant_spacing_cm: 70,
      variety: '',
      coffee_type: 'conilon',
      total_plants: 0,
      productivity_target: 0,
      cost_per_ha: 0,
      cost_per_saca: 0,
      fertilization_data: {},
      pest_history: [],
      irrigated: false,
      irrigation_system: 'gotejamento',
      notes: '',
      geojson,
      center_lat: centerLat,
      center_lng: centerLng,
      planting_month: new Date().getMonth() + 1,
      planting_year: new Date().getFullYear(),
    });
    toast.success('Talhão salvo no mapa!');
  };

  const handleUpdatePolygon = async (id: string, geojson: any, areaHa: number, centerLat: number, centerLng: number) => {
    await updateTalhao(id, { geojson, area_ha: areaHa, center_lat: centerLat, center_lng: centerLng } as any);
    toast.success('Polígono do talhão atualizado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestão de Talhões</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre, compare e gerencie seus talhões de café
          </p>
        </div>
        <div className="flex items-center gap-2">
          {missingCoords.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkGeocode} disabled={geocoding} className="gap-1.5">
              {geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              GPS ({missingCoords.length})
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Talhão
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="farm" className="w-full">
          <TabsList className="w-full max-w-lg">
            <TabsTrigger value="farm" className="gap-1.5 flex-1">
              <Map className="w-3.5 h-3.5" />
              Fazenda
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 flex-1">
              <MapPin className="w-3.5 h-3.5" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1.5 flex-1">
              <LayoutGrid className="w-3.5 h-3.5" />
              Talhões
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-1.5 flex-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Comparativo
            </TabsTrigger>
            <TabsTrigger value="satellite" className="gap-1.5 flex-1">
              <Satellite className="w-3.5 h-3.5" />
              Satélite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="farm" className="mt-6">
            <Suspense fallback={<Skeleton className="w-full h-[600px] rounded-2xl" />}>
              <FarmOverviewMap
                talhoes={talhoes as any}
                onSelectTalhao={(t) => { setEditingTalhao(t as any); setFormOpen(true); }}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="map" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar list */}
              <div className="lg:col-span-1 space-y-4">
                <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
                  <div className="p-4 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TreePine className="w-4 h-4 text-primary" />
                      Talhões ({talhoes.length})
                    </h3>
                  </div>
                  <TalhaoListSidebar
                    talhoes={talhoes}
                    selectedId={selectedTalhaoId}
                    onSelect={setSelectedTalhaoId}
                    onRedraw={(id) => setRedrawingTalhaoId(id)}
                    redrawingId={redrawingTalhaoId}
                  />
                </div>

              </div>

              {/* Map */}
              <div className="lg:col-span-3">
                <Suspense fallback={<Skeleton className="w-full h-[500px] rounded-2xl" />}>
                  <TalhaoMapView
                    talhoes={talhoes}
                    onSavePolygon={handleSavePolygon}
                    onUpdatePolygon={handleUpdatePolygon}
                    onPolygonDrawn={(data) => {
                      setPendingPolygon(data);
                      setEditingTalhao(null);
                      setFormOpen(true);
                    }}
                    selectedTalhaoId={selectedTalhaoId}
                    onSelectTalhao={setSelectedTalhaoId}
                    redrawingTalhaoId={redrawingTalhaoId}
                    onCancelRedraw={() => setRedrawingTalhaoId(null)}
                  />
                </Suspense>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="grid" className="mt-6">
            {talhoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
                  <TreePine className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Nenhum talhão cadastrado</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Cadastre seus talhões para comparar performance, custos e produtividade.
                </p>
                <Button onClick={() => setFormOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeiro Talhão
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {talhoes.map(talhao => (
                  <TalhaoCard
                    key={talhao.id}
                    talhao={talhao}
                    onDelete={deleteTalhao}
                    onEdit={(t) => { setEditingTalhao(t); setFormOpen(true); }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="mt-6">
            <TalhaoComparative talhoes={talhoes} />
          </TabsContent>

          <TabsContent value="satellite" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
                  <div className="p-4 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TreePine className="w-4 h-4 text-primary" />
                      Talhões ({talhoes.length})
                    </h3>
                  </div>
                  <TalhaoListSidebar
                    talhoes={talhoes}
                    selectedId={selectedTalhaoId}
                    onSelect={setSelectedTalhaoId}
                  />
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-6">
                  <Suspense fallback={<Skeleton className="w-full h-[400px] rounded-2xl" />}>
                    <TalhaoSatelliteView talhao={selectedTalhao || null} />
                  </Suspense>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <TalhaoFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) { setEditingTalhao(null); setPendingPolygon(null); } }}
        onSubmit={createTalhao}
        polygonData={pendingPolygon}
        editingTalhao={editingTalhao}
        onUpdate={(id, data) => updateTalhao(id, data)}
      />
    </div>
  );
}
