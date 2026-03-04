import { useMemo } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import type {
  CoffeeFertigationData,
  CoffeeSprayingData,
  CoffeeTreatmentPlanData,
} from '@/contexts/CoffeeContext';
import { cn } from '@/lib/utils';
import {
  Coffee,
  Waves,
  Droplets,
  Tractor,
  PlaneTakeoff,
  Backpack,
  DollarSign,
  BarChart3,
  ShieldAlert,
  Leaf,
  AlertTriangle,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────
function normalizeDose(dose: number, unit: string): { value: number; outputUnit: string } {
  switch (unit) {
    case 'mL/ha': return { value: dose / 1000, outputUnit: 'L' };
    case 'g/ha': return { value: dose / 1000, outputUnit: 'Kg' };
    case 'Kg/ha': return { value: dose, outputUnit: 'Kg' };
    default: return { value: dose, outputUnit: 'L' };
  }
}

function formatQty(v: number, unit: string): string {
  if (v < 0.01) return `${(v * 1000).toFixed(1)} ${unit === 'L' ? 'mL' : 'g'}`;
  return `${v.toFixed(2)} ${unit}`;
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Section wrapper ─────────────────────────────────────────
function Section({
  icon,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        {icon}
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex-1">
          {title}
        </h3>
        {badge}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-secondary/50">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Treatment Plan Summary ──────────────────────────────────
function TreatmentSummary({
  data,
  hectares,
}: {
  data: CoffeeTreatmentPlanData;
  hectares: number;
}) {
  const totalInvestment = data.totalCostPerHa * hectares;

  const equipmentLabels: Record<string, string> = {
    trator: 'Trator 400L',
    drone: 'Drone 20L',
    bomba_costal: 'Bomba Costal 20L',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
        <Droplets className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="font-medium text-sm">Equipamento: {equipmentLabels[data.equipmentType] || data.equipmentLabel}</p>
          <p className="text-xs text-muted-foreground">{data.entries.length} produto(s) no plano</p>
        </div>
      </div>

      <div className="space-y-2">
        {data.entries.map((entry, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-secondary/50 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{entry.produto}</p>
              <p className="text-[10px] text-muted-foreground">{entry.alvo} • {entry.principioAtivo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-foreground">{fmtCurrency(entry.costPerHa)}</p>
              <p className="text-[10px] text-muted-foreground">/ha</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="Custo / ha" value={fmtCurrency(data.totalCostPerHa)} />
        <StatBlock
          label="Total Área"
          value={hectares > 0 ? fmtCurrency(totalInvestment) : '—'}
          sub={hectares > 0 ? `${hectares} ha` : undefined}
        />
      </div>
    </div>
  );
}

// ─── Fertigation Summary ─────────────────────────────────────
function FertigationSummary({ data, hectares }: { data: CoffeeFertigationData; hectares: number }) {
  const volTotal = data.volumePerHa * hectares;
  const tanksNeeded = data.volumePerHa > 0 ? Math.ceil(volTotal / data.tankSize) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="Caixa" value={`${data.tankSize} L`} />
        <StatBlock label="Nº de Caixas" value={String(tanksNeeded)} />
        <StatBlock label="Volume Total" value={`${volTotal.toLocaleString()} L`} />
      </div>
      {data.products.length > 0 ? (
        <div className="space-y-2">
          {data.products.map(p => {
            const { value: doseNorm, outputUnit } = normalizeDose(p.dosePerHa, p.unit);
            const perTank = data.volumePerHa > 0 ? doseNorm * (data.tankSize / data.volumePerHa) : 0;
            const total = doseNorm * hectares;
            return (
              <div key={p.id} className="p-3 rounded-xl bg-secondary/50 grid grid-cols-4 gap-2 items-center text-sm">
                <div className="col-span-1">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.type}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Dose/ha</p>
                  <p className="font-medium">{p.dosePerHa} {p.unit}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Por Caixa</p>
                  <p className="font-medium">{formatQty(perTank, outputUnit)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="font-medium">{formatQty(total, outputUnit)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto na fertirrigação</p>
      )}
    </div>
  );
}

// ─── Spraying Summary ────────────────────────────────────────
function SprayingSummary({ data, hectares }: { data: CoffeeSprayingData; hectares: number }) {
  const volTotal = data.applicationRate * hectares;
  const tanksNeeded = data.tankCapacity > 0 ? Math.ceil(volTotal / data.tankCapacity) : 0;
  const equipLabel: Record<string, string> = {
    trator: 'Bomba Jato (Trator)',
    drone: 'Drone',
    bomba_costal: 'Bomba Costal',
  };
  const EquipIcon = data.equipmentType === 'trator' ? Tractor : data.equipmentType === 'drone' ? PlaneTakeoff : Backpack;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
        <EquipIcon className="w-6 h-6 text-primary shrink-0" />
        <div>
          <p className="font-medium text-sm">{equipLabel[data.equipmentType]}</p>
          <p className="text-xs text-muted-foreground">
            Tanque: {data.tankCapacity}L • Taxa: {data.applicationRate} L/ha
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="Volume Total" value={`${volTotal.toLocaleString()} L`} />
        <StatBlock
          label={data.equipmentType === 'bomba_costal' ? 'Nº Bombas' : data.equipmentType === 'drone' ? 'Nº Voos' : 'Nº Tanques'}
          value={String(tanksNeeded)}
        />
        <StatBlock
          label="Área/Tanque"
          value={data.applicationRate > 0 ? `${(data.tankCapacity / data.applicationRate).toFixed(2)} ha` : '—'}
        />
      </div>
      {data.products.length > 0 ? (
        <div className="space-y-2">
          {data.products.map(p => {
            const { value: doseNorm, outputUnit } = normalizeDose(p.dosePerHa, p.unit);
            const areaPerTank = data.applicationRate > 0 ? data.tankCapacity / data.applicationRate : 0;
            const perTank = doseNorm * areaPerTank;
            const total = doseNorm * hectares;
            return (
              <div key={p.id} className="p-3 rounded-xl bg-secondary/50 grid grid-cols-4 gap-2 items-center text-sm">
                <div className="col-span-1">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.type}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Dose/ha</p>
                  <p className="font-medium">{p.dosePerHa} {p.unit}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Por Tanque</p>
                  <p className="font-medium">{formatQty(perTank, outputUnit)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="font-medium">{formatQty(total, outputUnit)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto na pulverização</p>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export function PhytoResultStep() {
  const { coffeeData } = useCoffee();

  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';
  const hectares = coffeeData.hectares || 0;

  const hasTreatment = coffeeData.treatmentPlan && coffeeData.treatmentPlan.entries.length > 0;
  const hasFertigation = coffeeData.fertigation && coffeeData.fertigation.products.length > 0;
  const hasSpraying = coffeeData.coffeeSpraying && coffeeData.coffeeSpraying.products.length > 0;

  const filledSections = useMemo(() => {
    let count = 0;
    if (hasTreatment) count++;
    if (hasFertigation) count++;
    if (hasSpraying) count++;
    return count;
  }, [hasTreatment, hasFertigation, hasSpraying]);

  // ─── Consolidated Cost ─────────────────────────────────────
  const treatmentCostPerHa = coffeeData.treatmentPlan?.totalCostPerHa || 0;
  const totalPerHa = treatmentCostPerHa;
  const totalArea = totalPerHa * hectares;

  return (
    <div className="space-y-6" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* ─── Header ─── */}
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Resultado Fitossanitário — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Custos consolidados de controle de doenças e pragas
        </p>
        {hectares > 0 && (
          <p className="text-xs text-primary font-medium mt-1">
            Área: {hectares} hectares
          </p>
        )}
      </div>

      {/* ─── Progress ─── */}
      <div className="p-4 rounded-2xl border border-border bg-secondary/30 flex items-center gap-4">
        <BarChart3 className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">Seções preenchidas</p>
            <p className="text-xs font-medium text-foreground">{filledSections}/3</p>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(filledSections / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Tratamento ─── */}
      {hasTreatment && coffeeData.treatmentPlan && (
        <Section
          icon={<ShieldAlert className="w-4 h-4 text-primary" />}
          title="Doenças & Pragas"
          badge={
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {coffeeData.treatmentPlan.entries.length} alvo(s)
            </span>
          }
        >
          <TreatmentSummary data={coffeeData.treatmentPlan} hectares={hectares} />
        </Section>
      )}

      {/* ─── Fertirrigação ─── */}
      {hasFertigation && coffeeData.fertigation && (
        <Section
          icon={<Waves className="w-4 h-4 text-primary" />}
          title="Fertirrigação"
          badge={
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {coffeeData.fertigation.products.length} produto(s)
            </span>
          }
        >
          <FertigationSummary data={coffeeData.fertigation} hectares={hectares} />
        </Section>
      )}

      {/* ─── Pulverização ─── */}
      {hasSpraying && coffeeData.coffeeSpraying && (
        <Section
          icon={<Droplets className="w-4 h-4 text-primary" />}
          title="Pulverização"
          badge={
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {coffeeData.coffeeSpraying.products.length} produto(s)
            </span>
          }
        >
          <SprayingSummary data={coffeeData.coffeeSpraying} hectares={hectares} />
        </Section>
      )}

      {/* ─── Investimento Consolidado ─── */}
      {totalPerHa > 0 && (
        <Section
          icon={<DollarSign className="w-4 h-4 text-primary" />}
          title="Investimento Total"
        >
          <div className="space-y-4">
            {/* Breakdown */}
            <div className="space-y-2">
              {treatmentCostPerHa > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">Defensivos</span>
                  </div>
                  <span className="text-sm font-bold">{fmtCurrency(treatmentCostPerHa)}/ha</span>
                </div>
              )}
            </div>

            {/* Total per hectare */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Custo Total / Hectare
              </p>
              <p className="text-2xl font-bold text-foreground">{fmtCurrency(totalPerHa)}</p>
            </div>

            {/* Total for area */}
            {hectares > 0 && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">Investimento Total ({hectares} ha)</p>
                <p className="text-3xl font-bold text-foreground">{fmtCurrency(totalArea)}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ─── Empty State ─── */}
      {filledSections === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground text-sm">
            Preencha as etapas anteriores para visualizar o resumo consolidado.
          </p>
        </div>
      )}

      {/* ─── Footer ─── */}
      {filledSections > 0 && (
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 text-center">
          <Leaf className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium text-foreground mb-1">
            Controle Fitossanitário
          </p>
          <p className="text-xs text-muted-foreground">
            Revise os produtos, doses e custos acima. Consulte o cronograma fitossanitário para o timing correto.
          </p>
        </div>
      )}
    </div>
  );
}
