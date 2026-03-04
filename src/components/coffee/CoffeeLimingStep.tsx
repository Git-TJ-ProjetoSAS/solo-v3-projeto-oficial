import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCoffee } from '@/contexts/CoffeeContext';
import { getTextureParcelCount, type SoilTexture } from '@/contexts/CoffeeContext';
import { useTalhoes } from '@/hooks/useTalhoes';
import { findDoseK2O, FIRST_YEAR_MAX_MONTHS, V_ALVO_PRIMEIRO_ANO, PRNT_DEFAULT } from '@/data/coffeePlantingReference';
import { Switch } from '@/components/ui/switch';
import { Beaker, Calculator, Target, PackageCheck, AlertTriangle, Loader2, Sparkles, Check, X, Hand, Pencil, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInsumos } from '@/hooks/useInsumos';
import { generateAutoRecommendation, getNutrientSymbol } from '@/lib/autoRecommendationEngine';
import { calcStandFactor } from '@/lib/coffeeRecommendationEngine';
import type { RecommendedProduct, FirstYearOverride } from '@/lib/autoRecommendationEngine';
import { toast } from 'sonner';
const MONTHS_6 = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'] as const;
const MONTHS_10 = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'] as const;

// Distribution curves per parcel count
const DIST_4: Record<string, number> = { Nov: 20, Dez: 30, Jan: 30, Fev: 20 };
const DIST_6: Record<string, number> = { Set: 8, Out: 10, Nov: 12, Dez: 16, Jan: 18, Fev: 16, Mar: 12, Abr: 8 };
const DIST_8: Record<string, number> = { Set: 6, Out: 8, Nov: 10, Dez: 14, Jan: 16, Fev: 14, Mar: 12, Abr: 10, Mai: 6, Jun: 4 };
const DIST_10: Record<string, number> = { Set: 5, Out: 7, Nov: 9, Dez: 13, Jan: 15, Fev: 13, Mar: 11, Abr: 10, Mai: 9, Jun: 8 };

function getDistribution(parcelCount: number) {
  if (parcelCount <= 4) return { months: ['Nov', 'Dez', 'Jan', 'Fev'] as const, dist: DIST_4 };
  if (parcelCount <= 6) return { months: MONTHS_6, dist: DIST_6 };
  if (parcelCount <= 8) return { months: MONTHS_10.slice(0, 8) as unknown as typeof MONTHS_10, dist: DIST_8 };
  return { months: MONTHS_10, dist: DIST_10 };
}

function useNumericInput(initial: string) {
  const [value, setValue] = useState(initial);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(',', '.');
    if (v === '' || /^\d*\.?\d*$/.test(v)) setValue(v);
  };
  const setManually = (v: string) => setValue(v);
  return { value, onChange, num: parseFloat(value) || 0, setManually };
}

export function CoffeeLimingStep() {
  const { coffeeData, setLimingData } = useCoffee();
  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

  const { insumos: insumosDB, loading: loadingInsumos } = useInsumos();

  // Buscar calcários do banco de dados (Correção de Solo com PRNT > 0)
  const calcarios = useMemo(() => {
    return insumosDB.filter(
      (i) => i.tipoProduto === 'Correção de Solo' && i.status === 'ativo' && i.correcao?.prnt > 0
    );
  }, [insumosDB]);

  const [selectedCalcarioId, setSelectedCalcarioId] = useState<string>('');

  // Selecionar automaticamente o primeiro calcário disponível
  useEffect(() => {
    if (calcarios.length > 0 && !selectedCalcarioId) {
      const first = (calcarios[0] as any).id || calcarios[0].nome;
      setSelectedCalcarioId(first);
    }
  }, [calcarios, selectedCalcarioId]);

  const selectedCalcario = useMemo(() => {
    if (!selectedCalcarioId || calcarios.length === 0) return null;
    return calcarios.find((c: any) => (c.id || c.nome) === selectedCalcarioId) || null;
  }, [calcarios, selectedCalcarioId]);

  // Pré-preenche V1 com o V% calculado na etapa de solo (se disponível)
  const soilV = coffeeData.soil?.vPercent;

  const v1 = useNumericInput(soilV ? soilV.toFixed(1) : '');
  // V2 default: formação (≤24 meses) → 70%, produção → 60%
  const v2 = useNumericInput('60');
  const ctc = useNumericInput(
    coffeeData.soil
      ? (coffeeData.soil.ca + coffeeData.soil.mg + coffeeData.soil.k / 391 + coffeeData.soil.hAl).toFixed(2)
      : ''
  );
  const prnt = useNumericInput(String(PRNT_DEFAULT));
  const [depthMultiplier, setDepthMultiplier] = useState<1 | 2>(1);

  // Sincronizar PRNT com o calcário selecionado
  useEffect(() => {
    if (selectedCalcario && selectedCalcario.correcao?.prnt > 0) {
      prnt.setManually(selectedCalcario.correcao.prnt.toString());
    }
  }, [selectedCalcario]);

  // Meta de produtividade — pré-preenchida com o valor da etapa 4
  const savedSacas = coffeeData.productivity?.sacasPerHectare;
  const productivity = useNumericInput(savedSacas ? String(savedSacas) : '');

  // ─── 1st year planting detection ──────────────────────────
  const { talhoes } = useTalhoes();
  const selectedTalhao = useMemo(() => {
    if (!coffeeData.selectedTalhaoId) return null;
    return talhoes.find(t => t.id === coffeeData.selectedTalhaoId) ?? null;
  }, [coffeeData.selectedTalhaoId, talhoes]);

  const hectares = coffeeData.productivity?.hectares || coffeeData.hectares || 1;
  const totalPlants = coffeeData.totalPlants || 0;
  const plantsPerHa = hectares > 0 ? Math.round(totalPlants / hectares) : 0;

  const isFirstYear = useMemo(() => {
    if (!selectedTalhao) return false;
    const pm = selectedTalhao.planting_month ?? 1;
    const py = selectedTalhao.planting_year ?? 2020;
    const now = new Date();
    const plantDate = new Date(py, pm - 1);
    const diffMonths = (now.getFullYear() - plantDate.getFullYear()) * 12 + (now.getMonth() - plantDate.getMonth());
    return diffMonths >= 0 && diffMonths <= FIRST_YEAR_MAX_MONTHS;
  }, [selectedTalhao]);

  // Ajustar V2 alvo quando fase de formação é detectada
  useEffect(() => {
    if (isFirstYear) {
      v2.setManually(String(V_ALVO_PRIMEIRO_ANO));
    }
  }, [isFirstYear]);

  const firstYearOverride = useMemo((): FirstYearOverride | undefined => {
    if (!isFirstYear || plantsPerHa <= 0) return undefined;
    const metaN = coffeeData.coffeeType === 'conilon' ? 60 : 40;
    const doseK2O = findDoseK2O(coffeeData.soil?.k ?? 0);
    return {
      nGPerHa: metaN * plantsPerHa,
      k2oGPerHa: doseK2O * plantsPerHa,
      microScale: 0.4,
    };
  }, [isFirstYear, plantsPerHa, coffeeData.coffeeType, coffeeData.soil]);

  // Total de nutrientes — adjusted for planting date
  const totalN = useMemo(() => {
    if (isFirstYear && firstYearOverride) return firstYearOverride.nGPerHa / 1000; // kg/ha
    return productivity.num > 0 ? productivity.num * 3.5 : 0;
  }, [productivity.num, isFirstYear, firstYearOverride]);
  const totalK = useMemo(() => {
    if (isFirstYear && firstYearOverride) return firstYearOverride.k2oGPerHa / 1000; // kg/ha
    return productivity.num > 0 ? productivity.num * 4.5 : 0;
  }, [productivity.num, isFirstYear, firstYearOverride]);

  // Calagem: NC (t/ha) = ((V_alvo - V_atual) × CTC) / PRNT × profundidade
  const liming = useMemo(() => {
    if (v1.num <= 0 || v2.num <= 0 || ctc.num <= 0 || prnt.num <= 0) return null;
    if (v2.num <= v1.num) return { nc: 0, needsCorrection: false };
    const ncTonHa = ((v2.num - v1.num) * ctc.num) / prnt.num;
    const ncFinal = ncTonHa * depthMultiplier;
    return { nc: ncFinal, needsCorrection: ncFinal > 0 };
  }, [v1.num, v2.num, ctc.num, prnt.num, depthMultiplier]);

  // Texture-aware parceling
  const soilTexture = coffeeData.soil?.texturaEstimada || null;
  const parcelCount = getTextureParcelCount(soilTexture, coffeeData.coffeeType);
  const { months: activeMonths, dist: activeDist } = useMemo(() => getDistribution(parcelCount), [parcelCount]);

  // Parcelamento mensal
  const schedule = useMemo(() => {
    return activeMonths.map((month) => {
      const pct = activeDist[month] || 0;
      return {
        month,
        pct,
        nKg: totalN > 0 ? (totalN * pct) / 100 : 0,
        kKg: totalK > 0 ? (totalK * pct) / 100 : 0,
      };
    });
  }, [totalN, totalK, activeMonths, activeDist]);

  const hasScheduleData = totalN > 0 || totalK > 0;

  // ── Auto-Recommendation ─────────────────────────────────────
  const [autoRecLoading, setAutoRecLoading] = useState(false);
  const [autoRecResults, setAutoRecResults] = useState<RecommendedProduct[] | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [doseOverrides, setDoseOverrides] = useState<Record<number, string>>({});

  // Map insumo to candidate format
  const mapToCandidate = (i: any) => ({
    id: i.id,
    nome: i.nome || i.name,
    tipo_produto: i.tipoProduto || i.tipo_produto,
    preco: i.preco || i.price || 0,
    tamanho_unidade: i.tamanhoUnidade || i.tamanho_unidade || 1,
    medida: i.medida || 'kg',
    recomendacao_dose_ha: i.recomendacaoDoseHa || i.recomendacao_dose_ha || 0,
    recomendacao_dose_unidade: i.recomendacaoDoseUnidade || i.recomendacao_dose_unidade || 'kg/ha',
    macro_n: i.macronutrientes?.n ?? i.macro_n ?? 0,
    macro_p2o5: i.macronutrientes?.p2o5 ?? i.macro_p2o5 ?? 0,
    macro_k2o: i.macronutrientes?.k2o ?? i.macro_k2o ?? 0,
    macro_s: i.macronutrientes?.s ?? i.macro_s ?? 0,
    micro_b: i.micronutrientes?.b ?? i.micro_b ?? 0,
    micro_zn: i.micronutrientes?.zn ?? i.micro_zn ?? 0,
    micro_cu: i.micronutrientes?.cu ?? i.micro_cu ?? 0,
    micro_mn: i.micronutrientes?.mn ?? i.micro_mn ?? 0,
    micro_fe: i.micronutrientes?.fe ?? i.micro_fe ?? 0,
    micro_mo: i.micronutrientes?.mo ?? i.micro_mo ?? 0,
  });

  // Filter fertigation-type products from DB for auto recommendation
  const fertigationCandidates = useMemo(() => {
    return insumosDB.filter(
      (i) => i.status === 'ativo' &&
        ['Cobertura', 'Plantio', 'Correção de Solo'].includes(i.tipoProduto) &&
        (i.macronutrientes?.n > 0 || i.macronutrientes?.k2o > 0 || i.macronutrientes?.p2o5 > 0 || i.macronutrientes?.s > 0)
    ).map(mapToCandidate);
  }, [insumosDB]);

  // For manual mode: use ALL user-selected insumos that have any macro composition
  const manualCandidates = useMemo(() => {
    return coffeeData.insumos
      .filter((i) =>
        (i.macronutrientes?.n > 0 || i.macronutrientes?.k2o > 0 || i.macronutrientes?.p2o5 > 0 || i.macronutrientes?.s > 0)
      )
      .map(mapToCandidate);
  }, [coffeeData.insumos]);

  // Auto-trigger recommendation when in automatic mode
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (
      coffeeData.recommendationMode === 'auto' &&
      !autoTriggered &&
      !loadingInsumos &&
      fertigationCandidates.length > 0 &&
      productivity.num > 0
    ) {
      setAutoTriggered(true);
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        handleAutoRecommend(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [coffeeData.recommendationMode, autoTriggered, loadingInsumos, fertigationCandidates.length, productivity.num]);

  const handleAutoRecommend = (useManualProducts = false) => {
    if (productivity.num <= 0) {
      toast.warning('Informe a meta de produtividade primeiro.');
      return;
    }
    const candidates = useManualProducts ? manualCandidates : fertigationCandidates;
    if (candidates.length === 0) {
      toast.warning(useManualProducts
        ? 'Nenhum insumo selecionado com composição nutricional de N/K₂O. Selecione insumos de Cobertura ou Plantio nas etapas anteriores.'
        : 'Nenhum produto compatível encontrado no banco de insumos.');
      return;
    }
    setAutoRecLoading(true);
    setTimeout(() => {
      const sf = calcStandFactor(plantsPerHa, coffeeData.coffeeType);
      const results = generateAutoRecommendation(
        productivity.num,
        coffeeData.leafAnalysis || null,
        candidates as any,
        'fertigation',
        undefined,
        firstYearOverride,
        coffeeData.soil?.p,
        sf,
      );
      setAutoRecResults(results);
      setDoseOverrides({});
      setAutoRecLoading(false);
      if (results.length === 0) {
        toast.info(useManualProducts
          ? 'Os insumos selecionados não cobrem a demanda. Revise a seleção nas etapas anteriores.'
          : 'Nenhum produto compatível encontrado. Cadastre insumos de Cobertura/Plantio com composição nutricional e dose recomendada.');
      } else {
        toast.success(`${results.length} produtos recomendados para fechar N e K₂O`);
      }
    }, 300);
  };
  useEffect(() => {
    if (!liming || !liming.needsCorrection) {
      setLimingData(null);
      return;
    }

    const calcarioPreco = selectedCalcario?.preco || 0;
    const calcarioUnidade = selectedCalcario?.tamanhoUnidade || 1;
    const costPerHa = calcarioPreco > 0
      ? (liming.nc * 1000 / calcarioUnidade) * calcarioPreco
      : 0;
    const totalTons = liming.nc * (coffeeData.hectares || 0);
    const totalCost = costPerHa * (coffeeData.hectares || 0);

    setLimingData({
      nc: liming.nc,
      prnt: prnt.num,
      productName: selectedCalcario?.nome || null,
      costPerHa,
      totalTons,
      totalCost,
    });
  }, [liming, selectedCalcario, prnt.num, coffeeData.hectares]);

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Calagem & Parcelamento — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Calcule a necessidade de calcário e o parcelamento de adubação
        </p>
      </div>

      {/* === CALAGEM === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Beaker className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Calagem
          </h3>
        </div>

        {/* Seletor de calcário cadastrado */}
        {loadingInsumos ? (
          <div className="p-4 rounded-xl bg-secondary/50 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando calcários do banco de dados...</span>
          </div>
        ) : calcarios.length > 0 ? (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Calcário do Banco de Insumos
              </span>
            </div>
            {calcarios.length === 1 ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{selectedCalcario?.nome}</p>
                  <p className="text-xs text-muted-foreground">{selectedCalcario?.marca} — PRNT: {selectedCalcario?.correcao?.prnt}%</p>
                </div>
              </div>
            ) : (
              <Select value={selectedCalcarioId} onValueChange={setSelectedCalcarioId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o calcário" />
                </SelectTrigger>
                <SelectContent>
                  {calcarios.map((c: any) => (
                    <SelectItem key={c.id || c.nome} value={c.id || c.nome}>
                      {c.nome} — PRNT: {c.correcao?.prnt}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum calcário cadastrado</p>
              <p className="text-xs text-muted-foreground">
                Cadastre um calcário com PRNT na aba de Insumos (Correção de Solo) para preencher automaticamente, ou informe o PRNT manualmente abaixo.
              </p>
            </div>
          </div>
        )}

        {/* 1º Ano banner */}
        {isFirstYear && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Modo 1º Ano Ativo (≤ 24 meses)</p>
              <p className="text-[11px] text-muted-foreground">
                V% alvo ajustado para {V_ALVO_PRIMEIRO_ANO}%. Fórmula: NC = ((V₂ − V₁) × CTC) ÷ PRNT
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'V1 (atual %)', field: v1, id: 'v1', auto: !!soilV },
            { label: `V2 (desejado %)${isFirstYear ? ' — 1º Ano' : ''}`, field: v2, id: 'v2', auto: isFirstYear },
            { label: 'CTC (cmolc/dm³)', field: ctc, id: 'ctc', auto: !!coffeeData.soil },
            { label: 'PRNT (%)', field: prnt, id: 'prnt', auto: !!selectedCalcario },
          ].map((item) => (
            <div key={item.id} className="space-y-1.5">
              <Label htmlFor={`liming-${item.id}`} className="text-xs">
                {item.label}
              </Label>
              <Input
                id={`liming-${item.id}`}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={item.field.value}
                onChange={item.field.onChange}
                readOnly={item.auto}
                className={cn(item.auto && 'bg-secondary cursor-default')}
              />
              {item.auto && item.id === 'prnt' && selectedCalcario && (
                <p className="text-[10px] text-muted-foreground">
                  Importado de: {selectedCalcario.nome}
                </p>
              )}
              {item.id === 'v2' && isFirstYear && (
                <p className="text-[10px] text-primary font-medium">
                  V% alvo 1º ano = {V_ALVO_PRIMEIRO_ANO}%
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Seletor de profundidade de correção */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Profundidade de Correção
          </Label>
          <Select
            value={String(depthMultiplier)}
            onValueChange={(v) => setDepthMultiplier(Number(v) as 1 | 2)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">0–20 cm (padrão)</SelectItem>
              <SelectItem value="2">0–40 cm (2× a dose)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Correção a 0–40 cm dobra a necessidade de calcário.
          </p>
        </div>

        {/* Resultado da calagem */}
        {liming && (
          <div
            className={cn(
              'p-6 rounded-2xl text-center space-y-2',
              liming.needsCorrection ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'
            )}
            style={{ animation: 'scale-in 0.3s ease-out' }}
          >
            <p className="text-4xl font-bold text-foreground mb-1">
              {liming.nc.toFixed(2)} <span className="text-lg font-normal text-muted-foreground">t/ha</span>
            </p>
            <p className="text-lg font-semibold text-foreground">
              {(liming.nc * 1000).toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kg/ha</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {liming.needsCorrection
                ? 'Necessidade de calcário para elevar o V%'
                : 'V% atual já atende o alvo — sem necessidade de calagem'}
            </p>
            {selectedCalcario && (
              <p className="text-xs text-primary font-medium">
                Produto: {selectedCalcario.nome} (PRNT {selectedCalcario.correcao?.prnt}%)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              NC = ((V₂ − V₁) × CTC) ÷ PRNT{depthMultiplier === 2 ? ' × 2 (prof. 0–40 cm)' : ''}
            </p>
            {liming.needsCorrection && coffeeData.hectares > 0 && (
              <>
                <p className="text-xs text-primary font-medium">
                  Total para {coffeeData.hectares} ha: {(liming.nc * coffeeData.hectares).toFixed(2)} toneladas
                </p>
                {selectedCalcario && selectedCalcario.preco > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estimativa de custo: R$ {((liming.nc * 1000 / selectedCalcario.tamanhoUnidade) * selectedCalcario.preco).toFixed(2)}/ha
                    {' · '}R$ {((liming.nc * coffeeData.hectares * 1000 / selectedCalcario.tamanhoUnidade) * selectedCalcario.preco).toFixed(2)} total
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* === PARCELAMENTO === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Parcelamento de Adubação (Set–Abr)
          </h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Informe a meta de produtividade. O sistema calcula automaticamente N (sacas × 3,5) e K₂O (sacas × 4,5) e distribui na curva escalonada com pico em Dez–Fev.
        </p>

        {/* Texture-aware parcel info */}
        {soilTexture && (
          <div className={cn(
            'p-3 rounded-xl border flex items-start gap-2',
            soilTexture === 'arenosa' && 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700',
            soilTexture === 'media' && 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
            soilTexture === 'argilosa' && 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700',
          )}>
            <Layers className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                Textura {soilTexture.charAt(0).toUpperCase() + soilTexture.slice(1)} detectada
              </p>
              <p className="text-[11px] text-muted-foreground">
                {soilTexture === 'arenosa' && `Parcelamento ajustado para ${parcelCount} vezes — menor risco de lixiviação.`}
                {soilTexture === 'media' && `Parcelamento padrão de ${parcelCount} vezes mantido.`}
                {soilTexture === 'argilosa' && `Parcelamento reduzido para ${parcelCount} vezes — solo retém nutrientes.`}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="meta-prod" className="text-xs flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
            Meta de Produtividade (sacas/ha)
          </Label>
          <Input
            id="meta-prod"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 50"
            value={productivity.value}
            onChange={productivity.onChange}
            readOnly={!!savedSacas}
            className={cn(savedSacas && 'bg-secondary cursor-default')}
          />
          {savedSacas && (
            <p className="text-[10px] text-muted-foreground">
              Valor importado da etapa de Produtividade ({savedSacas} sc/ha)
            </p>
          )}
        </div>

        {/* Resumo de N e K calculados */}
        {hasScheduleData && (
          <div
            className="grid grid-cols-2 gap-3"
            style={{ animation: 'fade-in 0.3s ease-out' }}
          >
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalN.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                N total (kg/ha)
              </p>
              <p className="text-[10px] text-muted-foreground">
                {productivity.num} sc × 3,5
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalK.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                K₂O total (kg/ha)
              </p>
              <p className="text-[10px] text-muted-foreground">
                {productivity.num} sc × 4,5
              </p>
            </div>
          </div>
        )}

        {/* Tabela de parcelamento */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mês
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  %
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  N (kg/ha)
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  K₂O (kg/ha)
                </th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => {
                const isPeak = ['Dez', 'Jan', 'Fev'].includes(row.month);
                return (
                  <tr
                    key={row.month}
                    className={cn(
                      'border-t border-border transition-colors',
                      isPeak && hasScheduleData ? 'bg-primary/5' : ''
                    )}
                  >
                    <td className={cn('px-4 py-2.5 font-medium', isPeak ? 'text-primary' : 'text-foreground')}>
                      {row.month}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
                      {row.pct}%
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                      {hasScheduleData ? row.nKg.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                      {hasScheduleData ? row.kKg.toFixed(1) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {hasScheduleData && (
              <tfoot>
                <tr className="border-t-2 border-primary/30 bg-secondary">
                  <td className="px-4 py-3 font-semibold text-foreground">Total</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">100%</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {totalN.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {totalK.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Legenda visual da distribuição */}
        {hasScheduleData && (
          <div className="flex items-end gap-1 h-16 px-2" style={{ animation: 'fade-in 0.3s ease-out' }}>
            {schedule.map((row) => (
              <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-full rounded-t-sm transition-all',
                    ['Dez', 'Jan', 'Fev'].includes(row.month) ? 'bg-primary' : 'bg-primary/40'
                  )}
                  style={{ height: `${(row.pct / 18) * 100}%` }}
                />
                <span className="text-[9px] text-muted-foreground">{row.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === AUTO-RECOMENDAÇÃO DE ADUBOS === */}
      {hasScheduleData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Recomendação de Adubos
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Hand className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={cn('text-xs font-medium', !autoMode ? 'text-foreground' : 'text-muted-foreground')}>Manual</span>
                <Switch
                  checked={autoMode}
                  onCheckedChange={(checked) => {
                    setAutoMode(checked);
                    if (!checked) setAutoRecResults(null);
                  }}
                />
                <span className={cn('text-xs font-medium', autoMode ? 'text-foreground' : 'text-muted-foreground')}>Auto</span>
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {!autoMode && (
            <>
              <p className="text-xs text-muted-foreground">
                Gera a recomendação usando apenas os <strong className="text-foreground">{coffeeData.insumos.length} insumos</strong> que você selecionou nas etapas anteriores (Correção, Cobertura, Manutenção),
                para fechar a demanda de N ({totalN.toFixed(0)} kg/ha) e K₂O ({totalK.toFixed(0)} kg/ha).
              </p>
              {manualCandidates.length === 0 && (
                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Nenhum insumo de Cobertura/Plantio com N ou K₂O foi selecionado. Volte às etapas anteriores e escolha os produtos.
                  </p>
                </div>
              )}
              <Button
                size="sm"
                onClick={() => handleAutoRecommend(true)}
                disabled={autoRecLoading || manualCandidates.length === 0}
                className="gap-2"
              >
                {autoRecLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PackageCheck className="w-3.5 h-3.5" />
                )}
                Gerar com Insumos Selecionados ({manualCandidates.length})
              </Button>
            </>
          )}

          {autoMode && (
            <>
              <p className="text-xs text-muted-foreground">
                Seleciona automaticamente os melhores produtos de Cobertura e Plantio do banco de insumos
                para fechar a demanda de N ({totalN.toFixed(0)} kg/ha) e K₂O ({totalK.toFixed(0)} kg/ha),
                respeitando limites de toxicidade.
              </p>
              <Button
                size="sm"
                onClick={() => handleAutoRecommend(false)}
                disabled={autoRecLoading || loadingInsumos}
                className="gap-2"
              >
                {autoRecLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Auto Indicação
              </Button>
            </>
          )}

          {autoRecResults && autoRecResults.length > 0 && (
            <div className="space-y-3" style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Dose
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                        Custo/ha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoRecResults.map((rec, idx) => {
                      const effectiveDose = doseOverrides[idx] !== undefined
                        ? (parseFloat(doseOverrides[idx]) || 0)
                        : rec.dose;
                      const costPerHa = rec.product.preco > 0 && rec.product.tamanho_unidade > 0
                        ? (effectiveDose / rec.product.tamanho_unidade) * rec.product.preco
                        : 0;
                      return (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-foreground text-xs">{rec.product.nome}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                              {rec.reason}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={doseOverrides[idx] !== undefined ? doseOverrides[idx] : rec.dose.toFixed(1)}
                                onChange={(e) => {
                                  const v = e.target.value.replace(',', '.');
                                  if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                    setDoseOverrides(prev => ({ ...prev, [idx]: v }));
                                  }
                                }}
                                className="w-16 text-right text-xs tabular-nums bg-transparent border-b border-dashed border-primary/40 focus:border-primary outline-none py-0.5 px-1 text-foreground"
                              />
                              <span className="text-[10px] text-muted-foreground">{rec.unit}</span>
                            </div>
                            {doseOverrides[idx] !== undefined && parseFloat(doseOverrides[idx]) !== rec.dose && (
                              <p className="text-[9px] text-primary mt-0.5">
                                orig: {rec.dose.toFixed(1)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground text-xs whitespace-nowrap hidden sm:table-cell">
                            {costPerHa > 0 ? `R$ ${costPerHa.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary/30 bg-secondary">
                      <td className="px-3 py-2.5 font-semibold text-foreground text-xs">
                        Total ({autoRecResults.length} produtos)
                      </td>
                      <td />
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground text-xs hidden sm:table-cell">
                        R$ {autoRecResults.reduce((sum, rec, idx) => {
                          const effectiveDose = doseOverrides[idx] !== undefined
                            ? (parseFloat(doseOverrides[idx]) || 0)
                            : rec.dose;
                          const c = rec.product.preco > 0 && rec.product.tamanho_unidade > 0
                            ? (effectiveDose / rec.product.tamanho_unidade) * rec.product.preco
                            : 0;
                          return sum + c;
                        }, 0).toFixed(2)}/ha
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Nutrient coverage summary */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-foreground mb-2">Cobertura Nutricional do Mix</p>
                <div className="flex flex-wrap gap-2">
                  {['n', 'p', 'k', 's'].map(key => {
                    const symbol = getNutrientSymbol(key);
                    const covered = autoRecResults.some(r => r.nutrientsCovered.includes(key));
                    return (
                      <span
                        key={key}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                          covered
                            ? 'bg-primary/20 text-primary'
                            : 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {covered ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                        {symbol}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {autoRecResults && autoRecResults.length === 0 && (
            <div className="p-4 rounded-xl bg-secondary/50 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum produto compatível encontrado. Cadastre insumos de Cobertura ou Plantio com composição nutricional e dose recomendada.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
