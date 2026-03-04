import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, MapPin, Ruler, TreePine, Coffee, Droplets, Calendar, Loader2, Upload } from 'lucide-react';
import { calcTotalPlants, type TalhaoInsert } from '@/hooks/useTalhoes';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { importGeoFile } from '@/lib/geoImporter';

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export interface PolygonData {
  geojson: any;
  areaHa: number;
  centerLat: number;
  centerLng: number;
}

interface TalhaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<TalhaoInsert, 'user_id'>) => Promise<unknown>;
  defaultCoffeeType?: 'conilon' | 'arabica';
  polygonData?: PolygonData | null;
  editingTalhao?: {
    id: string;
    name: string;
    area_ha: number;
    row_spacing_cm: number;
    plant_spacing_cm: number;
    variety: string;
    coffee_type: 'conilon' | 'arabica';
    productivity_target: number;
    cost_per_ha: number;
    irrigated: boolean;
    irrigation_system: 'gotejamento' | 'aspersao' | 'pivo';
    drip_flow_rate_lh?: number;
    drip_spacing_m?: number;
    is_autocompensating?: boolean;
    notes: string;
  } | null;
  onUpdate?: (id: string, data: Omit<TalhaoInsert, 'user_id'>) => Promise<unknown>;
}

const VARIETIES_CONILON = ['Vitória INCAPER 8142', 'Diamante ES8112', 'Jequitibá ES8122', 'Centenária ES8132', 'Marilândia ES8143', 'Outra'];
const VARIETIES_ARABICA = ['Catuaí Vermelho', 'Catuaí Amarelo', 'Mundo Novo', 'Bourbon Amarelo', 'Topázio', 'Acaiá', 'Outra'];

type ProductivityLevel = 'baixa' | 'media' | 'alta' | 'muito_alta';

const PRODUCTIVITY_RANGES: Record<string, Record<ProductivityLevel, { min: number; max: number; label: string; midpoint: number }>> = {
  conilon: {
    baixa: { min: 0, max: 50, label: 'Baixa', midpoint: 30 },
    media: { min: 50, max: 80, label: 'Média', midpoint: 65 },
    alta: { min: 80, max: 120, label: 'Alta', midpoint: 100 },
    muito_alta: { min: 120, max: 150, label: 'Muito Alta', midpoint: 135 },
  },
  arabica: {
    baixa: { min: 0, max: 30, label: 'Baixa', midpoint: 20 },
    media: { min: 30, max: 50, label: 'Média', midpoint: 40 },
    alta: { min: 50, max: 65, label: 'Alta', midpoint: 57 },
    muito_alta: { min: 65, max: 80, label: 'Muito Alta', midpoint: 72 },
  },
};

const LEVEL_ORDER: ProductivityLevel[] = ['baixa', 'media', 'alta', 'muito_alta'];

export function TalhaoFormDialog({ open, onOpenChange, onSubmit, defaultCoffeeType, polygonData, editingTalhao, onUpdate }: TalhaoFormDialogProps) {
  const isEditing = !!editingTalhao;
  const [name, setName] = useState('');
  const [areaHa, setAreaHa] = useState('');
  const [rowSpacing, setRowSpacing] = useState('350');
  const [plantSpacing, setPlantSpacing] = useState('70');
  const [variety, setVariety] = useState('');
  const [coffeeType, setCoffeeType] = useState<'conilon' | 'arabica'>(defaultCoffeeType || 'conilon');
  const [selectedLevel, setSelectedLevel] = useState<ProductivityLevel | ''>('');
  const [productivityTarget, setProductivityTarget] = useState('');
  const [costPerHa, setCostPerHa] = useState('');
  const [notes, setNotes] = useState('');
  const [irrigated, setIrrigated] = useState(false);
  const [irrigationSystem, setIrrigationSystem] = useState<'gotejamento' | 'aspersao' | 'pivo'>('gotejamento');
  const [dripFlowRate, setDripFlowRate] = useState('');
  const [dripSpacing, setDripSpacing] = useState('');
  const [isAutocompensating, setIsAutocompensating] = useState(true);
  const [plantingMonth, setPlantingMonth] = useState(new Date().getMonth() + 1);
  const [plantingYear, setPlantingYear] = useState(new Date().getFullYear());
  const [operationStatus, setOperationStatus] = useState('producao');
  const { profile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [importedPolygon, setImportedPolygon] = useState<PolygonData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const effectivePolygon = polygonData || importedPolygon;

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importGeoFile(file);
      setImportedPolygon({ geojson: result.geojson, areaHa: result.areaHa, centerLat: result.centerLat, centerLng: result.centerLng });
      setAreaHa(result.areaHa.toString());
      toast.success(`Polígono importado: ${result.areaHa} ha`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar arquivo');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Populate form when editing
  useEffect(() => {
    if (editingTalhao) {
      setName(editingTalhao.name);
      setAreaHa(editingTalhao.area_ha.toString());
      setRowSpacing(editingTalhao.row_spacing_cm.toString());
      setPlantSpacing(editingTalhao.plant_spacing_cm.toString());
      setVariety(editingTalhao.variety || '');
      setCoffeeType(editingTalhao.coffee_type);
      setProductivityTarget(editingTalhao.productivity_target > 0 ? editingTalhao.productivity_target.toString() : '');
      setCostPerHa(editingTalhao.cost_per_ha > 0 ? editingTalhao.cost_per_ha.toString() : '');
      setIrrigated(editingTalhao.irrigated ?? false);
      setIrrigationSystem(editingTalhao.irrigation_system ?? 'gotejamento');
      setDripFlowRate(editingTalhao.drip_flow_rate_lh && editingTalhao.drip_flow_rate_lh > 0 ? editingTalhao.drip_flow_rate_lh.toString() : '');
      setDripSpacing(editingTalhao.drip_spacing_m && editingTalhao.drip_spacing_m > 0 ? editingTalhao.drip_spacing_m.toString() : '');
      setIsAutocompensating(editingTalhao.is_autocompensating ?? true);
      setPlantingMonth((editingTalhao as any).planting_month ?? new Date().getMonth() + 1);
      setPlantingYear((editingTalhao as any).planting_year ?? new Date().getFullYear());
      setOperationStatus((editingTalhao as any).operation_status || 'producao');
      setNotes(editingTalhao.notes || '');
      setImportedPolygon(null);
      if (editingTalhao.productivity_target > 0) {
        const ranges = PRODUCTIVITY_RANGES[editingTalhao.coffee_type];
        const matchedLevel = LEVEL_ORDER.find(l => {
          const r = ranges[l];
          return editingTalhao.productivity_target >= r.min && editingTalhao.productivity_target <= r.max;
        });
        setSelectedLevel(matchedLevel || '');
      } else {
        setSelectedLevel('');
      }
    } else {
      setName('');
      setAreaHa(polygonData ? polygonData.areaHa.toString() : '');
      setRowSpacing('350');
      setPlantSpacing('70');
      setVariety('');
      setCoffeeType(defaultCoffeeType || 'conilon');
      setSelectedLevel('');
      setProductivityTarget('');
      setCostPerHa('');
      setIrrigated(false);
      setIrrigationSystem('gotejamento');
      setDripFlowRate('');
      setDripSpacing('');
      setIsAutocompensating(true);
      setPlantingMonth(new Date().getMonth() + 1);
      setPlantingYear(new Date().getFullYear());
      setOperationStatus('producao');
      setNotes('');
      setImportedPolygon(null);
    }
  }, [editingTalhao, defaultCoffeeType, polygonData]);

  // When level changes, set midpoint as default productivity
  useEffect(() => {
    if (selectedLevel) {
      const ranges = PRODUCTIVITY_RANGES[coffeeType];
      const range = ranges[selectedLevel];
      setProductivityTarget(range.midpoint.toString());
    }
  }, [selectedLevel, coffeeType]);

  // Reset level when coffee type changes
  useEffect(() => {
    setSelectedLevel('');
    setProductivityTarget('');
  }, [coffeeType]);

  const totalPlants = useMemo(() => {
    return calcTotalPlants(
      parseFloat(areaHa) || 0,
      parseFloat(rowSpacing) || 0,
      parseFloat(plantSpacing) || 0
    );
  }, [areaHa, rowSpacing, plantSpacing]);

  const plantsPerHa = useMemo(() => {
    const rs = parseFloat(rowSpacing) || 0;
    const ps = parseFloat(plantSpacing) || 0;
    if (rs <= 0 || ps <= 0) return 0;
    return Math.round(10000 / ((rs / 100) * (ps / 100)));
  }, [rowSpacing, plantSpacing]);

  const varieties = coffeeType === 'conilon' ? VARIETIES_CONILON : VARIETIES_ARABICA;

  const dripFlowNum = parseFloat(dripFlowRate);
  const dripSpacingNum = parseFloat(dripSpacing);
  const dripFlowError = dripFlowRate !== '' && (dripFlowNum < 0.5 || dripFlowNum > 10);
  const dripSpacingError = dripSpacing !== '' && (dripSpacingNum < 0.1 || dripSpacingNum > 2.0);

  const canSubmit = name.trim() && parseFloat(areaHa) > 0 && !dripFlowError && !dripSpacingError;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    const sacas = parseFloat(productivityTarget) || 0;
    const cost = parseFloat(costPerHa) || 0;
    const costPerSaca = sacas > 0 ? cost / sacas : 0;

    // Use polygon data if available, otherwise try geocoding
    let geoLat: number | null = effectivePolygon?.centerLat ?? null;
    let geoLng: number | null = effectivePolygon?.centerLng ?? null;
    let geoJson: any = effectivePolygon?.geojson ?? null;

    if (!geoLat && !geoLng) {
      const address = profile?.endereco_propriedade;
      if (address && address.trim().length > 3) {
        const coords = await geocodeAddress(address);
        if (coords) {
          geoLat = coords.lat;
          geoLng = coords.lng;
          toast.info('📍 Coordenadas GPS preenchidas automaticamente');
        }
      }
    }

    const formData = {
      name: name.trim(),
      area_ha: parseFloat(areaHa),
      row_spacing_cm: parseFloat(rowSpacing) || 350,
      plant_spacing_cm: parseFloat(plantSpacing) || 70,
      variety,
      coffee_type: coffeeType,
      total_plants: totalPlants,
      productivity_target: sacas,
      cost_per_ha: cost,
      cost_per_saca: costPerSaca,
      fertilization_data: {},
      pest_history: [],
      irrigated,
      irrigation_system: irrigationSystem,
      drip_flow_rate_lh: parseFloat(dripFlowRate) || 0,
      drip_spacing_m: parseFloat(dripSpacing) || 0,
      is_autocompensating: isAutocompensating,
      planting_month: plantingMonth,
      planting_year: plantingYear,
      operation_status: operationStatus,
      notes,
      geojson: geoJson,
      center_lat: geoLat,
      center_lng: geoLng,
    };

    if (isEditing && onUpdate) {
      await onUpdate(editingTalhao!.id, formData);
    } else {
      await onSubmit(formData);
    }

    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Talhão' : 'Cadastrar Talhão'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Altere os dados do talhão.' : 'Preencha os dados do talhão. O número de covas é calculado automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="talhao-name">Nome do Talhão *</Label>
            <Input
              id="talhao-name"
              placeholder="Ex: Talhão 1 - Encosta"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Coffee Type - only show when not pre-set */}
          {!defaultCoffeeType && (
          <div className="space-y-2">
            <Label>Tipo de Café</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['conilon', 'arabica'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setCoffeeType(type); setVariety(''); }}
                  className={cn(
                    'p-4 rounded-xl border-2 text-center transition-all',
                    coffeeType === type
                      ? type === 'conilon'
                        ? 'border-sky-500 bg-sky-500/10'
                        : 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border bg-card hover:border-primary/30'
                  )}
                >
                  <Coffee className={cn(
                    'w-5 h-5 mx-auto mb-1',
                    coffeeType === type
                      ? type === 'conilon' ? 'text-sky-500' : 'text-emerald-500'
                      : 'text-muted-foreground'
                  )} />
                  <p className="text-sm font-medium">{type === 'conilon' ? 'Conilon' : 'Arábica'}</p>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Polygon data indicator */}
          {effectivePolygon && !isEditing && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Polígono vinculado</p>
                <p className="text-xs text-muted-foreground">
                  Área: {effectivePolygon.areaHa} ha • Lat: {effectivePolygon.centerLat.toFixed(4)}° • Lng: {effectivePolygon.centerLng.toFixed(4)}°
                </p>
              </div>
            </div>
          )}

          {/* Import KML/GeoJSON */}
          {!isEditing && !polygonData && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,.geojson,.json"
                className="hidden"
                onChange={handleFileImport}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'Importando...' : 'Importar Mapa (KML/GeoJSON)'}
              </Button>
            </div>
          )}

          {/* Area */}
          <div className="space-y-2">
            <Label htmlFor="talhao-area" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Área (ha) *
            </Label>
            <Input
              id="talhao-area"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="Ex: 5"
              value={areaHa}
              onChange={e => setAreaHa(e.target.value)}
              readOnly={!!effectivePolygon && !isEditing}
              className={effectivePolygon && !isEditing ? 'bg-muted' : ''}
            />
          </div>

          {/* Spacing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="row-spacing" className="flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" />
                Entre Linhas (cm)
              </Label>
              <Input
                id="row-spacing"
                type="number"
                step="10"
                min="100"
                placeholder="350"
                value={rowSpacing}
                onChange={e => setRowSpacing(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plant-spacing" className="flex items-center gap-1.5">
                <TreePine className="w-3.5 h-3.5" />
                Entre Plantas (cm)
              </Label>
              <Input
                id="plant-spacing"
                type="number"
                step="5"
                min="20"
                placeholder="70"
                value={plantSpacing}
                onChange={e => setPlantSpacing(e.target.value)}
              />
            </div>
          </div>

          {/* Auto-calculated plants */}
          {(parseFloat(areaHa) > 0 && parseFloat(rowSpacing) > 0 && parseFloat(plantSpacing) > 0) && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Número Total de Covas/Plantas
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalPlants.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {plantsPerHa.toLocaleString('pt-BR')} plantas/ha
              </p>
            </div>
          )}

          {/* Variety */}
          <div className="space-y-2">
            <Label>Variedade</Label>
            <Select value={variety} onValueChange={setVariety}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a variedade..." />
              </SelectTrigger>
              <SelectContent>
                {varieties.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Planting Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Data de Plantio *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={plantingMonth.toString()} onValueChange={(v) => setPlantingMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                    <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={plantingYear}
                onChange={(e) => setPlantingYear(Number(e.target.value))}
                placeholder="Ano"
              />
            </div>
          </div>

          {/* Irrigation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" />
                Irrigação
              </Label>
              <Switch
                checked={irrigated}
                onCheckedChange={setIrrigated}
              />
            </div>
            {irrigated && (
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'gotejamento' as const, label: 'Gotejamento', icon: '💧' },
                  { id: 'aspersao' as const, label: 'Aspersão', icon: '🌊' },
                  { id: 'pivo' as const, label: 'Pivô', icon: '🔄' },
                ] as const).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setIrrigationSystem(s.id)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-center transition-all',
                      irrigationSystem === s.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <p className={cn('text-xs font-medium mt-1', irrigationSystem === s.id ? 'text-primary' : 'text-muted-foreground')}>
                      {s.label}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {irrigated && irrigationSystem === 'gotejamento' && (
              <div className="space-y-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Dados do Gotejamento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Vazão do Gotejador (L/h)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10"
                      placeholder="Ex: 2.3"
                      value={dripFlowRate}
                      onChange={e => setDripFlowRate(e.target.value)}
                      className={cn(dripFlowError && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {dripFlowError && (
                      <p className="text-[10px] text-destructive font-medium">Deve ser entre 0.5 e 10 L/h</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Espaçamento Gotejadores (m)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      placeholder="Ex: 0.5"
                      value={dripSpacing}
                      onChange={e => setDripSpacing(e.target.value)}
                      className={cn(dripSpacingError && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {dripSpacingError && (
                      <p className="text-[10px] text-destructive font-medium">Deve ser entre 0.1 e 2.0 m</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Mangueira Autocompensante</Label>
                  <Switch
                    checked={isAutocompensating}
                    onCheckedChange={setIsAutocompensating}
                  />
                </div>
                {parseFloat(dripFlowRate) > 0 && parseFloat(dripSpacing) > 0 && parseFloat(rowSpacing) > 0 && (
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Taxa de Aplicação</p>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      {(parseFloat(dripFlowRate) / (parseFloat(dripSpacing) * (parseFloat(rowSpacing) / 100))).toFixed(2)} mm/h
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Productivity Level */}
          <div className="space-y-2">
            <Label>Meta de Produtividade</Label>
            <div className="grid grid-cols-2 gap-2">
              {LEVEL_ORDER.map((level) => {
                const ranges = PRODUCTIVITY_RANGES[coffeeType];
                const range = ranges[level];
                const isActive = selectedLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-center transition-all',
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                      {range.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {range.min}–{range.max} sc/ha
                    </p>
                  </button>
                );
              })}
            </div>
            {selectedLevel && (
              <div className="flex items-center gap-3 mt-2">
                <Input
                  type="number"
                  step="1"
                  min={PRODUCTIVITY_RANGES[coffeeType][selectedLevel].min}
                  max={PRODUCTIVITY_RANGES[coffeeType][selectedLevel].max}
                  value={productivityTarget}
                  onChange={e => setProductivityTarget(e.target.value)}
                  className="text-center font-semibold"
                />
                <span className="text-sm text-muted-foreground shrink-0">sc/ha</span>
              </div>
            )}
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost-ha">Custo (R$/ha)</Label>
            <Input
              id="cost-ha"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 8500"
              value={costPerHa}
              onChange={e => setCostPerHa(e.target.value)}
            />
          </div>

          {/* Operation Status */}
          <div className="space-y-2">
            <Label>Status Operacional</Label>
            <Select value={operationStatus} onValueChange={setOperationStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producao">🌿 Em Produção</SelectItem>
                <SelectItem value="plantio">🌱 Plantio</SelectItem>
                <SelectItem value="colheita">🌾 Colheita</SelectItem>
                <SelectItem value="pousio">⏸ Pousio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="talhao-notes">Observações</Label>
            <Textarea
              id="talhao-notes"
              placeholder="Anotações sobre o talhão..."
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="w-full gap-2"
            size="lg"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Talhão'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
