import { DollarSign, TrendingUp, Gauge, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { PEAK_MULTIPLIER, type IrrigationCostResult } from '@/lib/irrigationEngine';

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

interface EnergyCostCardProps {
  tarifaEnergia: number;
  setTarifaEnergia: (v: number) => void;
  evitarPonta: boolean;
  setEvitarPonta: (v: boolean) => void;
  costResult: IrrigationCostResult;
  areaTalhao: number;
  talhaoName?: string;
  showResults: boolean;
}

export function EnergyCostCard({
  tarifaEnergia,
  setTarifaEnergia,
  evitarPonta,
  setEvitarPonta,
  costResult,
  areaTalhao,
  talhaoName,
  showResults,
}: EnergyCostCardProps) {
  return (
    <>
      <Card className="border-stone-300 dark:border-stone-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Configuração de Custo de Energia
          </CardTitle>
          {talhaoName && (
            <p className="text-xs text-muted-foreground mt-1">
              Calculando para: <strong>{talhaoName}</strong> ({areaTalhao} ha)
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tarifa" className="text-sm font-medium">
                Tarifa de Energia (R$/kWh)
              </Label>
              <Input
                id="tarifa"
                type="number"
                min={0.01}
                step={0.01}
                value={tarifaEnergia}
                onChange={(e) => setTarifaEnergia(Math.max(0.01, parseFloat(e.target.value) || 0.45))}
                className="text-center text-lg font-semibold h-12"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="evitar-ponta" className="text-sm font-medium">
                Evitar Horário de Ponta (18h–21h)
              </Label>
              <p className="text-xs text-muted-foreground">
                Irrigar fora da ponta reduz custos significativamente
              </p>
            </div>
            <Switch
              id="evitar-ponta"
              checked={evitarPonta}
              onCheckedChange={setEvitarPonta}
            />
          </div>

          {!evitarPonta && (
            <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800 dark:text-red-200 font-medium">
                Atenção: Irrigar no horário de ponta aumenta o custo de energia em até {((PEAK_MULTIPLIER - 1) * 100)}%.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {showResults && (
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-stone-600 dark:text-stone-400" />
            Análise de Custos de Energia
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/20">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-stone-600 dark:text-stone-400" />
                <p className="text-xs text-muted-foreground mb-1">Custo por Rega</p>
                <p className="text-xl font-bold text-foreground">{formatBRL(costResult.custoRega)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {areaTalhao} ha • {costResult.regasMes}x/mês
                </p>
              </CardContent>
            </Card>

            <Card className="border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-stone-600 dark:text-stone-400" />
                <p className="text-xs text-muted-foreground mb-1">Custo Mensal Est.</p>
                <p className="text-xl font-bold text-foreground">{formatBRL(costResult.custoMensal)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {costResult.regasMes} regas × {formatBRL(costResult.custoRega)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/20">
              <CardContent className="p-4 text-center">
                <Gauge className="w-6 h-6 mx-auto mb-2 text-stone-600 dark:text-stone-400" />
                <p className="text-xs text-muted-foreground mb-1">Eficiência</p>
                <p className="text-xl font-bold text-foreground">
                  {formatBRL(costResult.eficienciaRsMmHa)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">R$/mm/ha</p>
              </CardContent>
            </Card>

            <Card className={cn(
              'border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/20',
              !evitarPonta && 'border-red-300 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800'
            )}>
              <CardContent className="p-4 text-center">
                <Zap className={cn('w-6 h-6 mx-auto mb-2', evitarPonta ? 'text-stone-600 dark:text-stone-400' : 'text-red-500')} />
                <p className="text-xs text-muted-foreground mb-1">Tarifa Efetiva</p>
                <p className={cn('text-xl font-bold', evitarPonta ? 'text-foreground' : 'text-red-600 dark:text-red-400')}>
                  {formatBRL(costResult.tarifaEfetiva)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {evitarPonta ? 'Fora da ponta' : `Ponta (×${PEAK_MULTIPLIER})`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
