import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCoffee } from '@/contexts/CoffeeContext';
import { cn } from '@/lib/utils';

export function CoffeeCalcSoilStep() {
  const { coffeeData } = useCoffee();
  const soil = coffeeData.soil;
  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

  if (!soil) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Dados Insuficientes
        </h2>
        <p className="text-sm text-muted-foreground">
          Volte e preencha os macronutrientes obrigatórios.
        </p>
      </div>
    );
  }

  const isIdeal = soil.vPercent >= 60 && soil.vPercent <= 70;
  const needsCorrection = soil.vPercent < 60;

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          V% — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Saturação por Bases
        </p>
      </div>

      {/* Result Card */}
      <div
        className="p-8 rounded-2xl text-center bg-secondary"
        style={{ animation: 'scale-in 0.3s ease-out' }}
      >
        <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto mb-4">
          {needsCorrection ? (
            <AlertTriangle className="w-8 h-8 text-background" />
          ) : (
            <CheckCircle2 className="w-8 h-8 text-background" />
          )}
        </div>

        <p className="text-5xl font-bold text-foreground mb-2">
          {soil.vPercent.toFixed(1)}%
        </p>

        <p className="text-sm font-medium text-foreground">
          {needsCorrection ? 'Correção Recomendada' : isIdeal ? 'Saturação Ideal' : 'Saturação Adequada'}
        </p>

        <p className="text-xs text-muted-foreground mt-2">
          V% ideal para café: entre 60% e 70%
        </p>
      </div>

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="p-4 bg-secondary rounded-xl">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Fórmulas Aplicadas
          </p>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">SB</span> = {(soil.ca + soil.mg + (soil.k / 391)).toFixed(2)} cmolc/dm³</p>
            <p><span className="font-medium">CTC</span> = {(soil.ca + soil.mg + (soil.k / 391) + soil.hAl).toFixed(2)} cmolc/dm³</p>
          </div>
        </div>

        <div className="p-4 bg-secondary rounded-xl">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Valores Inseridos
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Ca:</span> {soil.ca}</p>
            <p><span className="text-muted-foreground">Mg:</span> {soil.mg}</p>
            <p><span className="text-muted-foreground">K:</span> {soil.k}</p>
            <p><span className="text-muted-foreground">H+Al:</span> {soil.hAl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
