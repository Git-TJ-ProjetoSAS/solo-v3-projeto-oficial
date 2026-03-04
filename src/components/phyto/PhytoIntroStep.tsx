import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, ShieldAlert, MapPin, Coffee, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCoffee, CoffeeType } from '@/contexts/CoffeeContext';
import { usePhyto } from '@/contexts/PhytoContext';
import { useTalhoes } from '@/hooks/useTalhoes';
import { cn } from '@/lib/utils';

const coffeeOptions: { id: CoffeeType; title: string; description: string }[] = [
  { id: 'conilon', title: 'Café Conilon', description: 'Coffea canephora — Robusta brasileiro' },
  { id: 'arabica', title: 'Café Arábica', description: 'Coffea arabica — Grão premium' },
];

export function PhytoIntroStep() {
  const location = useLocation();
  const { coffeeData, setCoffeeType, setHectares, setSelectedTalhao } = useCoffee();
  const { startPhyto } = usePhyto();
  const { talhoes } = useTalhoes();

  // Pre-fill from navigation state (coming from Coffee Intro with talhão)
  const navState = location.state as { coffeeType?: CoffeeType; hectares?: number; talhaoId?: string } | null;
  const navCoffeeType = navState?.coffeeType;
  const navHectares = navState?.hectares;
  const navTalhaoId = navState?.talhaoId;
  const hasNavType = !!navCoffeeType;
  const hasNavHectares = !!navHectares && navHectares > 0;

  const [localHectares, setLocalHectares] = useState(navHectares || coffeeData.hectares || '');
  const [selectedTalhaoId, setSelectedTalhaoIdLocal] = useState<string>(navTalhaoId || coffeeData.selectedTalhaoId || '');

  useEffect(() => {
    if (navCoffeeType && !coffeeData.coffeeType) {
      setCoffeeType(navCoffeeType);
    }
    if (hasNavHectares) {
      setHectares(navHectares);
    }
    if (navTalhaoId) {
      setSelectedTalhao(navTalhaoId);
    }
  }, [navCoffeeType, navHectares, navTalhaoId]);

  const handleTalhaoChange = (talhaoId: string) => {
    setSelectedTalhaoIdLocal(talhaoId);
    setSelectedTalhao(talhaoId === 'none' ? null : talhaoId);
    
    if (talhaoId !== 'none') {
      const talhao = talhoes.find(t => t.id === talhaoId);
      if (talhao) {
        setLocalHectares(talhao.area_ha);
        setHectares(talhao.area_ha);
      }
    }
  };

  const selectedTalhao = talhoes.find(t => t.id === selectedTalhaoId);

  const canStart = coffeeData.coffeeType && Number(localHectares) > 0;

  const handleStart = () => {
    if (canStart) {
      setHectares(Number(localHectares));
      startPhyto();
    }
  };

  const selectedLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : coffeeData.coffeeType === 'arabica' ? 'Arábica' : '';

  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-center"
      style={{ animation: 'fade-in 0.4s ease-out' }}
    >
      <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8 text-destructive" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
        Controle Fitossanitário
        {selectedLabel && (
          <span className="text-primary"> — {selectedLabel}</span>
        )}
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Manejo de doenças e pragas do café com cálculo de calda e custos por hectare.
      </p>

      {/* Show coffee type selection only if NOT coming from coffee intro */}
      {!hasNavType && (
        <div className="grid gap-3 w-full max-w-md mb-6">
          {coffeeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setCoffeeType(option.id)}
              className={cn(
                'w-full text-left p-5 rounded-2xl border transition-all duration-200',
                coffeeData.coffeeType === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    coffeeData.coffeeType === option.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <Coffee className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{option.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Talhão Selector */}
      {talhoes.length > 0 && (
        <div className="w-full max-w-md mb-4">
          <div className="p-4 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <Sprout className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Talhão (opcional)</span>
            </div>
            <Select value={selectedTalhaoId} onValueChange={handleTalhaoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um talhão..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (informar área manual)</SelectItem>
                {talhoes.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — {t.area_ha} ha {t.irrigated ? '💧' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTalhao && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {selectedTalhao.area_ha} ha
                </Badge>
                <Badge variant="outline" className={cn(
                  'text-[10px]',
                  selectedTalhao.irrigated 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                )}>
                  {selectedTalhao.irrigated ? '💧 Irrigado' : '🚫 Não irrigado'}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {selectedTalhao.variety || selectedTalhao.coffee_type}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hectares Input */}
      <div className="w-full max-w-md mb-8">
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Área de Aplicação</span>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="Ex: 10"
              value={localHectares}
              onChange={(e) => {
                setLocalHectares(e.target.value);
              }}
              className={cn('text-lg font-semibold text-center', (hasNavHectares || selectedTalhaoId) && 'bg-muted cursor-not-allowed')}
              readOnly={hasNavHectares || !!selectedTalhaoId}
            />
            <span className="text-sm text-muted-foreground font-medium shrink-0">hectares</span>
          </div>
          {hasNavHectares && (
            <p className="text-xs text-muted-foreground mt-2">
              Área do talhão selecionado
            </p>
          )}
        </div>
      </div>

      <Button
        size="lg"
        onClick={handleStart}
        disabled={!canStart}
        className="gap-2 px-8"
      >
        Iniciar
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
