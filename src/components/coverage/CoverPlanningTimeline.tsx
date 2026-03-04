import React from 'react';
import {
  Sprout, Tractor, Beaker, Zap, Clock, ShieldAlert, AlertTriangle,
  CheckCircle2, Wheat, Droplets
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { RecommendationEngineResult } from '@/hooks/useRecommendationEngine';

interface CoverPlanningTimelineProps {
  recommendation: RecommendationEngineResult;
}

/**
 * Builds efficient coverage planning from the existing recommendation data.
 * 
 * Rules:
 * - Plantio: K₂O up to 50-60 kg/ha, rest goes to V3-V4 coverage
 * - V3-V4: 30-40% of total N + remaining K₂O (if any)
 * - V6-V8: 60-70% of total N
 * - Pre-tasseling: no tractor entry recommended
 */
function buildCoverPlan(rec: RecommendationEngineResult) {
  const texture = rec.texturaEstimada; // 'arenosa' | 'media' | 'argilosa'
  const isArgiloso = texture === 'argilosa' || texture === 'media';
  const isArenoso = texture === 'arenosa';

  // Total N for coverage (already calculated by engine)
  const totalNCob = rec.cobertura.nCobertura;

  // Total K₂O from plantio recommendation + correction
  const k2oPlantio = rec.adubacaoPlantio.k2oNecessario;
  const k2oCorrecao = rec.correcaoPotassio.k2oCorrecao;
  const totalK2O = k2oPlantio + k2oCorrecao;

  // K split logic
  const K_PLANTIO_MAX = 60; // kg/ha max at planting
  const kAtPlanting = Math.min(totalK2O, K_PLANTIO_MAX);
  const kRemaining = Math.max(0, totalK2O - kAtPlanting);

  // For sandy soils, always split K; for clay, can go full at planting
  const kAtV4 = isArenoso ? kRemaining : 0;

  // N split: 35% V3-V4, 65% V6-V8
  const nV4 = totalNCob * 0.35;
  const nV8 = totalNCob * 0.65;

  // Determine N sources from recommendation — use ALL selected coverage products
  const hasSulfurIssue = rec.cobertura.sFornecido < rec.cobertura.sNecessario * 0.8;

  interface CoverSource {
    nome: string;
    nConcentration: number; // fraction 0-1
    nContribution: number;  // kg N/ha this source provides
    productV4: number;      // kg product/ha at V3-V4
    productV8: number;      // kg product/ha at V6-V8
  }

  const coverSources: CoverSource[] = [];

  if (rec.cobertura.insumosSelecionados.length > 0) {
    // Use all selected insumos with their proportional N contribution
    let totalNFromInsumos = 0;
    const insumosWithN = rec.cobertura.insumosSelecionados.filter(ins => {
      const nPct = ins.nutrientesFornecidos.n;
      return nPct && nPct > 0;
    });

    insumosWithN.forEach(ins => {
      const nPct = ins.nutrientesFornecidos.n || 0;
      const nProvided = ins.quantidadePorHa * (nPct / 100);
      totalNFromInsumos += nProvided;
    });

    insumosWithN.forEach(ins => {
      const nPct = ins.nutrientesFornecidos.n || 0;
      const nConc = nPct / 100;
      const nProvided = ins.quantidadePorHa * nConc;
      // Proportion of total N this source is responsible for
      const proportion = totalNFromInsumos > 0 ? nProvided / totalNFromInsumos : 1 / insumosWithN.length;
      const nForThis = totalNCob * proportion;
      const nV4ForThis = nV4 * proportion;
      const nV8ForThis = nV8 * proportion;

      coverSources.push({
        nome: ins.nome,
        nConcentration: nConc,
        nContribution: nForThis,
        productV4: nConc > 0 ? nV4ForThis / nConc : 0,
        productV8: nConc > 0 ? nV8ForThis / nConc : 0,
      });
    });
  }

  // Fallback if no insumos were selected
  if (coverSources.length === 0) {
    const fallbackName = hasSulfurIssue ? 'Sulfato de Amônio' : 'Ureia';
    const fallbackConc = hasSulfurIssue ? 0.21 : 0.45;
    coverSources.push({
      nome: fallbackName,
      nConcentration: fallbackConc,
      nContribution: totalNCob,
      productV4: nV4 / fallbackConc,
      productV8: nV8 / fallbackConc,
    });
  }

  // Legacy single-source values for backwards compat (totals)
  const nSource = coverSources.map(s => s.nome).join(' + ');
  const productV4 = coverSources.reduce((sum, s) => sum + s.productV4, 0);
  const productV8 = coverSources.reduce((sum, s) => sum + s.productV8, 0);
  const kclV4 = kAtV4 > 0 ? kAtV4 / 0.6 : 0; // KCl 60%

  // K strategy text
  let kStrategy: string;
  let kReason: string;
  if (isArenoso && kRemaining > 0) {
    kStrategy = `${kAtPlanting.toFixed(0)} kg K₂O no Plantio + ${kAtV4.toFixed(0)} kg K₂O em V3-V4`;
    kReason = 'Solo arenoso retém pouco potássio. O parcelamento evita perda por lixiviação para o lençol freático.';
  } else if (kRemaining > 0) {
    kStrategy = `${kAtPlanting.toFixed(0)} kg K₂O no Plantio + ${kRemaining.toFixed(0)} kg K₂O em V3`;
    kReason = 'Dose total de K₂O excede o limite seguro para o plantio. O restante deve ser aplicado cedo (antes de V6).';
  } else {
    kStrategy = `${totalK2O.toFixed(0)} kg K₂O total no Plantio`;
    kReason = 'Dose de K₂O dentro do limite seguro. Aplicação única no plantio é eficiente.';
  }

  return {
    totalNCob,
    nSource,
    coverSources,
    nV4,
    nV8,
    productV4,
    productV8,
    kAtPlanting,
    kAtV4,
    kclV4,
    totalK2O,
    kStrategy,
    kReason,
    isArenoso,
    hasSulfurIssue,
    parcelas: rec.parcelamentoCobertura.parcelas,
  };
}

export function CoverPlanningTimeline({ recommendation }: CoverPlanningTimelineProps) {
  const plan = buildCoverPlan(recommendation);

  // Don't show if there's no N coverage needed
  if (plan.totalNCob <= 0) return null;

  return (
    <Card className="card-elevated overflow-hidden border-primary/20">
      <CardHeader className="py-4 bg-primary/5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-5 h-5 text-primary" />
          Planejamento de Cobertura Eficiente
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Cronograma inteligente para evitar perdas por volatilização e lixiviação
        </p>
      </CardHeader>
      <CardContent className="p-5 space-y-5">

        {/* Sulfur alert */}
        {plan.hasSulfurIssue && (
          <Alert className="border-warning/40 bg-warning/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <AlertDescription className="text-sm">
                Enxofre baixo no solo. Priorizando <strong>Sulfato de Amônio</strong> como fonte de N para repor S simultaneamente.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Timeline */}
        <div className="space-y-0">
          {/* Plantio */}
          <TimelineStep
            phase="Plantio"
            title="Enraizamento"
            icon={<Wheat className="w-5 h-5" />}
            items={[
              plan.kAtPlanting > 0
                ? `K₂O: ${plan.kAtPlanting.toFixed(0)} kg/ha (${(plan.kAtPlanting / 0.6).toFixed(0)} kg KCl/ha)`
                : null,
              'NPK conforme adubação de plantio acima',
            ].filter(Boolean) as string[]}
            tip="Limitar K₂O a 50-60 kg/ha no plantio para evitar salinidade próxima à semente."
          />

          {/* V3-V4 */}
          <TimelineStep
            phase="V3-V4"
            title="Definição do Potencial Produtivo"
            icon={<Sprout className="w-5 h-5" />}
            items={[
              ...plan.coverSources.map(s =>
                `${s.nome}: ${(plan.nV4 * (s.nContribution / plan.totalNCob)).toFixed(1)} kg N/ha → ${s.productV4.toFixed(0)} kg/ha`
              ),
              plan.kAtV4 > 0
                ? `K₂O (restante): ${plan.kAtV4.toFixed(1)} kg/ha → ${plan.kclV4.toFixed(0)} kg de KCl/ha`
                : null,
            ].filter(Boolean) as string[]}
            tip="Fase crítica para definição do potencial produtivo. O K deve ser aplicado cedo (antes de V6)."
            highlight
          />

          {/* V6-V8 */}
          <TimelineStep
            phase="V6-V8"
            title="Definição do Tamanho da Espiga"
            icon={<Tractor className="w-5 h-5" />}
            items={plan.coverSources.map(s =>
              `${s.nome}: ${(plan.nV8 * (s.nContribution / plan.totalNCob)).toFixed(1)} kg N/ha → ${s.productV8.toFixed(0)} kg/ha`
            )}
            tip="Fase de maior consumo — a planta define o número de grãos por espiga. Não atrase esta aplicação."
            highlight
          />

          {/* Pre-tasseling */}
          <TimelineStep
            phase="Pré-Pendoamento"
            title="Enchimento de Grãos"
            icon={<Droplets className="w-5 h-5" />}
            items={[
              'Não se recomenda entrar com trator (quebra plantas).',
              'Exceção: fertirrigação via pivô/gotejamento ou aplicação aérea.',
            ]}
            tip="Qualquer adubação tardia nesta fase deve ser via líquida (pivô, gotejamento ou drone)."
            isLast
            muted
          />
        </div>

        {/* K Strategy Summary */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">Estratégia de Potássio</span>
          </div>
          <p className="text-xs text-muted-foreground">{plan.kStrategy}</p>
          <p className="text-xs text-muted-foreground italic">{plan.kReason}</p>
        </div>

        {/* Conversion table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Fase</th>
                <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">N (elemento)</th>
                {plan.coverSources.map((s, i) => (
                  <th key={i} className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">{s.nome}</th>
                ))}
                {plan.kAtV4 > 0 && (
                  <>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">K₂O</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">KCl</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 font-medium">V3-V4</td>
                <td className="py-2 px-3 text-right">{plan.nV4.toFixed(1)} kg/ha</td>
                {plan.coverSources.map((s, i) => (
                  <td key={i} className="py-2 px-3 text-right font-semibold text-primary">{s.productV4.toFixed(0)} kg/ha</td>
                ))}
                {plan.kAtV4 > 0 && (
                  <>
                    <td className="py-2 px-3 text-right">{plan.kAtV4.toFixed(1)} kg/ha</td>
                    <td className="py-2 px-3 text-right font-semibold text-primary">{plan.kclV4.toFixed(0)} kg/ha</td>
                  </>
                )}
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">V6-V8</td>
                <td className="py-2 px-3 text-right">{plan.nV8.toFixed(1)} kg/ha</td>
                {plan.coverSources.map((s, i) => (
                  <td key={i} className="py-2 px-3 text-right font-semibold text-primary">{s.productV8.toFixed(0)} kg/ha</td>
                ))}
                {plan.kAtV4 > 0 && (
                  <>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right">—</td>
                  </>
                )}
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right">{plan.totalNCob.toFixed(1)} kg/ha</td>
                {plan.coverSources.map((s, i) => (
                  <td key={i} className="py-2 px-3 text-right text-primary">{(s.productV4 + s.productV8).toFixed(0)} kg/ha</td>
                ))}
                {plan.kAtV4 > 0 && (
                  <>
                    <td className="py-2 px-3 text-right">{plan.kAtV4.toFixed(1)} kg/ha</td>
                    <td className="py-2 px-3 text-right text-primary">{plan.kclV4.toFixed(0)} kg/ha</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Timeline Step ──────────────────────────────────────────
function TimelineStep({
  phase,
  title,
  icon,
  items,
  tip,
  isLast,
  highlight,
  muted,
}: {
  phase: string;
  title: string;
  icon: React.ReactNode;
  items: string[];
  tip: string;
  isLast?: boolean;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        )}>
          {icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className={cn("pb-5 flex-1", isLast && "pb-0")}>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant={highlight ? "default" : "secondary"} className="text-xs font-semibold">{phase}</Badge>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>

        <div className={cn("space-y-1.5 ml-0.5", muted && "opacity-70")}>
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <Tractor className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 bg-secondary/50 rounded-lg p-2.5 mt-2">
          <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">{tip}</p>
        </div>
      </div>
    </div>
  );
}
