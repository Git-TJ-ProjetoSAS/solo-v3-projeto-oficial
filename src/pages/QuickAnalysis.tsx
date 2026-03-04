import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Beaker, Leaf, Sparkles, Camera, Upload, Loader2, CheckCircle2, AlertCircle,
  AlertTriangle, TrendingUp, Calculator, FlaskConical, Droplets, Package,
  DollarSign, FileText, Wand2, Download, MessageCircle, Printer, Sprout,
  ArrowLeftRight, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useInsumos } from '@/hooks/useInsumos';
import { useFarmData } from '@/hooks/useFarmData';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserProfile } from '@/hooks/useUserProfile';
import { calcularRecomendacaoComInsumos, type RecommendationEngineResult, type InsumoRecomendado } from '@/hooks/useRecommendationEngine';
import { ProductivityRange, PRODUCTIVITY_LEVELS } from '@/types/recommendation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WizardSoilData } from '@/contexts/WizardContext';
import type { InsumoFormData } from '@/types/insumo';
import { LOGO_URL } from '@/lib/constants';
import InvestmentSheet from '@/components/report/InvestmentSheet';
import { CoverPlanningTimeline } from '@/components/coverage/CoverPlanningTimeline';

interface SoilFormData {
  ca: string; mg: string; k: string; hAl: string; p: string; mo: string;
  zn: string; b: string; mn: string; fe: string; cu: string; s: string;
}

const EMPTY_FORM: SoilFormData = {
  ca: '', mg: '', k: '', hAl: '', p: '', mo: '',
  zn: '', b: '', mn: '', fe: '', cu: '', s: '',
};

type CategoryKey = 'calagem' | 'plantio' | 'cobertura' | 'potassio' | 'micro';

// ─── Product Selector ───────────────────────────────────────
function ProductSelector({ category, label, alternatives, selectedIds, onToggle }: {
  category: CategoryKey;
  label: string;
  alternatives: (InsumoFormData & { id: string })[];
  selectedIds: string[];
  onToggle: (category: CategoryKey, productId: string) => void;
}) {
  if (alternatives.length === 0) return null;
  return (
    <div className="border border-dashed border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <ArrowLeftRight className="w-3.5 h-3.5" />
        <span>Trocar {label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {alternatives.map((alt) => {
          const isSelected = selectedIds.includes(alt.id);
          const precoUnit = alt.preco / alt.tamanhoUnidade;
          return (
            <button
              key={alt.id}
              onClick={() => onToggle(category, alt.id)}
              className={cn(
                "text-left text-xs px-3 py-2 rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <p className="font-medium truncate max-w-[160px]">{alt.nome}</p>
              <p className="text-muted-foreground">
                {alt.marca} • R$ {precoUnit.toFixed(2)}/{alt.medida === 'kg' ? 'kg' : 'L'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compact Insumo Row ─────────────────────────────────────
function InsumoRow({ insumo }: { insumo: InsumoRecomendado }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="min-w-0 flex-1 pr-3">
        <p className="font-medium text-sm truncate">{insumo.nome}</p>
        <p className="text-xs text-muted-foreground">{insumo.quantidadePorHa.toFixed(2)} {insumo.unidade}/ha</p>
      </div>
      <p className="text-sm font-bold text-primary shrink-0">
        R$ {insumo.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

// ─── Result Section Card ────────────────────────────────────
function ResultSection({
  title, icon, colorClass, badge, children, defaultOpen = true
}: {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="card-elevated overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className={cn("w-full flex items-center gap-2 px-4 py-3 text-left", colorClass)}>
            {icon}
            <span className="font-semibold text-sm flex-1">{title}</span>
            {badge && (
              <span className="text-[10px] bg-background/50 px-2 py-0.5 rounded-full mr-1">{badge}</span>
            )}
            {open ? <ChevronUp className="w-4 h-4 opacity-60 shrink-0" /> : <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 space-y-3">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Field Input ────────────────────────────────────────────
function FieldInput({
  id, label, unit, value, onChange, required, badge
}: {
  id: string; label: string; unit: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; badge?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {badge && <span className="text-[10px] text-muted-foreground">{badge}</span>}
      </div>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={value}
          onChange={onChange}
          className="h-10 pr-16 text-sm"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}

// ─── localStorage persistence ────────────────────────────────
const LS_KEY = 'quick_analysis_form_v1';
interface PersistedState { formData: SoilFormData; hectaresInput: string; faixaProdutiva: ProductivityRange; }
function loadPersistedState(): Partial<PersistedState> {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function savePersistedState(state: PersistedState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

// ─── Main Page ──────────────────────────────────────────────
export default function QuickAnalysis() {
  const { insumos: insumosDB, loading: loadingInsumos } = useInsumos();
  const { selectedSeed, seeds } = useFarmData();
  const { isConsultor } = useUserRole();
  const { profile } = useUserProfile();

  const persisted = useMemo(() => loadPersistedState(), []);

  const [formData, setFormData] = useState<SoilFormData>(persisted.formData ?? EMPTY_FORM);
  const [hectaresInput, setHectaresInput] = useState(persisted.hectaresInput ?? '');
  const [faixaProdutiva, setFaixaProdutiva] = useState<ProductivityRange>(persisted.faixaProdutiva ?? 'media');
  const [recommendation, setRecommendation] = useState<RecommendationEngineResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [usedSeed, setUsedSeed] = useState<typeof selectedSeed>(null);
  const [selectedByCategory, setSelectedByCategory] = useState<Record<CategoryKey, string[]>>({
    calagem: [], plantio: [], cobertura: [], potassio: [], micro: [],
  });
  const [macroOpen, setMacroOpen] = useState(true);
  const [microOpen, setMicroOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Persist form state to localStorage on every change
  useEffect(() => {
    savePersistedState({ formData, hectaresInput, faixaProdutiva });
  }, [formData, hectaresInput, faixaProdutiva]);

  // AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Derived: form has any data entered
  const isFormDirty = Object.values(formData).some(v => v !== '') || hectaresInput !== '';

  const handleClear = useCallback(() => {
    setFormData(EMPTY_FORM);
    setHectaresInput('');
    setFaixaProdutiva('media');
    setRecommendation(null);
    setSelectedByCategory({ calagem: [], plantio: [], cobertura: [], potassio: [], micro: [] });
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  const TIPOS_PULVERIZACAO = ['Foliar', 'Fungicida', 'Inseticida', 'Herbicida', 'Adjuvantes'];
  const insumosDisponiveis = useMemo(() => {
    return insumosDB.filter(i =>
      i.status === 'ativo' &&
      !TIPOS_PULVERIZACAO.includes(i.tipoProduto) &&
      (i.culturas.length === 0 || i.culturas.some(c => c.toLowerCase().includes('milho')))
    );
  }, [insumosDB]);

  const alternativasPorCategoria = useMemo(() => {
    const map: Record<CategoryKey, (InsumoFormData & { id: string })[]> = {
      calagem: [], plantio: [], cobertura: [], potassio: [], micro: [],
    };
    insumosDisponiveis.forEach(insumo => {
      if (insumo.tipoProduto === 'Correção de Solo' && insumo.correcao.prnt > 0) map.calagem.push(insumo);
      if (insumo.tipoProduto === 'Plantio' && (insumo.macronutrientes.p2o5 > 0 || insumo.macronutrientes.n > 0)) map.plantio.push(insumo);
      if (insumo.tipoProduto === 'Cobertura' && (insumo.macronutrientes.n > 0 || insumo.macronutrientes.s > 0)) map.cobertura.push(insumo);
      if ((insumo.tipoProduto === 'Cobertura' || insumo.tipoProduto === 'Plantio') && insumo.macronutrientes.k2o > 30) map.potassio.push(insumo);
      if ((insumo.tipoProduto === 'Correção de Solo' || insumo.tipoProduto === 'Foliar') &&
          (insumo.micronutrientes.b > 0 || insumo.micronutrientes.zn > 0 || insumo.micronutrientes.cu > 0 ||
           insumo.micronutrientes.mn > 0 || insumo.micronutrientes.fe > 0)) map.micro.push(insumo);
    });
    return map;
  }, [insumosDisponiveis]);

  const handleToggleProduct = useCallback((category: CategoryKey, productId: string) => {
    setSelectedByCategory(prev => {
      const current = prev[category];
      const isSelected = current.includes(productId);
      if (category === 'calagem') return { ...prev, [category]: isSelected ? [] : [productId] };
      return { ...prev, [category]: isSelected ? current.filter(id => id !== productId) : [...current, productId] };
    });
  }, []);

  const autoSelectBestProducts = useCallback(() => {
    const selections: Record<CategoryKey, string[]> = { calagem: [], plantio: [], cobertura: [], potassio: [], micro: [] };
    const bestCalagem = [...alternativasPorCategoria.calagem].sort((a, b) => b.correcao.prnt - a.correcao.prnt)[0];
    if (bestCalagem) selections.calagem = [bestCalagem.id];
    const bestPlantio = [...alternativasPorCategoria.plantio].sort((a, b) => b.macronutrientes.p2o5 - a.macronutrientes.p2o5)[0];
    if (bestPlantio) selections.plantio = [bestPlantio.id];
    const coberturaByS = [...alternativasPorCategoria.cobertura].sort((a, b) => b.macronutrientes.s - a.macronutrientes.s);
    const coberturaByN = [...alternativasPorCategoria.cobertura].sort((a, b) => b.macronutrientes.n - a.macronutrientes.n);
    const cobIds = new Set<string>();
    if (coberturaByS[0] && coberturaByS[0].macronutrientes.s > 0) cobIds.add(coberturaByS[0].id);
    if (coberturaByN[0]) cobIds.add(coberturaByN[0].id);
    selections.cobertura = Array.from(cobIds);
    const bestK = [...alternativasPorCategoria.potassio].sort((a, b) => b.macronutrientes.k2o - a.macronutrientes.k2o)[0];
    if (bestK) selections.potassio = [bestK.id];
    const microSorted = [...alternativasPorCategoria.micro].sort((a, b) => {
      const scoreA = a.micronutrientes.b + a.micronutrientes.zn + a.micronutrientes.cu + a.micronutrientes.mn + a.micronutrientes.fe;
      const scoreB = b.micronutrientes.b + b.micronutrientes.zn + b.micronutrientes.cu + b.micronutrientes.mn + b.micronutrientes.fe;
      return scoreB - scoreA;
    });
    selections.micro = microSorted.slice(0, 2).map(m => m.id);
    setSelectedByCategory(selections);
    return selections;
  }, [alternativasPorCategoria]);

  const hasRecommendation = useRef(false);
  useEffect(() => {
    if (hasRecommendation.current && recommendation) {
      runRecommendation(selectedByCategory);
    }
  }, [selectedByCategory]);

  useEffect(() => {
    if (recommendation) hasRecommendation.current = true;
  }, [recommendation]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
      setRecommendation(null);
    }
  };

  const buildSoilData = useCallback((): WizardSoilData | null => {
    const ca = parseFloat(formData.ca) || 0;
    const mg = parseFloat(formData.mg) || 0;
    const k = parseFloat(formData.k) || 0;
    const hAl = parseFloat(formData.hAl) || 0;
    if (ca === 0 && mg === 0 && k === 0 && hAl === 0) return null;

    const kConverted = k / 391;
    const sb = ca + mg + kConverted;
    const ctc = sb + hAl;
    const vPercent = ctc > 0 ? (sb / ctc) * 100 : 0;

    return {
      ca, mg, k, hAl,
      p: parseFloat(formData.p) || 0,
      mo: parseFloat(formData.mo) || 0,
      zn: parseFloat(formData.zn) || 0,
      b: parseFloat(formData.b) || 0,
      mn: parseFloat(formData.mn) || 0,
      fe: parseFloat(formData.fe) || 0,
      cu: parseFloat(formData.cu) || 0,
      s: parseFloat(formData.s) || 0,
      vPercent,
    };
  }, [formData]);

  const liveVPercent = useMemo(() => {
    const soil = buildSoilData();
    return soil?.vPercent ?? null;
  }, [buildSoilData]);

  const isFormValid = formData.ca && formData.mg && formData.k && formData.hAl;

  // ─── AI Image Processing ─────────────────────────────────
  const processImage = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setAiStatus('idle');
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('read-soil-analysis', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (!data?.valido) {
        setAiStatus('error');
        toast.error('O documento não parece ser uma análise de solo válida.');
        return;
      }

      setFormData({
        ca: data.ca != null ? String(data.ca) : '',
        mg: data.mg != null ? String(data.mg) : '',
        k: data.k != null ? String(data.k) : '',
        hAl: data.hAl != null ? String(data.hAl) : '',
        p: data.p != null ? String(data.p) : '',
        mo: data.mo != null ? String(data.mo) : '',
        zn: data.zn != null ? String(data.zn) : '',
        b: data.b != null ? String(data.b) : '',
        mn: data.mn != null ? String(data.mn) : '',
        fe: data.fe != null ? String(data.fe) : '',
        cu: data.cu != null ? String(data.cu) : '',
        s: data.s != null ? String(data.s) : '',
      });

      setAiStatus('success');
      setRecommendation(null);
      toast.success('Valores extraídos com sucesso! Confira e ajuste se necessário.');
      if (data.observacoes) {
        setTimeout(() => toast.info(data.observacoes, { duration: 6000 }), 500);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiStatus('error');
      toast.error('Erro ao analisar o documento. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 10MB.'); return; }
      processImage(file);
    }
    e.target.value = '';
  };

  // ─── Core recommendation logic ─────────────────────────────
  const runRecommendation = useCallback((currentSelections: Record<CategoryKey, string[]>) => {
    const soil = buildSoilData();
    const hectares = parseFloat(hectaresInput.replace(',', '.')) || 0;
    if (!soil || hectares <= 0) return;

    let bestSeed = selectedSeed;
    if (!bestSeed && seeds.length > 0) {
      const matchingSeeds = seeds.filter(s => s.productivityRange === faixaProdutiva);
      if (matchingSeeds.length > 0) {
        bestSeed = matchingSeeds.sort((a, b) => a.price - b.price)[0];
      } else {
        bestSeed = [...seeds].sort((a, b) => a.price - b.price)[0];
      }
    }

    const seedData = bestSeed ? {
      seed: bestSeed,
      populationPerHectare: 65000,
      rowSpacing: 0.5,
      seedsPerMeter: 3.25,
    } : null;

    const allSelectedIds = new Set<string>();
    Object.values(currentSelections).forEach(ids => ids.forEach(id => allSelectedIds.add(id)));
    const insumosParaUsar = allSelectedIds.size > 0
      ? insumosDisponiveis.filter(i => allSelectedIds.has(i.id))
      : insumosDisponiveis;

    const result = calcularRecomendacaoComInsumos(
      soil,
      seedData,
      insumosParaUsar,
      hectares,
      faixaProdutiva
    );

    setRecommendation(result);
    setUsedSeed(bestSeed);
  }, [buildSoilData, hectaresInput, selectedSeed, seeds, faixaProdutiva, insumosDisponiveis]);

  const handleGenerate = () => {
    const soil = buildSoilData();
    const hectares = parseFloat(hectaresInput.replace(',', '.')) || 0;

    if (!soil) { toast.error('Preencha os macronutrientes obrigatórios (Ca, Mg, K, H+Al).'); return; }
    if (hectares <= 0) { toast.error('Informe a área em hectares.'); return; }

    setIsGenerating(true);
    const selections = autoSelectBestProducts();
    runRecommendation(selections);
    setIsGenerating(false);
    toast.success('Recomendação gerada!');

    // Scroll to results on mobile
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  // ─── PDF Generation ────────────────────────────────────────
  const handleGeneratePdf = async () => {
    if (!recommendation) { toast.error('Gere a recomendação primeiro.'); return; }
    const soil = buildSoilData();
    if (!soil) return;

    setIsGeneratingPdf(true);
    try {
      const { createRoot } = await import('react-dom/client');
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      const root = createRoot(container);
      await new Promise<void>((resolve) => {
        root.render(
          <InvestmentSheet
            recommendation={recommendation}
            soilData={{
              ca: soil.ca, mg: soil.mg, k: soil.k, hAl: soil.hAl,
              p: soil.p, mo: soil.mo, vPercent: soil.vPercent ?? 0,
              zn: soil.zn, b: soil.b, mn: soil.mn, fe: soil.fe, cu: soil.cu, s: soil.s,
            }}
            hectares={parseFloat(hectaresInput) || 1}
            faixaProdutiva={faixaProdutiva}
            usedSeed={usedSeed}
            consultorName={isConsultor ? (profile?.full_name || 'SOLO V3') : null}
            consultorCreaArt={isConsultor ? profile?.crea_art : null}
            telefone={profile?.telefone}
            enderecoPropriedade={profile?.endereco_propriedade}
          />
        );
        setTimeout(resolve, 500);
      });

      const images = container.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(
          (img) => new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        )
      );

      const el = container.firstElementChild as HTMLElement;
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, allowTaint: true, logging: false,
        backgroundColor: '#ffffff', width: 794,
      });

      const canvasScale = canvas.width / el.offsetWidth;
      const breakPoints = new Set<number>();
      const gatherBreakPoints = (parent: HTMLElement, depth: number) => {
        if (depth > 5) return;
        const kids = Array.from(parent.children) as HTMLElement[];
        for (const child of kids) {
          const top = child.getBoundingClientRect().top - el.getBoundingClientRect().top;
          const bottom = top + child.getBoundingClientRect().height;
          breakPoints.add(Math.round(top * canvasScale));
          breakPoints.add(Math.round(bottom * canvasScale));
          const tag = child.tagName.toLowerCase();
          if (['div', 'tbody', 'table', 'section', 'tr', 'ul', 'ol', 'li'].includes(tag)) {
            gatherBreakPoints(child, depth + 1);
          }
        }
      };
      gatherBreakPoints(el, 0);
      root.unmount();
      document.body.removeChild(container);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210, pdfHeight = 297, margin = 10;
      const contentWidth = pdfWidth - margin * 2, contentHeight = pdfHeight - margin * 2;
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= contentHeight) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        const pxPerMm = imgHeight / canvas.height;
        const maxSlicePx = contentHeight / pxPerMm;
        const sortedBreaks = Array.from(breakPoints).sort((a, b) => a - b);
        sortedBreaks.push(canvas.height);
        const slices: { srcY: number; srcH: number }[] = [];
        let currentY = 0;
        while (currentY < canvas.height) {
          const remaining = canvas.height - currentY;
          if (remaining <= maxSlicePx * 1.15) { slices.push({ srcY: currentY, srcH: remaining }); break; }
          const idealEnd = currentY + maxSlicePx;
          let bestBreak = idealEnd, bestDist = Infinity;
          for (const bp of sortedBreaks) {
            if (bp <= currentY + 30 * canvasScale) continue;
            if (bp > idealEnd + maxSlicePx * 0.05) break;
            const dist = idealEnd - bp, absDist = Math.abs(dist);
            const penalty = dist < 0 ? absDist * 3 : absDist;
            if (penalty < bestDist) { bestDist = penalty; bestBreak = bp; }
          }
          bestBreak = Math.min(bestBreak, canvas.height);
          slices.push({ srcY: currentY, srcH: bestBreak - currentY });
          currentY = bestBreak;
        }
        slices.forEach((slice, page) => {
          if (page > 0) pdf.addPage();
          const destH = (slice.srcH / canvas.height) * imgHeight;
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width; pageCanvas.height = slice.srcH;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, slice.srcY, canvas.width, slice.srcH, 0, 0, canvas.width, slice.srcH);
            pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, destH);
          }
          pdf.setFontSize(8); pdf.setTextColor(150);
          pdf.text(`Solo V3 • Página ${page + 1}/${slices.length}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
        });
      }
      pdf.save(`lamina-investimento-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Lâmina de Investimento gerada!');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Erro ao gerar PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!recommendation) return;
    const lines = [
      `*📋 ANÁLISE RÁPIDA - Recomendação*`,
      `*Área:* ${hectaresInput} ha | *Faixa:* ${PRODUCTIVITY_LEVELS[faixaProdutiva].label}`,
      ``,
      `*💰 INVESTIMENTO*`,
      `• Total: R$ ${recommendation.custoTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `• Por ha: R$ ${recommendation.custoPorHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ``,
      ...(usedSeed ? [`*🌱 Semente:* ${usedSeed.name} (${usedSeed.company})`] : []),
      ``,
      `*📊 DETALHAMENTO*`,
      `• Calagem: R$ ${recommendation.calagem.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `• Plantio: R$ ${recommendation.adubacaoPlantio.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `• Cobertura: R$ ${recommendation.cobertura.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ``,
      `_Gerado pelo Solo V3_`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  // ─── Field definitions ────────────────────────────────────
  const macroFields = [
    { id: 'ca', label: 'Cálcio (Ca)', unit: 'cmolc/dm³', required: true },
    { id: 'mg', label: 'Magnésio (Mg)', unit: 'cmolc/dm³', required: true },
    { id: 'k', label: 'Potássio (K)', unit: 'mg/dm³', required: true },
    { id: 'hAl', label: 'H+Al', unit: 'cmolc/dm³', required: true },
    { id: 'p', label: 'Fósforo (P)', unit: 'mg/dm³' },
    { id: 'mo', label: 'M.O.', unit: 'g/dm³' },
  ];

  const microFields = [
    { id: 'zn', label: 'Zinco (Zn)', unit: 'mg/dm³', badge: '> 1,0' },
    { id: 'b', label: 'Boro (B)', unit: 'mg/dm³', badge: '> 0,3' },
    { id: 'mn', label: 'Manganês (Mn)', unit: 'mg/dm³', badge: '> 5,0' },
    { id: 'fe', label: 'Ferro (Fe)', unit: 'mg/dm³', badge: '> 5,0' },
    { id: 'cu', label: 'Cobre (Cu)', unit: 'mg/dm³', badge: '> 0,5' },
    { id: 's', label: 'Enxofre (S)', unit: 'mg/dm³', badge: '> 10' },
  ];

  const canGenerate = !!isFormValid && !!hectaresInput && parseFloat(hectaresInput) > 0 && !isGenerating && !loadingInsumos;

  return (
    <div className="space-y-4 pb-32 animate-fade-in">

      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
          <Zap className="w-3.5 h-3.5" />
          Análise Rápida
        </div>
        <div className="flex items-center gap-2">
          {loadingInsumos && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {!loadingInsumos && (
            <span className="text-xs text-muted-foreground">{insumosDB.length} insumos</span>
          )}
          {isFormDirty && (
            <button
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ─── AI Upload ───────────────────────────────────── */}
      <Card className="card-elevated border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Leitura automática com IA</span>
            {aiStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
            {aiStatus === 'error' && <AlertCircle className="h-4 w-4 text-destructive ml-auto" />}
          </div>

          {previewUrl && (
            <div className="relative w-full h-24 rounded-xl overflow-hidden bg-secondary">
              <img src={previewUrl} alt="Laudo" className="w-full h-full object-contain" />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-medium">Analisando...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => cameraInputRef.current?.click()} disabled={isAnalyzing}>
              <Camera className="h-3.5 w-3.5" /> Câmera
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
              <Upload className="h-3.5 w-3.5" /> Arquivo
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-tight">
            Envie uma foto ou PDF do laudo. A IA extrai os valores automaticamente.
          </p>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileSelect} className="hidden" />
        </CardContent>
      </Card>

      {/* ─── Macro Inputs ────────────────────────────────── */}
      <Collapsible open={macroOpen} onOpenChange={setMacroOpen}>
        <Card className="card-elevated overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-2 px-4 py-3 text-left bg-primary/5">
              <Beaker className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm flex-1 text-foreground">Macronutrientes</span>
              <span className="text-[10px] text-muted-foreground">Ca, Mg, K, H+Al obrigatórios</span>
              {macroOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 grid grid-cols-2 gap-3">
              {macroFields.map((field) => (
                <FieldInput
                  key={field.id}
                  id={`qa-${field.id}`}
                  label={field.label}
                  unit={field.unit}
                  value={formData[field.id as keyof SoilFormData]}
                  onChange={handleInputChange(field.id)}
                  required={field.required}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Live V% indicator */}
      {liveVPercent !== null && isFormValid && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in",
          liveVPercent >= 60 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        )}>
          {liveVPercent >= 60 ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>V% = <strong>{liveVPercent.toFixed(1)}%</strong></span>
          <span className="text-xs ml-1 opacity-80">
            {liveVPercent >= 60 ? 'Saturação adequada' : 'Abaixo do ideal (60-70%)'}
          </span>
        </div>
      )}

      {/* ─── Micro Inputs ────────────────────────────────── */}
      <Collapsible open={microOpen} onOpenChange={setMicroOpen}>
        <Card className="card-elevated overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-2 px-4 py-3 text-left bg-secondary/30">
              <Leaf className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm flex-1 text-foreground">Micronutrientes</span>
              <span className="text-[10px] text-muted-foreground">opcional</span>
              {microOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 grid grid-cols-2 gap-3">
              {microFields.map((field) => (
                <FieldInput
                  key={field.id}
                  id={`qa-${field.id}`}
                  label={field.label}
                  unit={field.unit}
                  value={formData[field.id as keyof SoilFormData]}
                  onChange={handleInputChange(field.id)}
                  badge={field.badge}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── Config Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="qa-hectares" className="text-xs text-muted-foreground">Área (ha) *</Label>
          <Input
            id="qa-hectares"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 50"
            value={hectaresInput}
            className="h-10 text-sm"
            onChange={(e) => {
              const v = e.target.value.replace(',', '.');
              if (v === '' || /^\d*\.?\d*$/.test(v)) setHectaresInput(v);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Faixa Produtiva</Label>
          <Select value={faixaProdutiva} onValueChange={(v: ProductivityRange) => setFaixaProdutiva(v)}>
            <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRODUCTIVITY_LEVELS).map(([key, level]) => (
                <SelectItem key={key} value={key}>{level.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Results ─────────────────────────────────────── */}
      {recommendation && (
        <div ref={resultRef} className="space-y-3 animate-fade-in">

          {/* Investment Summary Banner */}
          <div className="bg-primary rounded-2xl p-4 text-primary-foreground">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium opacity-90">Investimento Total</span>
              <span className="text-xs opacity-70">{hectaresInput} ha</span>
            </div>
            <p className="text-2xl font-bold">
              R$ {recommendation.custoTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              R$ {recommendation.custoPorHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ha •{' '}
              {PRODUCTIVITY_LEVELS[faixaProdutiva].label}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className={cn("text-base font-bold", (liveVPercent || 0) >= 60 ? "text-success" : "text-warning")}>
                {liveVPercent?.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">V%</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-base font-bold text-foreground">{hectaresInput}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">ha</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-base font-bold text-foreground">
                {insumosDB.filter(i => i.culturas.length === 0 || i.culturas.some(c => c.toLowerCase().includes('milho'))).length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">insumos</p>
            </div>
          </div>

          {/* Calagem */}
          <ResultSection
            title="Calagem"
            icon={<FlaskConical className="w-4 h-4" />}
            colorClass={recommendation.calagem.necessaria ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}
            badge={recommendation.calagem.insumoSelecionado ? "✓ cadastrado" : undefined}
          >
            {recommendation.calagem.necessaria && alternativasPorCategoria.calagem.length > 0 && (
              <ProductSelector
                category="calagem" label="Corretivo"
                alternatives={alternativasPorCategoria.calagem}
                selectedIds={selectedByCategory.calagem}
                onToggle={handleToggleProduct}
              />
            )}
            {recommendation.calagem.necessaria ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Produto</p>
                    <p className="font-medium">{recommendation.calagem.produto}</p>
                    <p className="text-xs text-muted-foreground">PRNT: {recommendation.calagem.prnt}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Necessidade</p>
                    <p className="font-medium">{recommendation.calagem.ncPorHa.toFixed(2)} t/ha</p>
                    <p className="text-xs text-primary font-semibold">{recommendation.calagem.quantidadeTotal.toFixed(2)} t total</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm">Custo Estimado</span>
                  <span className="font-bold text-primary">R$ {recommendation.calagem.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ) : (
              <p className="text-success text-sm font-medium">✓ Solo com V% adequado. Não é necessária calagem.</p>
            )}
          </ResultSection>

          {/* Adubação de Plantio */}
          <ResultSection
            title="Adubação de Plantio"
            icon={<Leaf className="w-4 h-4" />}
            colorClass="bg-success/10 text-success"
            badge={recommendation.adubacaoPlantio.insumosSelecionados.length > 0 ? "✓ cadastrado" : undefined}
          >
            {alternativasPorCategoria.plantio.length > 0 && (
              <ProductSelector
                category="plantio" label="Adubo de Plantio"
                alternatives={alternativasPorCategoria.plantio}
                selectedIds={selectedByCategory.plantio}
                onToggle={handleToggleProduct}
              />
            )}
            {recommendation.adubacaoPlantio.insumosSelecionados.length > 0 ? (
              recommendation.adubacaoPlantio.insumosSelecionados.map((ins, i) => <InsumoRow key={i} insumo={ins} />)
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Produto (ref.)</p>
                    <p className="font-medium">NPK {recommendation.adubacaoPlantio.formulaSugerida}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Qtd./ha</p>
                    <p className="font-medium">{recommendation.adubacaoPlantio.quantidadePorHa.toFixed(0)} kg/ha</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm">Custo Estimado</span>
                  <span className="font-bold text-primary">R$ {recommendation.adubacaoPlantio.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg">
              P₂O₅: {recommendation.adubacaoPlantio.p2o5Necessario.toFixed(0)} kg/ha •
              K₂O: {recommendation.adubacaoPlantio.k2oNecessario.toFixed(0)} kg/ha •
              N: {recommendation.adubacaoPlantio.nNecessario.toFixed(0)} kg/ha
            </div>
          </ResultSection>

          {/* Cobertura */}
          <ResultSection
            title="Cobertura (Nitrogênio)"
            icon={<Droplets className="w-4 h-4" />}
            colorClass="bg-primary/10 text-primary"
            badge={recommendation.cobertura.insumosSelecionados.length > 0 ? "✓ cadastrado" : undefined}
          >
            {alternativasPorCategoria.cobertura.length > 0 && (
              <ProductSelector
                category="cobertura" label="Adubo de Cobertura"
                alternatives={alternativasPorCategoria.cobertura}
                selectedIds={selectedByCategory.cobertura}
                onToggle={handleToggleProduct}
              />
            )}
            {recommendation.cobertura.insumosSelecionados.length > 0 ? (
              recommendation.cobertura.insumosSelecionados.map((ins, i) => <InsumoRow key={i} insumo={ins} />)
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Produto (ref.)</p>
                    <p className="font-medium">Ureia (45% N)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Qtd./ha</p>
                    <p className="font-medium">{recommendation.cobertura.quantidadePorHa.toFixed(0)} kg/ha</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm">Custo Estimado</span>
                  <span className="font-bold text-primary">R$ {recommendation.cobertura.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg">
              N total: {recommendation.cobertura.nNecessario.toFixed(0)} kg/ha •
              N cobertura: {recommendation.cobertura.nCobertura.toFixed(0)} kg/ha
            </div>
            <div className={cn(
              "text-xs p-2 rounded-lg",
              recommendation.cobertura.sFornecido >= recommendation.cobertura.sNecessario * 0.8
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            )}>
              S: {recommendation.cobertura.sFornecido.toFixed(1)}/{recommendation.cobertura.sNecessario.toFixed(1)} kg/ha
              {recommendation.cobertura.sFornecido < recommendation.cobertura.sNecessario * 0.8 &&
                " — adicione fonte de enxofre"}
            </div>
          </ResultSection>

          {/* Correção de Potássio */}
          {recommendation.correcaoPotassio.k2oCorrecao > 0 && (
            <ResultSection
              title="Correção de Potássio"
              icon={<FlaskConical className="w-4 h-4" />}
              colorClass="bg-accent/10 text-accent-foreground"
              badge={recommendation.correcaoPotassio.insumosSelecionados.length > 0 ? "✓ cadastrado" : undefined}
            >
              {alternativasPorCategoria.potassio.length > 0 && (
                <ProductSelector
                  category="potassio" label="Fonte de Potássio"
                  alternatives={alternativasPorCategoria.potassio}
                  selectedIds={selectedByCategory.potassio}
                  onToggle={handleToggleProduct}
                />
              )}
              {recommendation.correcaoPotassio.insumosSelecionados.length > 0 ? (
                recommendation.correcaoPotassio.insumosSelecionados.map((ins, i) => <InsumoRow key={i} insumo={ins} />)
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Produto (ref.)</p>
                      <p className="font-medium">KCl 60%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Qtd./ha</p>
                      <p className="font-medium">{recommendation.correcaoPotassio.quantidadePorHa.toFixed(0)} kg/ha</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                    <span className="text-sm">Custo Estimado</span>
                    <span className="font-bold text-primary">R$ {recommendation.correcaoPotassio.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </ResultSection>
          )}

          {/* Planejamento de Cobertura */}
          <CoverPlanningTimeline recommendation={recommendation} />

          {/* Micronutrientes */}
          {(recommendation.micronutrientes.insumosSelecionados.length > 0 || alternativasPorCategoria.micro.length > 0) && (
            <ResultSection
              title="Micronutrientes"
              icon={<Beaker className="w-4 h-4" />}
              colorClass="bg-secondary text-foreground"
              badge={recommendation.micronutrientes.insumosSelecionados.length > 0 ? "✓ cadastrado" : undefined}
              defaultOpen={false}
            >
              {alternativasPorCategoria.micro.length > 0 && (
                <ProductSelector
                  category="micro" label="Fonte de Micronutrientes"
                  alternatives={alternativasPorCategoria.micro}
                  selectedIds={selectedByCategory.micro}
                  onToggle={handleToggleProduct}
                />
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'B', f: recommendation.micronutrientes.bFornecido, n: recommendation.micronutrientes.bNecessario },
                  { label: 'Zn', f: recommendation.micronutrientes.znFornecido, n: recommendation.micronutrientes.znNecessario },
                  { label: 'Cu', f: recommendation.micronutrientes.cuFornecido, n: recommendation.micronutrientes.cuNecessario },
                  { label: 'Mn', f: recommendation.micronutrientes.mnFornecido, n: recommendation.micronutrientes.mnNecessario },
                  { label: 'Fe', f: recommendation.micronutrientes.feFornecido, n: recommendation.micronutrientes.feNecessario },
                ].map(({ label, f, n }) => (
                  <div key={label} className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn("text-xs font-semibold", f >= n * 0.8 ? "text-success" : "text-warning")}>
                      {(f * 1000).toFixed(0)}g
                    </p>
                  </div>
                ))}
              </div>
              {recommendation.micronutrientes.insumosSelecionados.map((micro, i) => (
                <InsumoRow key={i} insumo={micro} />
              ))}
            </ResultSection>
          )}

          {/* Semente */}
          {usedSeed && (
            <ResultSection
              title="Semente"
              icon={<Sprout className="w-4 h-4" />}
              colorClass="bg-success/10 text-success"
              defaultOpen={false}
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Variedade</p>
                  <p className="font-medium">{usedSeed.name}</p>
                  <p className="text-xs text-muted-foreground">{usedSeed.company}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preço/Saco</p>
                  <p className="font-medium">R$ {usedSeed.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                <span className="text-sm">Custo Estimado</span>
                <span className="font-bold text-primary">R$ {((parseFloat(hectaresInput) || 1) * usedSeed.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </ResultSection>
          )}

          {/* Observações Técnicas */}
          {recommendation.observacoes.length > 0 && (
            <ResultSection
              title="Observações Técnicas"
              icon={<FileText className="w-4 h-4" />}
              colorClass="bg-secondary/50 text-foreground"
              defaultOpen={false}
            >
              <ul className="space-y-1.5">
                {recommendation.observacoes.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </ResultSection>
          )}

          {/* Resumo Financeiro */}
          <ResultSection
            title="Resumo do Investimento"
            icon={<DollarSign className="w-4 h-4" />}
            colorClass="bg-primary/5 text-foreground"
          >
            <div className="space-y-0.5">
              {[
                { label: 'Calagem', value: recommendation.calagem.custoEstimado },
                { label: 'Adubação de Plantio', value: recommendation.adubacaoPlantio.custoEstimado },
                { label: 'Cobertura (N + S)', value: recommendation.cobertura.custoEstimado },
                ...(recommendation.correcaoPotassio.k2oCorrecao > 0 ? [{ label: 'Correção de Potássio', value: recommendation.correcaoPotassio.custoEstimado }] : []),
                ...(recommendation.micronutrientes.custoEstimado > 0 ? [{ label: 'Micronutrientes', value: recommendation.micronutrientes.custoEstimado }] : []),
                ...(recommendation.outrosInsumos.length > 0 ? [{ label: 'Outros Insumos', value: recommendation.outrosInsumos.reduce((s, i) => s + i.custoTotal, 0) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </ResultSection>

          {/* Export Actions */}
          <div className="grid grid-cols-3 gap-2 pb-2">
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              {isGeneratingPdf ? '...' : 'PDF'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleShareWhatsApp}>
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* ─── Fixed Bottom CTA ────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 z-40 md:hidden">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full h-12 text-base font-semibold shadow-lg"
          size="lg"
        >
          {isGenerating ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Gerando...</>
          ) : (
            <><Wand2 className="w-5 h-5 mr-2" /> {recommendation ? 'Recalcular' : 'Gerar Recomendação'}</>
          )}
        </Button>
      </div>

      {/* Desktop generate button (shown only on md+) */}
      <div className="hidden md:block">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          size="lg"
          className="w-full sm:w-auto"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
          ) : (
            <><Wand2 className="w-4 h-4 mr-2" /> Gerar Recomendação Completa</>
          )}
        </Button>
      </div>
    </div>
  );
}
