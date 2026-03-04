import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Leaf, MapPin, Coffee, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCoffee, CoffeeType } from '@/contexts/CoffeeContext';
import { useFoliar } from '@/contexts/FoliarContext';
import { cn } from '@/lib/utils';

const coffeeOptions: { id: CoffeeType; title: string; description: string }[] = [
  { id: 'conilon', title: 'Café Conilon', description: 'Coffea canephora — Robusta brasileiro' },
  { id: 'arabica', title: 'Café Arábica', description: 'Coffea arabica — Grão premium' },
];

export function FoliarIntroStep() {
  const location = useLocation();
  const { coffeeData, setCoffeeType, setHectares, setProductivity, getProductivityLevel, setSelectedTalhao } = useCoffee();
  const { startFoliar } = useFoliar();

  // Pre-fill from navigation state (coming from Coffee Intro with talhão)
  const navState = location.state as { coffeeType?: CoffeeType; hectares?: number; productivityTarget?: number; talhaoId?: string } | null;
  const navCoffeeType = navState?.coffeeType;
  const navTalhaoId = navState?.talhaoId || null;
  const navHectares = navState?.hectares;
  const navProductivity = navState?.productivityTarget;
  const hasNavType = !!navCoffeeType;
  const hasNavHectares = !!navHectares && navHectares > 0;
  const hasNavProductivity = !!navProductivity && navProductivity > 0;

  const [localHectares, setLocalHectares] = useState(navHectares || coffeeData.hectares || '');
  const [localSacas, setLocalSacas] = useState(navProductivity || coffeeData.productivity?.sacasPerHectare || '');

  // Auto-skip intro when talhão data is complete
  useEffect(() => {
    if (navTalhaoId) {
      setSelectedTalhao(navTalhaoId);
    }
    if (navCoffeeType) {
      setCoffeeType(navCoffeeType);
    }
    if (hasNavHectares) {
      setHectares(navHectares);
    }
    // If all data comes from talhão, skip this step entirely
    if (navCoffeeType && hasNavHectares && hasNavProductivity) {
      const ha = navHectares;
      const sacas = navProductivity;
      setHectares(ha);
      setProductivity({
        sacasPerHectare: sacas,
        level: getProductivityLevel(sacas),
        hectares: ha,
      });
      startFoliar();
    }
  }, [navCoffeeType, navHectares, navProductivity]);

  const sacasRange = coffeeData.coffeeType === 'conilon'
    ? { min: 30, max: 150, placeholder: '30–150' }
    : { min: 20, max: 80, placeholder: '20–80' };

  const canStart = coffeeData.coffeeType && Number(localHectares) > 0 && Number(localSacas) > 0;

  const handleStart = () => {
    if (canStart) {
      const ha = Number(localHectares);
      const sacas = Number(localSacas);
      setHectares(ha);
      setProductivity({
        sacasPerHectare: sacas,
        level: getProductivityLevel(sacas),
        hectares: ha,
      });
      startFoliar();
    }
  };

  const selectedLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : coffeeData.coffeeType === 'arabica' ? 'Arábica' : '';

  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-center"
      style={{ animation: 'fade-in 0.4s ease-out' }}
    >
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
        <Leaf className="w-8 h-8 text-emerald-500" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
        Adubação Foliar
        {selectedLabel && (
          <span className="text-primary"> — {selectedLabel}</span>
        )}
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Diagnóstico foliar, fertirrigação e pulverização com relatório de custos por hectare e por saca.
      </p>

      {/* Coffee type selection (only if not from navigation) */}
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

      {/* Hectares + Productivity Inputs */}
      <div className="w-full max-w-md space-y-4 mb-8">
        {/* Hectares */}
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
              onChange={(e) => setLocalHectares(e.target.value)}
              className={cn('text-lg font-semibold text-center', hasNavHectares && 'bg-muted cursor-not-allowed')}
              readOnly={hasNavHectares}
            />
            <span className="text-sm text-muted-foreground font-medium shrink-0">hectares</span>
          </div>
          {hasNavHectares && (
            <p className="text-xs text-muted-foreground mt-2">
              Área do talhão selecionado
            </p>
          )}
        </div>

        {/* Productivity */}
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Meta de Produtividade</span>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              step="1"
              min={sacasRange.min}
              max={sacasRange.max}
              placeholder={sacasRange.placeholder}
              value={localSacas}
              onChange={(e) => setLocalSacas(e.target.value)}
              className="text-lg font-semibold text-center"
              disabled={!coffeeData.coffeeType}
            />
            <span className="text-sm text-muted-foreground font-medium shrink-0">sc/ha</span>
          </div>
          {hasNavProductivity ? (
            <p className="text-xs text-muted-foreground mt-2">
              Sugestão do talhão: {navProductivity} sc/ha (editável)
            </p>
          ) : coffeeData.coffeeType ? (
            <p className="text-xs text-muted-foreground mt-2">
              Faixa recomendada: {sacasRange.min}–{sacasRange.max} sacas/ha
            </p>
          ) : null}
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
