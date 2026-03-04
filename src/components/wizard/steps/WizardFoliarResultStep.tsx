import { useMemo } from 'react';
import { 
  AlertTriangle, CheckCircle2, AlertOctagon, Leaf, Package, 
  Droplets, TrendingUp, Info, ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '@/contexts/WizardContext';
import { cn } from '@/lib/utils';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ReferenceLine, Cell, Legend
} from 'recharts';

const STATUS_CONFIG = {
  deficiente: { color: 'hsl(0, 70%, 50%)', label: 'Deficiente', icon: AlertTriangle, badgeVariant: 'destructive' as const },
  adequado: { color: 'hsl(142, 70%, 45%)', label: 'Adequado', icon: CheckCircle2, badgeVariant: 'default' as const },
  excesso: { color: 'hsl(220, 70%, 50%)', label: 'Excesso/Toxidez', icon: AlertOctagon, badgeVariant: 'secondary' as const },
};

const SEVERITY_COLORS = {
  leve: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  moderada: 'text-orange-600 bg-orange-50 border-orange-200',
  severa: 'text-red-600 bg-red-50 border-red-200',
};

export function WizardFoliarResultStep() {
  const { wizardData } = useWizard();
  const foliar = wizardData.foliar;

  if (!foliar) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Receituário Foliar</h2>
          <p className="text-muted-foreground">Complete a etapa de diagnose primeiro</p>
        </div>
        <Alert className="border-warning bg-warning/5">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertDescription>
            Volte à etapa anterior e envie uma imagem ou preencha os valores do laudo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ===== VISUAL MODE =====
  if (foliar.mode === 'visual' && foliar.visualDeficiencies) {
    const deficiencies = foliar.visualDeficiencies;
    const hasDeficiencies = deficiencies.length > 0;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Diagnóstico Visual</h2>
          <p className="text-muted-foreground">Resultado da análise por IA — Estádio {foliar.phenologicalStage}</p>
        </div>

        {/* Disclaimer */}
        {foliar.disclaimer && (
          <Alert className="border-warning bg-warning/5">
            <ShieldAlert className="h-5 w-5 text-warning" />
            <AlertTitle>Aviso Importante</AlertTitle>
            <AlertDescription className="text-sm">{foliar.disclaimer}</AlertDescription>
          </Alert>
        )}

        {/* Image + Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          {foliar.imagePreview && (
            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Imagem Analisada</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={foliar.imagePreview} 
                  alt="Folha analisada" 
                  className="w-full max-h-48 object-contain rounded-lg"
                />
              </CardContent>
            </Card>
          )}
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{foliar.resumo}</p>
              <div className="mt-3">
                <Badge variant={hasDeficiencies ? 'destructive' : 'default'}>
                  {hasDeficiencies ? `${deficiencies.length} deficiência(s) detectada(s)` : 'Planta saudável'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deficiency Cards */}
        {hasDeficiencies && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Receituário Agronômico
            </h3>
            {deficiencies.map((def, idx) => (
              <Card key={idx} className="card-elevated overflow-hidden">
                <CardHeader className="py-3 bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Deficiência de {def.nutriente} ({def.simbolo})
                    </CardTitle>
                    <Badge className={cn('text-xs', SEVERITY_COLORS[def.severidade])}>
                      {def.severidade}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <strong>Sintomas:</strong> {def.sintomas_observados}
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Produto Recomendado:</span>
                    </div>
                    <p className="font-semibold text-foreground">{def.produto_recomendado}</p>
                    <p className="text-sm text-muted-foreground">Dose: {def.dose}</p>
                    <p className="text-xs text-muted-foreground">
                      Momento: {def.severidade === 'severa' ? 'Aplicação imediata' : 'Próxima janela de aplicação'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    Confiança: {(def.confianca * 100).toFixed(0)}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== LAB MODE =====
  if (foliar.mode === 'laudo' && foliar.analysisResults) {
    const results = foliar.analysisResults;
    const deficients = results.filter(r => r.status === 'deficiente');
    const excesses = results.filter(r => r.status === 'excesso');
    const adequate = results.filter(r => r.status === 'adequado');

    // Chart data
    const chartData = results.map(r => ({
      nutrient: r.nutrient,
      value: r.value,
      min: r.min,
      max: r.max,
      status: r.status,
    }));

    // Separate macro and micro for better visualization
    const macroData = chartData.filter(d => {
      const ref = results.find(r => r.nutrient === d.nutrient);
      return ref?.tipo === 'macro';
    });
    const microData = chartData.filter(d => {
      const ref = results.find(r => r.nutrient === d.nutrient);
      return ref?.tipo === 'micro';
    });

    const getBarColor = (status: string) => {
      return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || 'hsl(var(--muted))';
    };

    const renderChart = (data: typeof chartData, title: string, unit: string) => (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription>Valores atuais vs. faixa ideal ({unit})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="nutrient" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
                        <p className="font-semibold">{d.nutrient}</p>
                        <p>Valor: <strong>{d.value}</strong></p>
                        <p>Faixa ideal: {d.min} - {d.max}</p>
                        <p className="mt-1">
                          <Badge variant={STATUS_CONFIG[d.status as keyof typeof STATUS_CONFIG]?.badgeVariant}>
                            {STATUS_CONFIG[d.status as keyof typeof STATUS_CONFIG]?.label}
                          </Badge>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                  ))}
                </Bar>
                <Bar dataKey="min" fill="none" stroke="hsl(142, 70%, 45%)" strokeDasharray="4 4" />
                <Bar dataKey="max" fill="none" stroke="hsl(142, 70%, 45%)" strokeDasharray="4 4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Receituário Foliar</h2>
          <p className="text-muted-foreground">Análise laboratorial — Estádio {foliar.phenologicalStage}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-3">
          <Card className="card-elevated border-destructive/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold text-destructive">{deficients.length}</p>
              <p className="text-xs text-muted-foreground">Deficiente(s)</p>
            </CardContent>
          </Card>
          <Card className="card-elevated border-success/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto text-success mb-1" />
              <p className="text-2xl font-bold text-success">{adequate.length}</p>
              <p className="text-xs text-muted-foreground">Adequado(s)</p>
            </CardContent>
          </Card>
          <Card className="card-elevated border-blue-500/30">
            <CardContent className="p-4 text-center">
              <AlertOctagon className="w-6 h-6 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold text-blue-500">{excesses.length}</p>
              <p className="text-xs text-muted-foreground">Excesso(s)</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {renderChart(macroData, 'Radar Nutricional — Macronutrientes', 'g/kg')}
        {renderChart(microData, 'Radar Nutricional — Micronutrientes', 'mg/kg')}

        {/* Nutrient Detail Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              Detalhamento por Nutriente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2">Nutriente</th>
                    <th className="text-center py-2 px-2">Valor</th>
                    <th className="text-center py-2 px-2">Faixa Ideal</th>
                    <th className="text-center py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => {
                    const config = STATUS_CONFIG[r.status];
                    const StatusIcon = config.icon;
                    return (
                      <tr key={r.nutrient} className="border-b border-border/50">
                        <td className="py-2 px-2 font-medium">{r.nutrient}</td>
                        <td className="py-2 px-2 text-center font-semibold">{r.value} {r.unit}</td>
                        <td className="py-2 px-2 text-center text-muted-foreground">{r.min}-{r.max}</td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant={config.badgeVariant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                            {r.severity && <span className="ml-1">({r.severity})</span>}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations for deficients */}
        {deficients.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Receituário Agronômico
            </h3>
            {deficients.map((def, idx) => (
              <Card key={idx} className="card-elevated overflow-hidden">
                <CardHeader className="py-3 bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      {def.nutrient} — {def.value} {def.unit}
                    </CardTitle>
                    {def.severity && (
                      <Badge className={cn('text-xs', SEVERITY_COLORS[def.severity])}>
                        {def.severity}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Faixa ideal: {def.min}-{def.max} {def.unit} | Déficit: {(def.min - def.value).toFixed(1)} {def.unit}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Produto Sugerido:</span>
                    </div>
                    <p className="font-semibold text-foreground">{def.produto}</p>
                    <p className="text-sm text-muted-foreground">Dose: {def.dose}</p>
                    <p className="text-xs text-muted-foreground">
                      Momento: {def.severity === 'severa' ? 'Aplicação imediata' : 'Próxima janela de aplicação'}
                    </p>
                    {['VT', 'R1', 'R2', 'R3'].includes(foliar.phenologicalStage) && def.tipo === 'macro' && (
                      <Alert className="mt-2 border-warning bg-warning/5">
                        <AlertTriangle className="h-3 w-3 text-warning" />
                        <AlertDescription className="text-xs">
                          Macronutriente em estádio avançado: correção foliar pode ter baixo ROI.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
