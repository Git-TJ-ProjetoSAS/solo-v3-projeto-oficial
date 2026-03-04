import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle, XCircle, Trash2, FlaskConical, ArrowDown, ShieldAlert, Info, CheckCircle2, Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Product Database (JSON Exato) ───────────────────────────
export interface MixerProduct {
  id: string;
  name: string;
  group: 'A' | 'B' | 'C' | 'D' | 'E';
  type: string;
  color: string;
}

const INPUT_PRODUCTS: MixerProduct[] = [
  // --- GRUPO A: CÁLCIO (NUNCA MISTURAR COM B) ---
  { id: "a1", name: "Nitrato de Cálcio", group: "A", type: "Macro", color: "bg-red-500/15 border-red-500/50 text-red-400" },
  // --- GRUPO B: SULFATOS E FOSFATOS (NUNCA MISTURAR COM A) ---
  { id: "b1", name: "Sulfato de Amônio", group: "B", type: "Macro", color: "bg-yellow-500/15 border-yellow-500/50 text-yellow-400" },
  { id: "b2", name: "MAP Purificado", group: "B", type: "Macro", color: "bg-yellow-500/15 border-yellow-500/50 text-yellow-400" },
  { id: "b3", name: "Ácido Fosfórico", group: "B", type: "Acid", color: "bg-orange-500/15 border-orange-500/50 text-orange-400" },
  { id: "b4", name: "Sulfato de Magnésio", group: "B", type: "Macro", color: "bg-yellow-500/15 border-yellow-500/50 text-yellow-400" },
  { id: "b5", name: "Micros Sais (Sulfato Zn, Mn, Cu)", group: "B", type: "Micro", color: "bg-yellow-500/15 border-yellow-500/50 text-yellow-400" },
  { id: "b6", name: "Ácido Bórico", group: "B", type: "Micro", color: "bg-yellow-500/15 border-yellow-500/50 text-yellow-400" },
  // --- GRUPO C: NEUTROS E QUELATOS (MISTURA LIVRE) ---
  { id: "c1", name: "Ureia", group: "C", type: "Macro", color: "bg-green-500/15 border-green-500/50 text-green-400" },
  { id: "c2", name: "Cloreto de Potássio (Branco)", group: "C", type: "Macro", color: "bg-green-500/15 border-green-500/50 text-green-400" },
  { id: "c3", name: "Nitrato de Potássio", group: "C", type: "Macro", color: "bg-green-500/15 border-green-500/50 text-green-400" },
  { id: "c4", name: "Micros Quelatados (EDTA)", group: "C", type: "Micro", color: "bg-blue-500/15 border-blue-500/50 text-blue-400" },
  // --- GRUPO D: DEFENSIVOS (QUIMIGAÇÃO - CUIDADO COM PH) ---
  { id: "d1", name: "Inseticida Sistêmico (Imidacloprido/Tiametoxam)", group: "D", type: "Defensivo", color: "bg-purple-500/15 border-purple-500/50 text-purple-400" },
  { id: "d2", name: "Fungicida Solo (Flutriafol/Triadimenol)", group: "D", type: "Defensivo", color: "bg-purple-500/15 border-purple-500/50 text-purple-400" },
  { id: "d3", name: "Nematicida Biológico", group: "D", type: "Bio", color: "bg-purple-500/15 border-purple-500/50 text-purple-400" },
  // --- GRUPO E: TRATAMENTO ---
  { id: "e1", name: "Hipoclorito de Sódio (Cloro)", group: "E", type: "Limpeza", color: "bg-gray-500/15 border-gray-500/50 text-gray-400" },
];

const GROUP_LABELS: Record<string, { label: string; desc: string; colorClass: string }> = {
  A: { label: 'Grupo A — Cálcio', desc: 'Incompatível com Sulfatos e Fosfatos (Forma Gesso/Precipita)', colorClass: 'bg-red-500/15 border-red-500/40 text-red-400' },
  B: { label: 'Grupo B — Sulfatos/Fosfatos', desc: 'Incompatível com Cálcio', colorClass: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' },
  C: { label: 'Grupo C — Neutros/Quelatos/Ureia', desc: 'Compatível com todos (Coringa)', colorClass: 'bg-green-500/15 border-green-500/40 text-green-400' },
  D: { label: 'Grupo D — Defensivos', desc: 'Sensíveis a pH extremo e alta salinidade', colorClass: 'bg-purple-500/15 border-purple-500/40 text-purple-400' },
  E: { label: 'Grupo E — Tratamento/Cloro', desc: 'Incompatível com Defensivos (Oxidação/Morte Biológica)', colorClass: 'bg-gray-500/15 border-gray-500/40 text-gray-400' },
};

// ─── Dose state per product ──────────────────────────────────
type DoseUnit = 'Kg/ha' | 'L/ha' | 'g/ha' | 'mL/ha';

const DOSE_UNITS: { value: DoseUnit; label: string }[] = [
  { value: 'Kg/ha', label: 'Kg/ha' },
  { value: 'L/ha', label: 'L/ha' },
  { value: 'g/ha', label: 'g/ha' },
  { value: 'mL/ha', label: 'mL/ha' },
];

interface ProductDose {
  dose: number;
  unit: DoseUnit;
}

// ─── Calculation helpers ─────────────────────────────────────
function normalizeDose(dose: number, unit: DoseUnit): { perHa: number; baseUnit: string } {
  switch (unit) {
    case 'Kg/ha': return { perHa: dose, baseUnit: 'Kg' };
    case 'L/ha': return { perHa: dose, baseUnit: 'L' };
    case 'g/ha': return { perHa: dose / 1000, baseUnit: 'Kg' };
    case 'mL/ha': return { perHa: dose / 1000, baseUnit: 'L' };
    default: return { perHa: dose, baseUnit: 'Kg' };
  }
}

function formatQty(value: number, baseUnit: string): string {
  if (value < 0.01 && value > 0) return `${(value * 1000).toFixed(1)} ${baseUnit === 'Kg' ? 'g' : 'mL'}`;
  if (value < 1) return `${(value * 1000).toFixed(0)} ${baseUnit === 'Kg' ? 'g' : 'mL'}`;
  return `${value.toFixed(2)} ${baseUnit}`;
}

// ─── Compatibility Engine ────────────────────────────────────
interface CompatAlert {
  level: 'error' | 'warning';
  title: string;
  message: string;
  suggestion: string;
  products: string[];
}

function checkCompatibility(selected: MixerProduct[]): CompatAlert[] {
  const alerts: CompatAlert[] = [];
  const groups = new Set(selected.map(p => p.group));
  const hasA = groups.has('A');
  const hasB = groups.has('B');
  const hasD = groups.has('D');
  const hasE = groups.has('E');

  const namesByGroup = (g: string) => selected.filter(p => p.group === g).map(p => p.name);

  // A + B: CRITICAL — Precipitação
  if (hasA && hasB) {
    alerts.push({
      level: 'error',
      title: '⛔ ERRO CRÍTICO — Precipitação / Formação de Gesso',
      message: 'Cálcio (Grupo A) + Sulfatos/Fosfatos (Grupo B) causam precipitação imediata, entupimento de gotejadores e perda total do produto. NUNCA misturar no mesmo tanque!',
      suggestion: 'Separe em tanques diferentes. Injete o Cálcio (Tanque A) primeiro, depois Sulfatos/Fosfatos (Tanque B).',
      products: [...namesByGroup('A'), ...namesByGroup('B')],
    });
  }

  // D + E: CRITICAL — Inativação
  if (hasD && hasE) {
    alerts.push({
      level: 'error',
      title: '⛔ ERRO CRÍTICO — Oxidação / Morte Biológica',
      message: 'Cloro/Hipoclorito (Grupo E) inativa defensivos biológicos e químicos (Grupo D)! O Hipoclorito degrada a molécula ativa, tornando o defensivo ineficaz.',
      suggestion: 'Aplique os defensivos primeiro. Faça a cloração somente APÓS finalizar toda a quimigação.',
      products: [...namesByGroup('D'), ...namesByGroup('E')],
    });
  }

  // D + KCl (C2 contém Cl⁻)
  const hasKCl = selected.some(p => p.id === 'c2');
  if (hasD && hasKCl) {
    alerts.push({
      level: 'error',
      title: '⛔ ERRO CRÍTICO — Cloro do KCl + Defensivo',
      message: 'O Cloreto de Potássio libera íons Cl⁻ que podem inativar defensivos. Aplique o KCl separadamente quando usar quimigação.',
      suggestion: 'Use Nitrato de Potássio ou Sulfato de Potássio como alternativa ao KCl durante a quimigação.',
      products: [...namesByGroup('D'), 'Cloreto de Potássio (Branco)'],
    });
  }

  // D + fertilizantes: WARNING — Hidrólise / Salting Out
  if (hasD && (hasA || hasB || groups.has('C'))) {
    const fertNames = [...namesByGroup('A'), ...namesByGroup('B'), ...namesByGroup('C')];
    if (fertNames.length > 0) {
      alerts.push({
        level: 'warning',
        title: '⚠️ ALERTA — Risco de Hidrólise / Salting Out',
        message: 'A alta concentração de sais ou pH extremo do adubo pode reduzir a eficiência do defensivo. Recomendado aplicar o defensivo sozinho (Tanque Único) ou injetar separadamente.',
        suggestion: 'Injete os adubos primeiro e aplique o defensivo SOZINHO no final.',
        products: [...namesByGroup('D'), ...fertNames],
      });
    }
  }

  // B com ácidos + D: pH extremo WARNING
  const hasAcid = selected.some(p => p.type === 'Acid');
  if (hasAcid && hasD) {
    alerts.push({
      level: 'warning',
      title: '⚠️ ALERTA — pH Extremo Ácido + Defensivo',
      message: 'Ácidos (Ácido Fosfórico, Ácido Bórico) baixam o pH drasticamente, podendo acelerar a hidrólise dos defensivos e reduzir sua eficácia.',
      suggestion: 'Meça o pH da calda antes da aplicação. O ideal para defensivos é pH entre 5.5 e 6.5.',
      products: [...selected.filter(p => p.type === 'Acid').map(p => p.name), ...namesByGroup('D')],
    });
  }

  // Nutrient overlap: products sharing the same dominant nutrient
  const NUTRIENT_GROUPS: Record<string, { nutrient: string; symbol: string; ids: string[] }> = {
    k2o: { nutrient: 'Potássio', symbol: 'K₂O', ids: ['c2', 'c3'] }, // KCl + Nitrato de Potássio
    n: { nutrient: 'Nitrogênio', symbol: 'N', ids: ['a1', 'b1', 'c1', 'c3'] }, // Nitrato Ca, Sulfato Am, Ureia, Nitrato K
    p2o5: { nutrient: 'Fósforo', symbol: 'P₂O₅', ids: ['b2', 'b3'] }, // MAP + Ác. Fosfórico
    mg: { nutrient: 'Magnésio', symbol: 'Mg', ids: ['b4'] },
  };

  for (const [, group] of Object.entries(NUTRIENT_GROUPS)) {
    const overlapping = selected.filter(p => group.ids.includes(p.id));
    if (overlapping.length >= 2) {
      alerts.push({
        level: 'warning',
        title: `⚠️ Sobreposição de ${group.symbol}`,
        message: `${overlapping.map(p => p.name).join(' e ')} são ambos fontes de ${group.nutrient} (${group.symbol}). Isso pode causar excesso nutricional e aumento desnecessário do custo.`,
        suggestion: `Escolha apenas uma fonte de ${group.symbol} ou ajuste as doses para evitar sobredosagem.`,
        products: overlapping.map(p => p.name),
      });
    }
  }

  return alerts;
}

function getInjectionOrder(selected: MixerProduct[]): string[] | null {
  const groups = new Set(selected.map(p => p.group));
  const hasConflict =
    (groups.has('A') && groups.has('B')) ||
    (groups.has('D') && groups.has('E')) ||
    (groups.has('D') && (groups.has('A') || groups.has('B') || groups.has('C')));

  if (!hasConflict || selected.length < 2) return null;

  const order: string[] = ['1º — Água limpa no sistema'];
  let step = 2;
  if (groups.has('A')) { order.push(`${step}º — Tanque A: ${selected.filter(p => p.group === 'A').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('B')) { order.push(`${step}º — Tanque B: ${selected.filter(p => p.group === 'B').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('C')) { order.push(`${step}º — Grupo C: ${selected.filter(p => p.group === 'C').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('D')) { order.push(`${step}º — Defensivos (SOZINHO, no final): ${selected.filter(p => p.group === 'D').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('E')) { order.push(`${step}º — Limpeza com Cloro (APÓS toda aplicação)`); }

  return order;
}

// ─── Props ───────────────────────────────────────────────────
interface FertigationMixerProps {
  tankSize: number;
  volumePerHa: number;
  hectares: number;
}

// ─── Component ───────────────────────────────────────────────
export function FertigationMixer({ tankSize, volumePerHa, hectares }: FertigationMixerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [doses, setDoses] = useState<Record<string, ProductDose>>({});
  const [flashRed, setFlashRed] = useState(false);

  const selectedProducts = useMemo(
    () => INPUT_PRODUCTS.filter(p => selectedIds.includes(p.id)),
    [selectedIds]
  );

  const alerts = useMemo(() => checkCompatibility(selectedProducts), [selectedProducts]);
  const injectionOrder = useMemo(() => getInjectionOrder(selectedProducts), [selectedProducts]);

  const hasCritical = alerts.some(a => a.level === 'error');
  const hasDefensivo = selectedProducts.some(p => p.group === 'D');

  const areaPerTank = volumePerHa > 0 ? tankSize / volumePerHa : 0;

  const defaultUnit = (p: MixerProduct): DoseUnit => {
    if (p.type === 'Defensivo' || p.type === 'Bio' || p.type === 'Limpeza') return 'mL/ha';
    if (p.type === 'Acid') return 'L/ha';
    if (p.type === 'Micro') return 'g/ha';
    return 'Kg/ha';
  };

  const toggleProduct = (product: MixerProduct) => {
    setSelectedIds(prev => {
      const isAdding = !prev.includes(product.id);
      const next = isAdding ? [...prev, product.id] : prev.filter(id => id !== product.id);

      if (isAdding) {
        setDoses(d => ({ ...d, [product.id]: { dose: 0, unit: defaultUnit(product) } }));
      }

      // Flash on critical
      const nextProducts = INPUT_PRODUCTS.filter(p => next.includes(p.id));
      const nextGroups = new Set(nextProducts.map(p => p.group));
      const isCritical =
        (nextGroups.has('A') && nextGroups.has('B')) ||
        (nextGroups.has('D') && nextGroups.has('E'));

      if (isAdding && isCritical) {
        setFlashRed(true);
        setTimeout(() => setFlashRed(false), 1500);
        if (nextGroups.has('A') && nextGroups.has('B')) {
          toast.error('⛔ Cálcio + Sulfatos/Fosfatos = Precipitação! NUNCA misturar!', { duration: 5000 });
        } else {
          toast.error('⛔ Cloro inativa defensivos! Aplicar separadamente!', { duration: 5000 });
        }
      }

      return next;
    });
  };

  const removeProduct = (id: string) => {
    setSelectedIds(prev => prev.filter(pid => pid !== id));
    setDoses(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const updateDose = (id: string, value: number) => {
    setDoses(prev => ({ ...prev, [id]: { ...prev[id], dose: value } }));
  };

  const updateUnit = (id: string, unit: DoseUnit) => {
    setDoses(prev => ({ ...prev, [id]: { ...prev[id], unit } }));
  };

  const groupedProducts = useMemo(() => {
    const groups: Record<string, MixerProduct[]> = {};
    INPUT_PRODUCTS.forEach(p => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });
    return groups;
  }, []);

  return (
    <div className={cn(
      "space-y-6 transition-all duration-300",
      flashRed && "ring-2 ring-red-500 bg-red-500/10 rounded-2xl p-2"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <FlaskConical className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">TankMix: Fertirrigação & Quimigação Conilon</h3>
          <p className="text-xs text-muted-foreground">Selecione os produtos, informe a dose e verifique a compatibilidade química</p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(GROUP_LABELS).map(([key, info]) => (
          <div key={key} className={cn('p-2.5 rounded-xl border text-xs', info.colorClass)}>
            <span className="font-semibold">{info.label}</span>
            <p className="opacity-80 mt-0.5">{info.desc}</p>
          </div>
        ))}
      </div>

      {/* Product Selection by Group */}
      <div className="space-y-4">
        {Object.entries(groupedProducts).map(([group, products]) => {
          const info = GROUP_LABELS[group];
          return (
            <div key={group} className="space-y-2">
              <p className={cn('text-xs font-semibold uppercase tracking-wider', info.colorClass.split(' ').pop())}>
                {info.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {products.map(product => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleProduct(product)}
                      className={cn(
                        'px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                        isSelected
                          ? cn(product.color, 'border-2 shadow-sm')
                          : 'bg-secondary border-border text-muted-foreground hover:border-foreground/30'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        {product.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dose Inputs & Per-Tank Calculation */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Label className="text-sm font-medium">Dosagem por Produto</Label>
            <Badge variant="outline" className="text-[10px]">Caixa: {tankSize}L | {volumePerHa}L/ha | {hectares}ha</Badge>
          </div>
          {selectedProducts.map(product => {
            const d = doses[product.id] || { dose: 0, unit: defaultUnit(product) };
            const { perHa, baseUnit } = normalizeDose(d.dose, d.unit);
            const perTank = perHa * areaPerTank;
            const total = perHa * hectares;
            const tanksNeeded = volumePerHa > 0 ? Math.ceil((volumePerHa * hectares) / tankSize) : 0;

            return (
              <div key={product.id} className={cn('p-4 rounded-xl border', product.color)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{product.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{product.type}</Badge>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", product.color)}>
                      Grupo {product.group}
                    </Badge>
                  </div>
                  <button onClick={() => removeProduct(product.id)} className="text-destructive hover:text-destructive/80 shrink-0 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Dose input row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Dose</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={d.dose || ''}
                      onChange={e => updateDose(product.id, parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Unidade</Label>
                    <Select value={d.unit} onValueChange={v => updateUnit(product.id, v as DoseUnit)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOSE_UNITS.map(u => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Calculated values */}
                {d.dose > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-background/60 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase">Por Caixa</p>
                      <p className="text-sm font-semibold">{formatQty(perTank, baseUnit)}</p>
                    </div>
                    <div className="p-2 bg-background/60 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase">Total ({hectares}ha)</p>
                      <p className="text-sm font-semibold">{formatQty(total, baseUnit)}</p>
                    </div>
                    <div className="p-2 bg-background/60 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase">Nº Caixas</p>
                      <p className="text-sm font-semibold">{tanksNeeded}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Defensivo pH reminder when no conflicts */}
      {hasDefensivo && alerts.length === 0 && (
        <Alert className="border-purple-500/30 bg-purple-500/10">
          <Info className="h-4 w-4 text-purple-400" />
          <AlertTitle className="text-purple-400 text-sm">Atenção: Defensivo selecionado</AlertTitle>
          <AlertDescription className="text-purple-300/80 text-xs">
            Para quimigação com defensivos, verifique se o pH da calda está entre 5.5 e 6.5. Defensivos são sensíveis a pH extremo e alta salinidade.
          </AlertDescription>
        </Alert>
      )}

      {/* Compatibility Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <Alert
              key={idx}
              variant={alert.level === 'error' ? 'destructive' : 'default'}
              className={cn(
                'border-2',
                alert.level === 'error'
                  ? 'border-red-500/50 bg-red-500/10'
                  : 'border-yellow-500/50 bg-yellow-500/10'
              )}
            >
              {alert.level === 'error'
                ? <XCircle className="h-5 w-5 text-red-400" />
                : <AlertTriangle className="h-5 w-5 text-yellow-400" />}
              <AlertTitle className={cn(
                'font-bold text-sm',
                alert.level === 'error' ? 'text-red-400' : 'text-yellow-400'
              )}>
                {alert.title}
              </AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p className={cn(
                  'text-sm',
                  alert.level === 'error' ? 'text-red-300/90' : 'text-yellow-300/90'
                )}>
                  {alert.message}
                </p>
                <p className="text-sm font-medium text-foreground">
                  💡 {alert.suggestion}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {alert.products.map((name, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{name}</Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Injection Order Suggestion */}
      {injectionOrder && (
        <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-sm text-foreground">Sequência de Injeção Recomendada</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Não misture no tanque! Utilize tanques separados ou injete na seguinte ordem:
          </p>
          <div className="space-y-1.5">
            {injectionOrder.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <ArrowDown className="w-3 h-3 text-muted-foreground mx-auto -my-1" />}
                <div className="flex items-center gap-2 p-2 bg-background rounded-lg w-full">
                  <span className="text-xs font-medium text-foreground">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compatible Summary */}
      {selectedProducts.length > 0 && !hasCritical && (
        <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <p className="text-sm font-semibold text-green-400">
              {alerts.length === 0 ? '✅ Mix Compatível — Pode misturar no mesmo tanque' : 'Mix com Ressalvas — Atenção aos alertas acima'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedProducts.map(p => (
              <Badge
                key={p.id}
                className={cn('text-xs cursor-pointer hover:opacity-70', p.color)}
                onClick={() => removeProduct(p.id)}
              >
                Grupo {p.group}: {p.name}
                <Trash2 className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {selectedProducts.length === 0 && (
        <div className="p-6 text-center text-muted-foreground bg-secondary rounded-xl">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Selecione produtos acima para simular o tanque de mistura</p>
        </div>
      )}
    </div>
  );
}
