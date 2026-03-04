import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BioCompatibilityTable, { COMPATIBILITY_DATA } from '@/components/bio/BioCompatibilityTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Bug,
  Droplets,
  Sun,
  Thermometer,
  Leaf,
  SprayCan,
  Waves,
  Shovel,
  ShieldAlert,
  CheckCircle2,
  FlaskConical,
  Beaker,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Check,
  FileDown,
} from 'lucide-react';
import { BANCO_DEFENSIVOS, PRODUTOS_COMERCIAIS, type ProdutoComercial } from '@/data/coffeePestDatabase';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { LOGO_URL } from '@/lib/constants';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';

// ─── Biological Agent Catalog ────────────────────────────────
interface BiologicalAgent {
  id: string;
  name: string;
  organism: string;
  type: string;
  targets: string[];
  dosePerHa: number;
  unit: string;
  methodMultipliers: Record<string, { factor: number; note: string }>;
  precoEstimado: number;
  obs: string;
}

const BIO_AGENTS: BiologicalAgent[] = [
  {
    id: 'beauveria-broca',
    name: 'Beauveria bassiana (Bovemax)',
    organism: 'Beauveria bassiana',
    type: 'Fungo entomopatogênico',
    targets: ['broca', 'bicho-mineiro', 'cochonilha'],
    dosePerHa: 2.0,
    unit: 'kg/ha',
    methodMultipliers: {
      foliar: { factor: 1.0, note: 'Aplicar final de tarde (após 16h)' },
      irrigacao: { factor: 1.5, note: 'Diluir em 200 L/ha via fertirrigação' },
      drench: { factor: 1.2, note: 'Aplicar 150 mL de calda por planta' },
    },
    precoEstimado: 85,
    obs: 'Conídios viáveis >1×10⁹ UFC/g. Armazenar refrigerado.',
  },
  {
    id: 'metarhizium-broca',
    name: 'Metarhizium anisopliae (Metarmax)',
    organism: 'Metarhizium anisopliae',
    type: 'Fungo entomopatogênico',
    targets: ['broca', 'cigarras', 'cochonilha'],
    dosePerHa: 2.0,
    unit: 'kg/ha',
    methodMultipliers: {
      foliar: { factor: 1.0, note: 'Aplicar em condições de alta umidade' },
      irrigacao: { factor: 1.5, note: 'Via gotejamento: 200 L/ha' },
      drench: { factor: 1.3, note: 'Aplicar 200 mL de calda por planta' },
    },
    precoEstimado: 78,
    obs: 'Excelente para pragas de solo. Sinérgico com Beauveria.',
  },
  {
    id: 'bt-bicho',
    name: 'Bacillus thuringiensis (Dipel)',
    organism: 'Bacillus thuringiensis var. kurstaki',
    type: 'Bactéria entomopatogênica',
    targets: ['bicho-mineiro', 'broca'],
    dosePerHa: 0.5,
    unit: 'L/ha',
    methodMultipliers: {
      foliar: { factor: 1.0, note: 'Volume de calda: 300–400 L/ha' },
      irrigacao: { factor: 2.0, note: 'Eficácia reduzida via solo — preferir foliar' },
      drench: { factor: 1.5, note: 'Pouco recomendado para Bt' },
    },
    precoEstimado: 65,
    obs: 'Atua por ingestão. Ideal para lagartas e larvas.',
  },
  {
    id: 'trichoderma-ferrugem',
    name: 'Trichoderma harzianum (Tricomax)',
    organism: 'Trichoderma harzianum',
    type: 'Fungo antagonista',
    targets: ['ferrugem', 'nematoides'],
    dosePerHa: 1.5,
    unit: 'kg/ha',
    methodMultipliers: {
      foliar: { factor: 1.0, note: 'Para doenças foliares — 300 L/ha' },
      irrigacao: { factor: 1.2, note: 'Via fertirrigação com matéria orgânica líquida' },
      drench: { factor: 1.0, note: 'Para nematoides — aplicar na projeção da copa' },
    },
    precoEstimado: 92,
    obs: 'Coloniza rizosfera e compete com patógenos. Usar com matéria orgânica.',
  },
  {
    id: 'paecilomyces-nematoides',
    name: 'Purpureocillium lilacinum (Nemat)',
    organism: 'Purpureocillium lilacinum',
    type: 'Fungo nematicida biológico',
    targets: ['nematoides'],
    dosePerHa: 2.0,
    unit: 'kg/ha',
    methodMultipliers: {
      foliar: { factor: 0, note: 'Não aplicável — uso exclusivo via solo' },
      irrigacao: { factor: 1.0, note: 'Via gotejamento: 200 L/ha' },
      drench: { factor: 1.0, note: 'Aplicar na projeção da copa, 200 mL/planta' },
    },
    precoEstimado: 110,
    obs: 'Parasita ovos e fêmeas de Meloidogyne. Aplicar preventivamente.',
  },
];

const TARGETS_ARABICA = [
  { value: 'bicho-mineiro', label: 'Bicho-mineiro' },
  { value: 'broca', label: 'Broca-do-café' },
  { value: 'ferrugem', label: 'Ferrugem' },
];

const TARGETS_CONILON = [
  { value: 'nematoides', label: 'Nematoides' },
  { value: 'cochonilha', label: 'Cochonilha-da-roseta' },
  { value: 'broca', label: 'Broca-do-café' },
];

type ApplicationMethod = 'foliar' | 'irrigacao' | 'drench' | null;

const METHOD_SPRAY_VOLUME: Record<string, number> = {
  foliar: 400,
  irrigacao: 200,
  drench: 150,
};

const STEP_CONFIG = [
  { id: 'target', label: 'Alvo', icon: Bug },
  { id: 'method', label: 'Método', icon: SprayCan },
  { id: 'recipe', label: 'Receita', icon: FlaskConical },
];

export default function SoloBio() {
  const location = useLocation();
  const navigate = useNavigate();
  const { prefixRoute } = useRoutePrefix();
  const { profile } = useUserProfile();
  const { role } = useUserRole();
  const isConsultor = role === 'consultor';
  const navState = location.state as { coffeeType?: string; talhaoId?: string; hectares?: number; talhaoName?: string } | null;
  const isConilon = navState?.coffeeType === 'conilon';
  const hectares = navState?.hectares || 1;

  const [step, setStep] = useState(0);
  const [target, setTarget] = useState('');
  const [method, setMethod] = useState<ApplicationMethod>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showCompatibility, setShowCompatibility] = useState(false);
  const [savingOS, setSavingOS] = useState(false);
  const talhaoId = navState?.talhaoId;

  // Fetch talhão details for PDF header
  const [talhaoData, setTalhaoData] = useState<{ name: string; variety: string; plant_spacing_cm: number; row_spacing_cm: number; total_plants: number; planting_year: number; irrigation_system: string; irrigated: boolean } | null>(null);
  useEffect(() => {
    if (!talhaoId) return;
    supabase.from('talhoes').select('name, variety, plant_spacing_cm, row_spacing_cm, total_plants, planting_year, irrigation_system, irrigated').eq('id', talhaoId).single().then(({ data }) => {
      if (data) setTalhaoData(data as any);
    });
  }, [talhaoId]);

  const targets = isConilon ? TARGETS_CONILON : TARGETS_ARABICA;
  const cultureLabel = isConilon ? 'Conilon' : 'Arábica';
  const coffeeType = isConilon ? 'conilon' : 'arabica';

  // Simulated climate data
  const humidity = 70;
  const uvIndex = 'Alto';
  const temperature = 25;
  const humidityOk = humidity >= 65;
  const uvOk = uvIndex !== 'Alto';
  const tempOk = temperature >= 18 && temperature <= 32;
  const showUvAlert = !uvOk && method !== 'irrigacao' && method !== 'drench';

  // ─── Recommendation Engine ─────────────────────────────────
  const recommendedBio = useMemo(() => {
    if (!target) return null;
    const agents = BIO_AGENTS.filter(a => a.targets.includes(target));
    return agents.length > 0 ? agents[0] : null;
  }, [target]);

  const alternativeBios = useMemo(() => {
    if (!target) return [];
    return BIO_AGENTS.filter(a => a.targets.includes(target)).slice(1);
  }, [target]);

  const compatibleChemicals = useMemo((): (ProdutoComercial & { compatibility: 'compativel' | 'condicional' })[] => {
    if (!target || !recommendedBio) return [];
    const chemicals = PRODUTOS_COMERCIAIS.filter(
      p => p.alvos.includes(target) && p.culturas.includes(coffeeType as 'conilon' | 'arabica')
    );
    const bioOrganism = recommendedBio.organism.toLowerCase();
    const incompatibleGroups = new Set(['cobre', 'oxicloreto', 'mancozeb', 'clorotalonil', 'ditiocarbamato']);

    return chemicals
      .map(chem => {
        const activeLC = chem.principio_ativo.toLowerCase();
        const isIncompatible = [...incompatibleGroups].some(g => activeLC.includes(g));
        if (isIncompatible) return null;
        const isFungiBio = bioOrganism.includes('beauveria') || bioOrganism.includes('metarhizium') || bioOrganism.includes('trichoderma') || bioOrganism.includes('purpureocillium');
        const isTriazol = activeLC.includes('tebuconazol') || activeLC.includes('epoxiconazol');
        if (isFungiBio && isTriazol) return null;
        const isNeonicotinoid = activeLC.includes('tiametoxam') || activeLC.includes('imidacloprido');
        const compatibility = isNeonicotinoid ? 'condicional' as const : 'compativel' as const;
        return { ...chem, compatibility };
      })
      .filter(Boolean) as (ProdutoComercial & { compatibility: 'compativel' | 'condicional' })[];
  }, [target, recommendedBio, coffeeType]);

  const pestInfo = useMemo(() => {
    if (!target) return null;
    return BANCO_DEFENSIVOS.find(d => d.id === target) || null;
  }, [target]);

  const getBioDoseForMethod = (agent: BiologicalAgent, m: ApplicationMethod) => {
    if (!m) return { dose: agent.dosePerHa, total: agent.dosePerHa * hectares, note: '' };
    const mult = agent.methodMultipliers[m];
    if (!mult || mult.factor === 0) return null;
    const dose = agent.dosePerHa * mult.factor;
    return { dose, total: dose * hectares, note: mult.note };
  };

  const getChemDoseForMethod = (chem: ProdutoComercial, m: ApplicationMethod) => {
    const sprayVol = m ? METHOD_SPRAY_VOLUME[m] : 400;
    const concMlPerL = (chem.doseNumerico * 1000) / sprayVol;
    return {
      dosePerHa: chem.doseNumerico,
      totalArea: chem.doseNumerico * hectares,
      concPerL: concMlPerL,
      costPerHa: (chem.doseNumerico / chem.tamanhoEmbalagem) * chem.precoEstimado,
    };
  };

  const canAdvance = step === 0 ? !!target : step === 1 ? !!method : true;

  const handleGeneratePdf = useCallback(async () => {
    if (!recommendedBio || !method) return;
    try {
      toast.info('Gerando Receita Biológica A4...');
      await new Promise(r => setTimeout(r, 100));

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PAGE_W = doc.internal.pageSize.getWidth();
      const PAGE_H = doc.internal.pageSize.getHeight();
      const MARGIN = 15;
      const CONTENT_W = PAGE_W - MARGIN * 2;
      const FOOTER_H = 10;
      const SAFE_BOTTOM = PAGE_H - MARGIN - FOOTER_H - 5;
      let y = MARGIN;
      let pageNum = 1;
      const dateStr = new Date().toLocaleDateString('pt-BR');

      const methodLabel = method === 'foliar' ? 'Pulverização Foliar' : method === 'irrigacao' ? 'Via Irrigação' : 'Via Solo (Drench)';
      const targetLabel = targets.find(t => t.value === target)?.label || target;
      const bioDose = getBioDoseForMethod(recommendedBio, method);

      // ─── Helpers ──────────────────────────────
      const setFont = (style: 'normal' | 'bold' | 'italic' = 'normal', size = 9) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
      };

      const drawFooter = (pNum: number, total?: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, PAGE_H - MARGIN - FOOTER_H + 2, PAGE_W - MARGIN, PAGE_H - MARGIN - FOOTER_H + 2);
        setFont('normal', 6.5);
        doc.setTextColor(160, 160, 160);
        doc.text('Este relatório foi gerado automaticamente pelo sistema Solo V3 — Gestão Agronômica Inteligente.', MARGIN, PAGE_H - MARGIN - 5);
        if (isConsultor && profile?.crea_art) {
          setFont('bold', 6.5);
          doc.setTextColor(100, 100, 100);
          doc.text(`Responsável Técnico: ${profile.full_name || 'Consultor'} — CREA/CFTA: ${profile.crea_art}`, MARGIN, PAGE_H - MARGIN - 2);
        } else {
          doc.text('Documento sem valor de laudo técnico. Uso exclusivo para acompanhamento interno.', MARGIN, PAGE_H - MARGIN - 2);
        }
        const pageLabel = total ? `Página ${pNum}/${total}` : `Página ${pNum}`;
        doc.text(pageLabel, PAGE_W - MARGIN, PAGE_H - MARGIN - 2, { align: 'right' });
      };

      const drawHeaderBar = () => {
        doc.setFillColor(20, 83, 45);
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
        setFont('bold', 9);
        doc.setTextColor(255, 255, 255);
        doc.text(`RECEITA BIOLÓGICA — CAFÉ ${cultureLabel.toUpperCase()}`, MARGIN + 3, y + 5.5);
        y += 12;
      };

      const HEADER_BAR_H = 10;
      const checkPage = (needed: number) => {
        if (y + needed > SAFE_BOTTOM) {
          doc.addPage();
          pageNum++;
          y = MARGIN;
          drawHeaderBar();
        }
      };

      // ─── Logo ─────────────────────────────────
      let logoLoaded = false;
      const logoImg = new Image();
      try {
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          logoImg.onload = () => { logoLoaded = true; resolve(); };
          logoImg.onerror = () => resolve();
          logoImg.src = LOGO_URL;
        });
      } catch { /* skip */ }

      // ─── Header (padronizado) ─────────────────
      if (logoLoaded && logoImg.naturalWidth > 0) {
        const logoH = 12;
        const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
        doc.addImage(logoImg, 'PNG', MARGIN, y, logoW, logoH);
      }
      setFont('bold', 13);
      doc.setTextColor(30, 30, 30);
      doc.text('Receita Biológica', MARGIN + 38, y + 5);
      setFont('normal', 9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Café ${cultureLabel} • ${hectares.toFixed(3)} ha`, MARGIN + 38, y + 10);
      // Right side: date
      setFont('normal', 8);
      doc.text(`Emitido em ${dateStr}`, PAGE_W - MARGIN, y + 5, { align: 'right' });
      doc.text('Solo V3 — Gestão Agronômica', PAGE_W - MARGIN, y + 9, { align: 'right' });
      y += 14;
      doc.setDrawColor(200, 200, 200);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 6;

      // ─── Meta Info: Talhão + Operação ────────
      if (talhaoData) {
        doc.setFillColor(248, 250, 248);
        doc.setDrawColor(200, 220, 200);
        doc.roundedRect(MARGIN, y - 2, CONTENT_W, 20, 2, 2, 'FD');
        setFont('bold', 8.5); doc.setTextColor(20, 83, 45);
        doc.text('DADOS DO TALHÃO', MARGIN + 3, y + 3);
        setFont('normal', 8); doc.setTextColor(60, 60, 60);
        const col1X = MARGIN + 4;
        const col2X = MARGIN + CONTENT_W / 3;
        const col3X = MARGIN + (CONTENT_W * 2) / 3;
        doc.text(`Talhão: ${talhaoData.name}`, col1X, y + 8);
        doc.text(`Variedade: ${talhaoData.variety}`, col2X, y + 8);
        doc.text(`Área: ${hectares.toFixed(3)} ha`, col3X, y + 8);
        doc.text(`Espaçamento: ${(talhaoData.row_spacing_cm / 100).toFixed(1)} × ${(talhaoData.plant_spacing_cm / 100).toFixed(1)} m`, col1X, y + 13);
        doc.text(`Plantas: ${talhaoData.total_plants.toLocaleString('pt-BR')}`, col2X, y + 13);
        doc.text(`Irrigação: ${talhaoData.irrigated ? talhaoData.irrigation_system : 'Sequeiro'}`, col3X, y + 13);
        y += 23;
      }

      // ─── Operação ────────────────────────────
      setFont('normal', 8.5);
      doc.setTextColor(50, 50, 50);
      const metaLeft = [
        [`Alvo:`, targetLabel],
        [`Método:`, `${methodLabel} — ${METHOD_SPRAY_VOLUME[method]} L/ha`],
      ];
      const metaRight = [
        [`Espécie:`, `Café ${cultureLabel}`],
        [`Data:`, dateStr],
      ];
      metaLeft.forEach((pair, i) => {
        setFont('bold', 8.5); doc.text(pair[0], MARGIN, y + 3);
        setFont('normal', 8.5); doc.text(pair[1], MARGIN + 18, y + 3);
        setFont('bold', 8.5); doc.text(metaRight[i][0], PAGE_W / 2, y + 3);
        setFont('normal', 8.5); doc.text(metaRight[i][1], PAGE_W / 2 + 18, y + 3);
        y += 5;
      });
      y += 4;

      // ── Section: Biological Agent
      checkPage(30);
      // ── Helper: draw table header row
      const drawTableHeader = (headers: string[], colWidths: number[]) => {
        doc.setFillColor(245, 245, 245);
        doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.line(MARGIN, y + 3, PAGE_W - MARGIN, y + 3);
        setFont('bold', 7.5);
        doc.setTextColor(80, 80, 80);
        let cx = MARGIN;
        headers.forEach((h, i) => { doc.text(h, cx + 2, y); cx += colWidths[i]; });
        y += 6;
      };

      // ── Helper: draw table row with optional zebra
      const drawTableRow = (vals: string[], colWidths: number[], rowIdx: number, statusCol?: number, statusType?: string) => {
        if (rowIdx % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(MARGIN, y - 3.5, CONTENT_W, 5.5, 'F');
        }
        setFont('normal', 7.5);
        doc.setTextColor(50, 50, 50);
        let cx = MARGIN;
        vals.forEach((v, i) => {
          if (statusCol !== undefined && i === statusCol && statusType) {
            if (statusType === 'incompativel') doc.setTextColor(180, 40, 40);
            else if (statusType === 'condicional') doc.setTextColor(180, 130, 0);
            else doc.setTextColor(30, 120, 60);
            setFont('bold', 7.5);
            doc.text(v, cx + 2, y);
            doc.setTextColor(50, 50, 50);
            setFont('normal', 7.5);
          } else {
            const maxW = colWidths[i] - 3;
            const txt = doc.getTextWidth(v) > maxW ? doc.splitTextToSize(v, maxW)[0] : v;
            doc.text(txt, cx + 2, y);
          }
          cx += colWidths[i];
        });
        y += 5;
      };

      // ── Section: Biological Agent
      checkPage(30);
      setFont('bold', 10);
      doc.setTextColor(20, 83, 45);
      doc.text('1. Agente Biológico', MARGIN, y);
      y += 7;

      const bioHeaders = ['Produto', 'Organismo', 'Dose/ha', 'Total', 'Custo/ha'];
      const bioColW = [55, 50, 25, 25, CONTENT_W - 155];
      drawTableHeader(bioHeaders, bioColW);

      if (bioDose) {
        drawTableRow([
          recommendedBio.name,
          recommendedBio.organism,
          `${bioDose.dose.toFixed(1)} ${recommendedBio.unit}`,
          `${bioDose.total.toFixed(1)} ${recommendedBio.unit.split('/')[0]}`,
          `R$ ${(recommendedBio.precoEstimado * bioDose.dose).toFixed(0)}`,
        ], bioColW, 0);
      }
      if (bioDose?.note) {
        setFont('italic', 7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Obs: ${bioDose.note}`, MARGIN + 2, y + 1);
        y += 5;
      }
      y += 6;

      // ── Section: Compatible Chemicals
      if (compatibleChemicals.length > 0) {
        checkPage(25);
        setFont('bold', 10);
        doc.setTextColor(20, 83, 45);
        doc.text('2. Químicos Compatíveis', MARGIN, y);
        y += 7;

        const chemHeaders = ['Produto', 'Princípio Ativo', 'Dose/ha', 'Conc. (mL/L)', 'Custo/ha', 'Status'];
        const chemColW = [32, 38, 24, 26, 24, CONTENT_W - 144];
        drawTableHeader(chemHeaders, chemColW);

        compatibleChemicals.forEach((chem, idx) => {
          checkPage(6);
          const doses = getChemDoseForMethod(chem, method);
          drawTableRow([
            chem.nome,
            chem.principio_ativo,
            `${doses.dosePerHa} ${chem.unidadeDose}`,
            doses.concPerL.toFixed(1),
            `R$ ${doses.costPerHa.toFixed(0)}`,
            chem.compatibility === 'compativel' ? '✓ Compatível' : '⚠ Condicional',
          ], chemColW, idx, 5, chem.compatibility);
        });
        y += 6;
      }

      // ── Section: Compatibility Table
      let sectionNum = compatibleChemicals.length > 0 ? 3 : 2;
      const bioCompat = COMPATIBILITY_DATA.filter(
        e => e.biologico.toLowerCase().includes(recommendedBio.organism.split(' ')[0].toLowerCase())
      );
      if (bioCompat.length > 0) {
        checkPage(25);
        setFont('bold', 10);
        doc.setTextColor(20, 83, 45);
        doc.text(`${sectionNum}. Compatibilidade Biológico × Químico`, MARGIN, y);
        y += 7;

        const compHeaders = ['Químico', 'Grupo', 'Tipo', 'Status', 'Observação'];
        const compColW = [34, 30, 22, 28, CONTENT_W - 114];
        drawTableHeader(compHeaders, compColW);

        bioCompat.forEach((entry, idx) => {
          const statusLabel = entry.status === 'compativel' ? '✓ Compatível' : entry.status === 'incompativel' ? '✗ Incompatível' : '⚠ Condicional';

          // Pre-calculate observation lines for dynamic row height
          setFont('normal', 6.5);
          const obsMaxW = compColW[4] - 5;
          const obsLines: string[] = doc.splitTextToSize(entry.observacao, obsMaxW);
          const lineCount = Math.min(obsLines.length, 4);
          const rowH = Math.max(7, lineCount * 3.5 + 3);

          checkPage(rowH + 2);

          // Row background (zebra)
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 248);
            doc.rect(MARGIN, y - 4, CONTENT_W, rowH, 'F');
          }

          // Vertical grid lines
          doc.setDrawColor(230, 230, 230);
          let gx = MARGIN;
          compColW.forEach((w) => {
            gx += w;
            if (gx < PAGE_W - MARGIN) doc.line(gx, y - 4, gx, y - 4 + rowH);
          });

          const rowBaseY = y - 1;
          let cx = MARGIN;

          // Fixed columns — wrap if needed
          setFont('normal', 7);
          doc.setTextColor(50, 50, 50);
          const fixedVals = [entry.quimico, entry.grupoQuimico, entry.tipoProduto];
          fixedVals.forEach((v, i) => {
            const maxW = compColW[i] - 4;
            const cellLines: string[] = doc.splitTextToSize(v, maxW);
            cellLines.slice(0, 2).forEach((line: string, li: number) => {
              doc.text(line, cx + 2, rowBaseY + li * 3.5);
            });
            cx += compColW[i];
          });

          // Status with color — smaller font to fit column
          if (entry.status === 'incompativel') doc.setTextColor(180, 40, 40);
          else if (entry.status === 'condicional') doc.setTextColor(180, 130, 0);
          else doc.setTextColor(30, 120, 60);
          setFont('bold', 6);
          const statusLines: string[] = doc.splitTextToSize(statusLabel, compColW[3] - 4);
          statusLines.slice(0, 2).forEach((line: string, li: number) => {
            doc.text(line, cx + 2, rowBaseY + li * 3.2);
          });
          cx += compColW[3];

          // Observation — fully wrapped
          doc.setTextColor(80, 80, 80);
          setFont('normal', 6.5);
          obsLines.slice(0, 4).forEach((line: string, li: number) => {
            doc.text(line, cx + 2, rowBaseY + li * 3.5);
          });

          // Bottom border
          doc.setDrawColor(235, 235, 235);
          doc.line(MARGIN, y - 4 + rowH, PAGE_W - MARGIN, y - 4 + rowH);

          doc.setTextColor(50, 50, 50);
          y += rowH;
        });
        sectionNum++;
        y += 6;
      }

      // ── Section: Orientações Operacionais
      checkPage(45);
      setFont('bold', 10);
      doc.setTextColor(20, 83, 45);
      doc.text(`${sectionNum}. Orientações Operacionais`, MARGIN, y);
      y += 7;

      // Quando aplicar
      doc.setFillColor(248, 250, 248);
      doc.setDrawColor(200, 220, 200);
      const quandoLines: string[] = [];
      if (method === 'foliar') {
        quandoLines.push('• Aplicar no final da tarde (após 16h) ou início da manhã, evitando horários de alta incidência UV.');
        quandoLines.push('• Preferir dias nublados ou com umidade relativa acima de 65%.');
        quandoLines.push('• Evitar aplicação com ventos acima de 10 km/h para reduzir deriva.');
      } else if (method === 'irrigacao') {
        quandoLines.push('• Aplicar via fertirrigação durante o ciclo normal de irrigação.');
        quandoLines.push('• Solo deve estar com umidade adequada — evitar aplicação em solo seco ou encharcado.');
        quandoLines.push('• Preferir horários de menor evapotranspiração (manhã cedo ou final de tarde).');
      } else {
        quandoLines.push('• Aplicar via drench na projeção da copa, preferencialmente após irrigação leve.');
        quandoLines.push('• Solo deve estar úmido para favorecer a colonização do agente biológico.');
        quandoLines.push('• Evitar aplicação em períodos de estiagem prolongada.');
      }
      quandoLines.push(`• Intervalo de segurança: aplicar no mínimo 14 dias antes da colheita.`);

      const comoLines: string[] = [];
      if (method === 'foliar') {
        comoLines.push(`• Volume de calda: ${METHOD_SPRAY_VOLUME[method]} L/ha — bicos tipo cone vazio para boa cobertura.`);
        comoLines.push('• Agitar a calda constantemente durante a aplicação.');
        comoLines.push('• Não misturar com fungicidas cúpricos ou produtos à base de cloro.');
      } else if (method === 'irrigacao') {
        comoLines.push(`• Diluir em ${METHOD_SPRAY_VOLUME[method]} L/ha via sistema de gotejamento ou microaspersão.`);
        comoLines.push('• Injetar o produto no final do ciclo de irrigação para maior contato com o solo.');
        comoLines.push('• Filtros do sistema devem ser verificados após a aplicação.');
      } else {
        comoLines.push(`• Aplicar ${METHOD_SPRAY_VOLUME[method]} mL de calda por planta, direcionando à base do caule.`);
        comoLines.push('• Utilizar equipamento costal ou mangueira acoplada ao tanque.');
        comoLines.push('• Garantir que a calda atinja a zona radicular (0–20 cm de profundidade).');
      }
      comoLines.push('• Armazenar os produtos biológicos em local fresco e ao abrigo da luz solar direta.');

      const allGuideLines = quandoLines.length + comoLines.length;
      const guideBoxH = 12 + allGuideLines * 4.2;
      checkPage(guideBoxH + 4);
      doc.roundedRect(MARGIN, y - 2, CONTENT_W, guideBoxH, 2, 2, 'FD');

      setFont('bold', 8.5);
      doc.setTextColor(20, 83, 45);
      doc.text('QUANDO APLICAR', MARGIN + 4, y + 3);
      y += 6;
      setFont('normal', 7.5);
      doc.setTextColor(60, 60, 60);
      quandoLines.forEach(line => {
        doc.text(line, MARGIN + 6, y);
        y += 4.2;
      });

      y += 2;
      setFont('bold', 8.5);
      doc.setTextColor(20, 83, 45);
      doc.text('COMO APLICAR', MARGIN + 4, y);
      y += 4;
      setFont('normal', 7.5);
      doc.setTextColor(60, 60, 60);
      comoLines.forEach(line => {
        doc.text(line, MARGIN + 6, y);
        y += 4.2;
      });
      y += 6;
      sectionNum++;

      // ── Section: Total Cost
      checkPage(30);
      setFont('bold', 10);
      doc.setTextColor(20, 83, 45);
      doc.text(`${sectionNum}. Custo Total Estimado`, MARGIN, y);
      y += 7;

      if (bioDose) {
        const bioCost = recommendedBio.precoEstimado * bioDose.dose * hectares;
        const chemCost = compatibleChemicals.reduce((sum, c) => {
          const d = getChemDoseForMethod(c, method);
          return sum + d.costPerHa * hectares;
        }, 0);
        const totalCost = bioCost + chemCost;

        // Cost box
        doc.setFillColor(248, 250, 248);
        doc.setDrawColor(200, 220, 200);
        doc.roundedRect(MARGIN, y - 3, CONTENT_W, chemCost > 0 ? 22 : 17, 2, 2, 'FD');
        setFont('normal', 8.5);
        doc.setTextColor(60, 60, 60);
        doc.text(`Biológico: R$ ${bioCost.toFixed(0)}`, MARGIN + 4, y + 2); y += 5;
        if (chemCost > 0) { doc.text(`Químicos compatíveis: R$ ${chemCost.toFixed(0)}`, MARGIN + 4, y + 2); y += 5; }
        setFont('bold', 10);
        doc.setTextColor(20, 83, 45);
        doc.text(`Total: R$ ${totalCost.toFixed(0)} (${hectares.toFixed(3)} ha) — R$ ${(totalCost / hectares).toFixed(0)}/ha`, MARGIN + 4, y + 2);
        y += 12;
      }

      // ─── Disclaimer ───────────────────────────
      y += 2;
      setFont('italic', 6.5);
      doc.setTextColor(160, 160, 160);
      doc.text('As recomendações técnicas devem ser validadas por um Engenheiro Agrônomo com registro no CREA.', MARGIN, y);
      y += 4;

      // ─── Signature Block ──────────────────────
      checkPage(35);
      doc.setDrawColor(200, 200, 200);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 8;

      const colW = CONTENT_W / 2 - 4;
      const sigLineW = 55;

      // Left: Responsável Técnico
      doc.line(MARGIN + (colW - sigLineW) / 2, y + 10, MARGIN + (colW + sigLineW) / 2, y + 10);
      setFont('bold', 8);
      doc.setTextColor(40, 40, 40);
      doc.text('Responsável Técnico', MARGIN + colW / 2, y + 14, { align: 'center' });
      if (isConsultor && profile?.full_name) {
        setFont('normal', 7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Eng. Agr. ${profile.full_name}`, MARGIN + colW / 2, y + 18, { align: 'center' });
        if (profile.crea_art) {
          doc.text(profile.crea_art, MARGIN + colW / 2, y + 21.5, { align: 'center' });
        }
      }

      // Right: Produtor
      const rightX = MARGIN + colW + 8;
      doc.line(rightX + (colW - sigLineW) / 2, y + 10, rightX + (colW + sigLineW) / 2, y + 10);
      setFont('bold', 8);
      doc.setTextColor(40, 40, 40);
      doc.text('Produtor', rightX + colW / 2, y + 14, { align: 'center' });

      // ─── Footer on all pages ──────────────────
      const totalPages = pageNum;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(p, totalPages);
      }

      doc.save(`receita-biologica-${target}-${dateStr.replace(/\//g, '-')}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar PDF');
    }
  }, [recommendedBio, method, target, hectares, compatibleChemicals, cultureLabel, targets, profile, isConsultor, talhaoData]);

  const handleSaveAsOS = useCallback(async () => {
    if (!recommendedBio || !method || !talhaoId) {
      toast.error('Selecione um talhão no fluxo anterior para salvar a OS.');
      return;
    }
    setSavingOS(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Faça login para salvar.'); return; }

      const bioDose = getBioDoseForMethod(recommendedBio, method);
      if (!bioDose) { toast.error('Dose inválida para o método selecionado.'); return; }

      const methodLabel = method === 'foliar' ? 'Pulverização Foliar' : method === 'irrigacao' ? 'Via Irrigação' : 'Via Solo (Drench)';
      const targetLabel = targets.find(t => t.value === target)?.label || target;

      // Create the OS
      const { data: os, error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          user_id: user.id,
          talhao_id: talhaoId,
          tipo_operacao: 'solo' as const,
          volume_calda_hectare: METHOD_SPRAY_VOLUME[method],
          area_aplicacao_ha: hectares,
          notas: `Receita Biológica — ${targetLabel} — ${methodLabel} — ${recommendedBio.name}`,
        })
        .select()
        .single();

      if (osError) throw osError;

      // Insert tank recipe items
      const receitaItems: {
        os_id: string;
        insumo_nome: string;
        dose_hectare: number;
        ordem_mistura: number;
        unidade: string;
        notas: string | null;
      }[] = [];

      // Bio agent first
      receitaItems.push({
        os_id: os.id,
        insumo_nome: recommendedBio.name,
        dose_hectare: bioDose.dose,
        ordem_mistura: 1,
        unidade: recommendedBio.unit,
        notas: `Biológico — ${recommendedBio.organism}`,
      });

      // Compatible chemicals
      compatibleChemicals.forEach((chem, i) => {
        const doses = getChemDoseForMethod(chem, method);
        receitaItems.push({
          os_id: os.id,
          insumo_nome: chem.nome,
          dose_hectare: doses.dosePerHa,
          ordem_mistura: i + 2,
          unidade: chem.unidadeDose,
          notas: `${chem.principio_ativo} — ${chem.compatibility === 'compativel' ? 'Compatível' : 'Condicional'}`,
        });
      });

      const { error: receitaError } = await supabase
        .from('os_receita_tanque')
        .insert(receitaItems);

      if (receitaError) throw receitaError;

      toast.success('Ordem de Serviço salva com sucesso!');
    } catch (err: any) {
      console.error('Save OS error:', err);
      toast.error('Erro ao salvar OS: ' + (err.message || 'tente novamente'));
    } finally {
      setSavingOS(false);
    }
  }, [recommendedBio, method, target, talhaoId, hectares, compatibleChemicals, targets]);

  const handleNext = () => {
    if (canAdvance && step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate(-1);
  };

  if (showCompatibility) {
    return (
      <div className="max-w-3xl mx-auto pb-24 px-4">
        <BioCompatibilityTable onBack={() => setShowCompatibility(false)} defaultBio={recommendedBio?.organism} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* ─── Progress Bar (matches CoffeeProgress pattern) ─── */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-center gap-2">
          {(() => {
            const CurrentIcon = STEP_CONFIG[step].icon;
            return <CurrentIcon className="w-4 h-4 text-primary" />;
          })()}
          <span className="text-xs font-medium text-muted-foreground">
            {STEP_CONFIG[step].label}
          </span>
          <span className="text-xs text-muted-foreground">
            ({step + 1}/{STEP_CONFIG.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          {STEP_CONFIG.map((s, index) => (
            <div key={s.id} className="flex-1">
              <div
                className={cn(
                  'h-1 rounded-full transition-colors duration-200',
                  index <= step ? 'bg-primary' : 'bg-secondary'
                )}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Context chips */}
      <div className="flex items-center gap-2 mb-6 px-1">
        <Badge variant="secondary" className="text-[10px]">
          ☕ Café {cultureLabel}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {hectares} ha
        </Badge>
      </div>

      {/* ═══════ STEP 0: Target Selection ═══════ */}
      {step === 0 && (
        <div
          className="flex flex-col items-center text-center"
          style={{ animation: 'fade-in 0.4s ease-out' }}
        >
          <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mb-6">
            <Bug className="w-8 h-8 text-background" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
            Alvo Principal
          </h1>
          <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
            Selecione a praga ou doença que deseja controlar com agentes biológicos.
          </p>

          <div className="grid gap-3 w-full max-w-md mb-8">
            {targets.map((t) => {
              const active = target === t.value;
              const info = BANCO_DEFENSIVOS.find(d => d.id === t.value);
              return (
                <button
                  key={t.value}
                  onClick={() => { setTarget(t.value); setMethod(null); }}
                  className={cn(
                    'w-full text-left p-5 rounded-2xl border transition-all duration-200',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}>
                      <Bug className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{t.label}</h3>
                        {active && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                      </div>
                      {info && (
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                          {info.obs}
                        </p>
                      )}
                      {info && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] rounded-full",
                            info.severidade === 'alta' ? 'bg-destructive/10 text-destructive' :
                            info.severidade === 'media' ? 'bg-warning/10 text-warning' :
                            'bg-success/10 text-success'
                          )}>
                            Severidade: {info.severidade}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-muted-foreground">
                            {info.epoca}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Auto recommendation preview */}
          {recommendedBio && (
            <div
              className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-left mb-6"
              style={{ animation: 'fade-in 0.3s ease-out' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground">Agente Recomendado</h3>
              </div>

              <div className="flex items-center gap-3 bg-success/5 rounded-xl p-3.5 border border-success/20">
                <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{recommendedBio.name}</p>
                  <p className="text-xs text-muted-foreground">{recommendedBio.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{recommendedBio.dosePerHa} {recommendedBio.unit}</p>
                  <p className="text-[10px] text-muted-foreground">R$ {(recommendedBio.precoEstimado * recommendedBio.dosePerHa).toFixed(0)}/ha</p>
                </div>
              </div>

              {alternativeBios.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Alternativas</p>
                  {alternativeBios.map(alt => (
                    <div key={alt.id} className="flex items-center justify-between rounded-lg bg-secondary p-2.5">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-3.5 h-3.5 text-success" />
                        <span className="text-xs font-medium text-foreground">{alt.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{alt.dosePerHa} {alt.unit} — R$ {(alt.precoEstimado * alt.dosePerHa).toFixed(0)}/ha</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground mt-3 bg-secondary rounded-lg p-2.5 leading-relaxed">
                💡 {recommendedBio.obs}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ STEP 1: Application Method ═══════ */}
      {step === 1 && (
        <div
          className="flex flex-col items-center text-center"
          style={{ animation: 'fade-in 0.4s ease-out' }}
        >
          <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mb-6">
            <SprayCan className="w-8 h-8 text-background" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
            Método de Aplicação
          </h1>
          <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
            Escolha como aplicar o agente biológico na lavoura.
          </p>

          <div className="grid gap-3 w-full max-w-md mb-6">
            {([
              { id: 'foliar' as const, icon: SprayCan, label: 'Pulverização Foliar', desc: 'Tratorizado ou costal — 400 L/ha' },
              { id: 'irrigacao' as const, icon: Waves, label: 'Via Irrigação', desc: 'Fertirrigação — 200 L/ha' },
              { id: 'drench' as const, icon: Shovel, label: 'Via Solo (Drench)', desc: 'Aplicação dirigida — 150 mL/planta' },
            ]).map((opt) => {
              const active = method === opt.id;
              const bioCheck = recommendedBio?.methodMultipliers[opt.id];
              const disabled = bioCheck?.factor === 0;
              return (
                <button
                  key={opt.id}
                  onClick={() => !disabled && setMethod(opt.id)}
                  disabled={disabled}
                  className={cn(
                    'w-full text-left p-5 rounded-2xl border transition-all duration-200',
                    disabled && 'opacity-40 cursor-not-allowed border-border bg-card',
                    !disabled && active && 'border-primary bg-primary/5',
                    !disabled && !active && 'border-border bg-card hover:border-primary/30'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{opt.label}</h3>
                        {active && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      {disabled && <p className="text-[10px] text-destructive mt-1">Não recomendado para este biológico</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dose adjustment preview */}
          {method && recommendedBio && (() => {
            const doseInfo = getBioDoseForMethod(recommendedBio, method);
            if (!doseInfo) return null;
            return (
              <div
                className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-left mb-4"
                style={{ animation: 'fade-in 0.3s ease-out' }}
              >
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-primary" />
                  Dose Ajustada
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Dose/ha', val: doseInfo.dose.toFixed(1), sub: recommendedBio.unit },
                    { label: 'Total', val: doseInfo.total.toFixed(1), sub: recommendedBio.unit.split('/')[0] },
                    { label: 'Calda', val: String(METHOD_SPRAY_VOLUME[method]), sub: 'L/ha' },
                  ].map(d => (
                    <div key={d.label} className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase font-medium">{d.label}</p>
                      <p className="text-base font-bold text-foreground">{d.val}</p>
                      <p className="text-[10px] text-muted-foreground">{d.sub}</p>
                    </div>
                  ))}
                </div>
                {doseInfo.note && (
                  <p className="text-xs text-muted-foreground text-center mt-3 bg-secondary rounded-lg p-2">📌 {doseInfo.note}</p>
                )}
              </div>
            );
          })()}

          {/* Climate Viability */}
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-left mb-4"
            style={{ animation: 'fade-in 0.3s ease-out' }}
          >
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-primary" />
              Viabilidade Climática
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Droplets, label: 'Umidade', val: `${humidity}%`, ok: humidityOk },
                { icon: Sun, label: 'UV', val: uvIndex, ok: uvOk },
                { icon: Thermometer, label: 'Temp.', val: `${temperature}°C`, ok: tempOk },
              ].map((item) => (
                <div key={item.label} className={cn("rounded-xl p-3 text-center border", item.ok ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20")}>
                  <item.icon className={cn("w-4 h-4 mx-auto mb-1", item.ok ? "text-success" : "text-destructive")} />
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className={cn("text-sm font-bold", item.ok ? "text-success" : "text-destructive")}>{item.val}</p>
                </div>
              ))}
            </div>

            {showUvAlert && (
              <div className="flex items-start gap-2.5 bg-destructive/5 border border-destructive/20 rounded-xl p-3 mt-3">
                <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-destructive">UV elevado — Foliar com cautela</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Aplique após 16h ou opte por via solo/irrigação.</p>
                </div>
              </div>
            )}
            {(method === 'irrigacao' || method === 'drench') && !uvOk && (
              <div className="flex items-start gap-2.5 bg-success/5 border border-success/20 rounded-xl p-3 mt-3">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-success">Via solo — UV sem impacto no produto.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ STEP 2: Tank Recipe Summary ═══════ */}
      {step === 2 && recommendedBio && method && (
        <div
          className="flex flex-col items-center text-center"
          style={{ animation: 'fade-in 0.4s ease-out' }}
        >
          <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mb-6">
            <FlaskConical className="w-8 h-8 text-background" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
            Receita do Tanque
          </h1>
          <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
            Resumo da receita biológica com produtos compatíveis.
          </p>

          <div className="w-full max-w-md text-left space-y-4">
            {/* Bio product */}
            {(() => {
              const doseInfo = getBioDoseForMethod(recommendedBio, method);
              if (!doseInfo) return null;
              return (
                <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                        <Leaf className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{recommendedBio.name}</p>
                        <p className="text-xs text-muted-foreground">{doseInfo.dose.toFixed(1)} {recommendedBio.unit}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Biológico</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Total: <strong className="text-foreground">{doseInfo.total.toFixed(1)} {recommendedBio.unit.split('/')[0]}</strong></span>
                    <span>Custo: <strong className="text-success">R$ {(recommendedBio.precoEstimado * doseInfo.dose * hectares).toFixed(0)}</strong></span>
                  </div>
                </div>
              );
            })()}

            {/* Compatible chemicals */}
            {compatibleChemicals.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Químicos Compatíveis</p>
                {compatibleChemicals.map(chem => {
                  const doses = getChemDoseForMethod(chem, method);
                  return (
                    <div key={chem.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{chem.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{chem.principio_ativo}</p>
                        </div>
                        <Badge variant="secondary" className={cn("text-[9px]",
                          chem.compatibility === 'compativel' ? 'text-success' : 'text-warning'
                        )}>
                          {chem.compatibility === 'compativel' ? '✅ Compatível' : '⚠️ Condicional'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: 'Dose/ha', val: `${doses.dosePerHa} ${chem.unidadeDose}` },
                          { label: `Total (${hectares} ha)`, val: `${doses.totalArea.toFixed(2)} ${chem.unidadeDose.split('/')[0]}` },
                          { label: 'Conc. Calda', val: `${doses.concPerL.toFixed(1)} mL/L` },
                          { label: 'Custo/ha', val: `R$ ${doses.costPerHa.toFixed(0)}` },
                        ].map(d => (
                          <div key={d.label} className="bg-secondary rounded-lg p-2 text-center">
                            <p className="text-[9px] text-muted-foreground uppercase">{d.label}</p>
                            <p className="text-xs font-bold text-foreground">{d.val}</p>
                          </div>
                        ))}
                      </div>
                      {chem.compatibility === 'condicional' && (
                        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-warning bg-warning/5 rounded-lg p-2 border border-warning/20">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Usar em doses baixas. Monitorar viabilidade do biológico.
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Total cost */}
            {(() => {
              const bioDose = getBioDoseForMethod(recommendedBio, method);
              if (!bioDose) return null;
              const bioCost = recommendedBio.precoEstimado * bioDose.dose * hectares;
              const chemCost = compatibleChemicals.reduce((sum, c) => {
                const d = getChemDoseForMethod(c, method);
                return sum + d.costPerHa * hectares;
              }, 0);
              const totalCost = bioCost + chemCost;
              return (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Custo Total Estimado</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">R$ {totalCost.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground">{hectares} ha — R$ {(totalCost / hectares).toFixed(0)}/ha</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowCompatibility(true)}
              >
                📋 Compatibilidade
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleGeneratePdf}
              >
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </Button>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleSaveAsOS}
              disabled={savingOS || !talhaoId}
            >
              {savingOS ? 'Salvando...' : '💾 Salvar como Ordem de Serviço'}
            </Button>
            {!talhaoId && (
              <p className="text-[10px] text-muted-foreground text-center">
                Para salvar como OS, acesse o fluxo biológico a partir de um talhão.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Navigation Footer (matches CoffeeNavigation pattern) ─── */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border relative z-20 bg-background">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Sair' : 'Voltar'}
        </Button>

        <span className="text-xs text-muted-foreground">
          {STEP_CONFIG[step].label}
        </span>

        {step < 2 ? (
          <Button
            onClick={handleNext}
            disabled={!canAdvance}
            className="gap-2"
          >
            Avançar
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => navigate(prefixRoute('/coffee'))}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            Concluir
          </Button>
        )}
      </div>

      {/* Conflict Modal */}
      <Dialog open={showConflictModal} onOpenChange={setShowConflictModal}>
        <DialogContent className="border-destructive/30 max-w-md">
          <DialogHeader>
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <DialogTitle className="text-center text-destructive text-lg">⚠️ Conflito de Tanque</DialogTitle>
            <DialogDescription className="text-center text-sm mt-2">
              A adição de <strong>fungicidas químicos</strong> inativará o agente biológico.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold mb-1 text-destructive">🔬 Base técnica:</p>
            <p>Fungicidas à base de cobre, mancozeb e triazóis são letais para fungos entomopatogênicos.</p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" className="w-full" onClick={() => { setShowConflictModal(false); setShowCompatibility(true); }}>
              📋 Consultar Compatibilidade
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowConflictModal(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
