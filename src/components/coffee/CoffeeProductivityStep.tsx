import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCoffee, ProductivityLevel, type RecommendationMode } from '@/contexts/CoffeeContext';
import { useTalhoes } from '@/hooks/useTalhoes';
import { cn } from '@/lib/utils';
import { TrendingUp, Sprout, AlertTriangle, Zap, Hand } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PRODUCTIVITY_RANGES = {
  conilon: {
    baixa: { min: 0, max: 50, label: 'Baixa', color: 'text-muted-foreground' },
    media: { min: 50, max: 80, label: 'Média', color: 'text-foreground' },
    alta: { min: 80, max: 120, label: 'Alta', color: 'text-foreground' },
    muito_alta: { min: 120, max: 150, label: 'Muito Alta', color: 'text-foreground' },
  },
  arabica: {
    baixa: { min: 0, max: 30, label: 'Baixa', color: 'text-muted-foreground' },
    media: { min: 30, max: 50, label: 'Média', color: 'text-foreground' },
    alta: { min: 50, max: 65, label: 'Alta', color: 'text-foreground' },
    muito_alta: { min: 65, max: 80, label: 'Muito Alta', color: 'text-foreground' },
  },
} as const;

const LEVEL_ORDER: ProductivityLevel[] = ['baixa', 'media', 'alta', 'muito_alta'];

export function CoffeeProductivityStep() {
  const { coffeeData, setProductivity, getProductivityLevel, setRecommendationMode } = useCoffee();
  const { talhoes } = useTalhoes();

  const selectedTalhao = useMemo(() => {
    if (!coffeeData.selectedTalhaoId) return null;
    return talhoes.find(t => t.id === coffeeData.selectedTalhaoId) ?? null;
  }, [coffeeData.selectedTalhaoId, talhoes]);

  const isFirstYear = useMemo(() => {
    if (!selectedTalhao) return false;
    const pm = selectedTalhao.planting_month ?? 1;
    const py = selectedTalhao.planting_year ?? 2020;
    const now = new Date();
    const plantDate = new Date(py, pm - 1);
    const diffMonths = (now.getFullYear() - plantDate.getFullYear()) * 12 + (now.getMonth() - plantDate.getMonth());
    return diffMonths >= 0 && diffMonths <= 24;
  }, [selectedTalhao]);

  const talhaoSacas = coffeeData.productivity?.sacasPerHectare;
  const talhaoHectares = coffeeData.hectares;

  const [sacas, setSacas] = useState(
    talhaoSacas?.toString() || ''
  );

  const coffeeType = coffeeData.coffeeType || 'conilon';
  const coffeeLabel = coffeeType === 'conilon' ? 'Conilon' : 'Arábica';
  const ranges = PRODUCTIVITY_RANGES[coffeeType];

  const sacasNum = parseFloat(sacas) || 0;
  const hectaresNum = talhaoHectares || 0;
  const currentLevel = sacasNum > 0 ? getProductivityLevel(sacasNum) : null;

  useEffect(() => {
    if (sacasNum > 0 && hectaresNum > 0) {
      setProductivity({
        sacasPerHectare: sacasNum,
        level: getProductivityLevel(sacasNum),
        hectares: hectaresNum,
      });
    }
  }, [sacas, hectaresNum]);

  const handleSacasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSacas(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Produtividade — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina a produtividade esperada para o cultivo
        </p>
        {hectaresNum > 0 && (
          <p className="text-xs text-primary mt-1">
            Área do talhão: {hectaresNum} ha
          </p>
        )}
      </div>

      {/* 1st Year Warning */}
      {isFirstYear && (
        <Alert className="border-amber-400/50 bg-amber-50">
          <Sprout className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            <strong>Talhão no 1º ano de plantio</strong>
            {selectedTalhao && (
              <span className="text-xs ml-1">
                (plantado em {String(selectedTalhao.planting_month ?? '?').padStart(2, '0')}/{selectedTalhao.planting_year ?? '?'})
              </span>
            )}
            <br />
            <span className="text-xs">
              A produtividade informada será registrada como meta futura. As doses de adubação serão
              calculadas automaticamente para o estágio de desenvolvimento do 1º ano (Ref: EMBRAPA/INCAPER),
              independente do valor de produtividade selecionado.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="coffee-sacas" className="text-sm">
          Produtividade Esperada
        </Label>
        <div className="relative">
          <Input
            id="coffee-sacas"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={sacas}
            onChange={handleSacasChange}
            className="pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            sc/ha
          </span>
        </div>
        {talhaoSacas && talhaoSacas > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Sugestão do talhão: {talhaoSacas} sc/ha (editável)
          </p>
        )}
      </div>

      {/* Productivity Level Indicator */}
      {currentLevel && (
        <div
          className="p-5 bg-secondary rounded-2xl"
          style={{ animation: 'fade-in 0.3s ease-out' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {ranges[currentLevel].label}
              </p>
              <p className="text-xs text-muted-foreground">
                {sacasNum} sacas/ha × {hectaresNum} ha = {(sacasNum * hectaresNum).toFixed(0)} sacas total
              </p>
            </div>
          </div>

          {/* Level Bars */}
          <div className="flex gap-1.5">
            {LEVEL_ORDER.map((level, index) => (
              <div key={level} className="flex-1 space-y-1">
                <div
                  className={cn(
                    'h-2 rounded-full transition-colors',
                    LEVEL_ORDER.indexOf(currentLevel) >= index
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  {ranges[level].label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Ranges */}
      <div className="p-4 bg-secondary rounded-xl">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Faixas de Referência — {coffeeLabel}
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {LEVEL_ORDER.map((level) => (
            <p key={level} className="text-muted-foreground">
              <span className="font-medium text-foreground">{ranges[level].label}:</span>{' '}
              {ranges[level].min}–{ranges[level].max} sc/ha
            </p>
          ))}
        </div>
      </div>

      {/* Recommendation Mode Selector */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Modo de Recomendação
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRecommendationMode('auto')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all text-left space-y-2',
              coffeeData.recommendationMode === 'auto'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            )}
          >
            <div className="flex items-center gap-2">
              <Zap className={cn('w-5 h-5', coffeeData.recommendationMode === 'auto' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-semibold text-foreground">Automática</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              O sistema seleciona os melhores insumos do catálogo e calcula doses automaticamente. Você escolhe apenas o método de pulverização.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setRecommendationMode('manual')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all text-left space-y-2',
              coffeeData.recommendationMode === 'manual'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            )}
          >
            <div className="flex items-center gap-2">
              <Hand className={cn('w-5 h-5', coffeeData.recommendationMode === 'manual' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-semibold text-foreground">Manual</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Você seleciona cada insumo etapa por etapa (Correção, Cobertura, Foliar, etc.) e personaliza doses.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
