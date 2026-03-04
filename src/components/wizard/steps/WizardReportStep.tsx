import { useRef, useMemo, useState } from 'react';
import {
  FileText,
  Download,
  MessageCircle,
  Mail,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { useWizard } from '@/contexts/WizardContext';
import { useInsumos } from '@/hooks/useInsumos';
import { toast } from 'sonner';
import { PRODUCTIVITY_LEVELS, calcularCalagem, calcularAdubacaoPlantio, calcularCobertura, calcularCorrecaoPotassio } from '@/types/recommendation';
import { calculateApplicationCost } from '@/types/spraying';
import { LOGO_URL } from '@/lib/constants';

// Print styles for A4 document
const printStyles = `
@media print {
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: black !important;
    font-size: 9pt !important;
  }
  .print-hide, nav, aside, [data-sidebar], [role="navigation"] {
    display: none !important;
  }
  .doc-container {
    width: 100% !important;
    max-width: 186mm !important;
    margin: 0 auto !important;
    padding: 0 !important;
  }
  .doc-container table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 8pt !important;
  }
  .doc-container th, .doc-container td {
    padding: 3pt 5pt !important;
    border: 0.5pt solid #999 !important;
  }
  .doc-container th {
    background: #e8e8e8 !important;
    font-weight: 700 !important;
  }
  .doc-container h2 { font-size: 13pt !important; }
  .doc-container h3 { font-size: 11pt !important; }
  .doc-container p, .doc-container li, .doc-container span { font-size: 9pt !important; }
  .doc-step-box { break-inside: avoid !important; page-break-inside: avoid !important; }
}
`;

interface ReportItem {
  produto: string;
  categoria: string;
  doseHa: string;
  quantidadeTotal: string;
  custoUnitario: number;
  subtotal: number;
  quando?: string;
  como?: string;
}

interface ReportSection {
  title: string;
  items: ReportItem[];
  subtotal: number;
  quandoGeral?: string;
  comoGeral?: string;
}

export function WizardReportStep() {
  const { wizardData } = useWizard();
  const { insumos: insumosDB } = useInsumos();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [loteName, setLoteName] = useState('');
  const [sectorRef, setSectorRef] = useState('');

  const hectares = wizardData.hectares || 10;

  const ctc = useMemo(() => {
    if (!wizardData.soil) return 0;
    const kCmolc = wizardData.soil.k / 391;
    return wizardData.soil.ca + wizardData.soil.mg + kCmolc + wizardData.soil.hAl;
  }, [wizardData.soil]);

  const recommendations = useMemo(() => {
    if (!wizardData.soil) return null;
    const calagem = calcularCalagem(wizardData.soil.vPercent, 65, ctc, hectares);
    const adubacaoPlantio = calcularAdubacaoPlantio(wizardData.soil.p, wizardData.soil.k, hectares, 'media');
    const nFornecido = adubacaoPlantio.quantidadePorHectare * 0.08;
    const k2oFornecido = adubacaoPlantio.quantidadePorHectare * 0.16;
    const cobertura = calcularCobertura(wizardData.soil.mo, hectares, 'media', nFornecido);
    const correcaoK = calcularCorrecaoPotassio(wizardData.soil.k, ctc, hectares, 'media', k2oFornecido);
    return { calagem, adubacaoPlantio, cobertura, correcaoK };
  }, [wizardData.soil, ctc, hectares]);

  // Build report sections (same logic as before)
  const sections = useMemo<ReportSection[]>(() => {
    const result: ReportSection[] = [];

    // 1. Correção de Solo (Calagem)
    const correcaoItems: ReportItem[] = [];
    if (recommendations?.calagem && recommendations.calagem.quantidadePorHectare > 0) {
      correcaoItems.push({
        produto: recommendations.calagem.produto,
        categoria: 'Correção de pH',
        doseHa: `${recommendations.calagem.quantidadePorHectare.toFixed(2)} t/ha`,
        quantidadeTotal: `${recommendations.calagem.quantidadeTotalArea.toFixed(2)} t`,
        custoUnitario: recommendations.calagem.valorUnitario,
        subtotal: recommendations.calagem.valorTotal,
        quando: 'Aplicar 60 a 90 dias antes do plantio.',
        como: 'Distribuir a lanço e incorporar com grade a 20-30 cm.'
      });
    }
    if (recommendations?.correcaoK && recommendations.correcaoK.quantidadePorHectare > 0) {
      correcaoItems.push({
        produto: recommendations.correcaoK.produto,
        categoria: 'Correção de Potássio',
        doseHa: `${recommendations.correcaoK.quantidadePorHectare.toFixed(0)} kg/ha`,
        quantidadeTotal: `${recommendations.correcaoK.quantidadeTotalArea.toFixed(0)} kg`,
        custoUnitario: recommendations.correcaoK.valorUnitario,
        subtotal: recommendations.correcaoK.valorTotal,
        quando: 'Aplicar 30 a 45 dias antes do plantio.',
        como: 'Aplicar a lanço com distribuidor calibrado.'
      });
    }
    result.push({ title: 'Calagem / Correção de Solo', items: correcaoItems, subtotal: correcaoItems.reduce((a, i) => a + i.subtotal, 0), quandoGeral: 'Iniciar 60 a 90 dias antes do plantio.', comoGeral: 'Distribuir uniformemente a lanço e incorporar.' });

    // 2. Plantio
    const plantioItems: ReportItem[] = [];
    if (wizardData.seed?.seed) {
      const seedPrice = wizardData.seed.seed.price || 800;
      plantioItems.push({
        produto: `Semente ${wizardData.seed.seed.name}`,
        categoria: `${wizardData.seed.seed.company}`,
        doseHa: `${((wizardData.seed.populationPerHectare || 0) / 1000).toFixed(1)} mil sem/ha`,
        quantidadeTotal: `${(((wizardData.seed.populationPerHectare || 0) * hectares) / 1000).toFixed(0)} mil`,
        custoUnitario: seedPrice,
        subtotal: seedPrice * (hectares / 10),
        quando: 'No dia do plantio com umidade adequada.',
        como: 'Semeadura mecanizada, profundidade 3-5 cm.'
      });
    }
    if (recommendations?.adubacaoPlantio) {
      plantioItems.push({
        produto: recommendations.adubacaoPlantio.produto,
        categoria: 'Adubação de base NPK',
        doseHa: `${recommendations.adubacaoPlantio.quantidadePorHectare.toFixed(0)} kg/ha`,
        quantidadeTotal: `${recommendations.adubacaoPlantio.quantidadeTotalArea.toFixed(0)} kg`,
        custoUnitario: recommendations.adubacaoPlantio.valorUnitario,
        subtotal: recommendations.adubacaoPlantio.valorTotal,
        quando: 'No momento do plantio.',
        como: 'No sulco, 5 cm ao lado e abaixo da semente.'
      });
    }
    result.push({ title: 'Adubação / Fertirrigação', items: plantioItems, subtotal: plantioItems.reduce((a, i) => a + i.subtotal, 0) });

    // 3. Coberturas
    const coberturaItems: ReportItem[] = [];
    if (recommendations?.cobertura && recommendations.cobertura.quantidadePorHectare > 0) {
      // Dynamic parceling based on soil texture
      const moVal = wizardData.soil?.mo || 0;
      const textura = moVal < 15 ? 'arenosa' : moVal <= 30 ? 'media' : 'argilosa';
      const parcelamentoQuando = textura === 'arenosa'
        ? 'V2 (15%), V4 (30%), V6 (30%), V8 (25%) — 4 parcelas (solo arenoso).'
        : textura === 'argilosa'
        ? 'V4 (40%) e V8 (60%) — 2 parcelas (solo argiloso).'
        : 'V2 (20%), V4 (40%), V8 (40%) — 3 parcelas (textura média).';
      coberturaItems.push({
        produto: recommendations.cobertura.produto,
        categoria: 'Cobertura nitrogenada',
        doseHa: `${recommendations.cobertura.quantidadePorHectare.toFixed(0)} kg/ha`,
        quantidadeTotal: `${recommendations.cobertura.quantidadeTotalArea.toFixed(0)} kg`,
        custoUnitario: recommendations.cobertura.valorUnitario,
        subtotal: recommendations.cobertura.valorTotal,
        quando: parcelamentoQuando,
        como: `A lanço entre fileiras, final da tarde.${textura === 'arenosa' ? ' ⚠️ Doses menores e mais frequentes para reduzir lixiviação.' : ''}`,
      });
    }
    result.push({ title: 'Cobertura Nitrogenada', items: coberturaItems, subtotal: coberturaItems.reduce((a, i) => a + i.subtotal, 0) });

    // 4. Pulverização
    const pulverizacaoItems: ReportItem[] = [];
    if (wizardData.spraying && wizardData.spraying.products.length > 0) {
      wizardData.spraying.products.forEach(product => {
        const insumo = insumosDB.find(i => i.id === product.insumoId);
        const costPerUnit = insumo ? insumo.preco / insumo.tamanhoUnidade : 0;
        pulverizacaoItems.push({
          produto: product.name,
          categoria: product.type,
          doseHa: `${product.doseInput} ${product.unit}`,
          quantidadeTotal: `${product.totalQuantity.toFixed(2)} L`,
          custoUnitario: costPerUnit,
          subtotal: costPerUnit * product.totalQuantity,
        });
      });
      const appCost = calculateApplicationCost(
        wizardData.spraying.equipment.type,
        wizardData.spraying.costs,
        hectares,
        wizardData.spraying.equipment.tankCapacity,
        wizardData.spraying.equipment.applicationRate
      );
      if (appCost > 0) {
        const eqNames: Record<string, string> = { trator: 'Trator', drone: 'Drone', bomba_costal: 'Bomba Costal' };
        pulverizacaoItems.push({
          produto: `Custo de Aplicação (${eqNames[wizardData.spraying.equipment.type]})`,
          categoria: 'Serviço operacional',
          doseHa: '-',
          quantidadeTotal: `${hectares} ha`,
          custoUnitario: appCost / hectares,
          subtotal: appCost
        });
      }
    }
    result.push({ title: 'Pulverização', items: pulverizacaoItems, subtotal: pulverizacaoItems.reduce((a, i) => a + i.subtotal, 0) });

    // 5. Custos Operacionais
    if (wizardData.costs && wizardData.costs.totalCost > 0) {
      const opItems: ReportItem[] = [];
      wizardData.costs.operations.forEach(op => {
        if (op.hoursPerHa > 0) {
          const cph = wizardData.costs!.tractorType === 'proprio' ? wizardData.costs!.costPerHourOwn : wizardData.costs!.costPerHourRent;
          opItems.push({ produto: op.name, categoria: `Trator ${wizardData.costs!.tractorType}`, doseHa: `${op.hoursPerHa.toFixed(1)} h/ha`, quantidadeTotal: `${(op.hoursPerHa * hectares).toFixed(1)} h`, custoUnitario: cph, subtotal: op.hoursPerHa * cph * hectares });
        }
      });
      if (wizardData.costs.irrigationCostPerHa > 0) {
        opItems.push({ produto: 'Irrigação', categoria: 'Custo operacional', doseHa: `R$ ${wizardData.costs.irrigationCostPerHa.toFixed(2)}/ha`, quantidadeTotal: `${hectares} ha`, custoUnitario: wizardData.costs.irrigationCostPerHa, subtotal: wizardData.costs.irrigationCostPerHa * hectares });
      }
      if (wizardData.costs.tarpaulinM2 > 0) {
        opItems.push({ produto: 'Lona de Cobertura', categoria: 'Material', doseHa: `${(wizardData.costs.tarpaulinM2 / hectares).toFixed(1)} m²/ha`, quantidadeTotal: `${wizardData.costs.tarpaulinM2} m²`, custoUnitario: wizardData.costs.tarpaulinCostPerM2, subtotal: wizardData.costs.tarpaulinM2 * wizardData.costs.tarpaulinCostPerM2 });
      }
      wizardData.costs.labor.forEach(labor => {
        if (labor.quantity > 0 && labor.unitCost > 0) {
          opItems.push({ produto: labor.description, categoria: labor.type === 'fixed' ? 'Mão de obra fixa' : 'Diária', doseHa: '-', quantidadeTotal: `${labor.quantity} ${labor.type === 'fixed' ? 'mês(es)' : 'diária(s)'}`, custoUnitario: labor.unitCost, subtotal: labor.quantity * labor.unitCost });
        }
      });
      if (opItems.length > 0) {
        result.push({ title: 'Custos Operacionais', items: opItems, subtotal: opItems.reduce((a, i) => a + i.subtotal, 0) });
      }
    }

    return result;
  }, [wizardData, recommendations, insumosDB, hectares]);

  const totals = useMemo(() => {
    const custoTotal = sections.reduce((acc, s) => acc + s.subtotal, 0);
    const custoHectare = hectares > 0 ? custoTotal / hectares : 0;
    const produtividade = 37.5;
    const producaoTotal = produtividade * hectares;
    const custoTonelada = producaoTotal > 0 ? custoTotal / producaoTotal : 0;
    const precoTonelada = 180;
    const pontoEquilibrio = precoTonelada > 0 ? custoTotal / precoTonelada : 0;
    return { custoTotal, custoHectare, produtividade, producaoTotal, custoTonelada, pontoEquilibrio };
  }, [sections, hectares]);

  // PDF Generation
  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const el = reportRef.current;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 850,
      });

      // Gather break points while element is still in its current layout
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

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = pdfHeight - margin * 2;
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
          if (remaining <= maxSlicePx * 1.15) {
            slices.push({ srcY: currentY, srcH: remaining });
            break;
          }

          const idealEnd = currentY + maxSlicePx;
          let bestBreak = idealEnd;
          let bestDist = Infinity;

          for (const bp of sortedBreaks) {
            if (bp <= currentY + 30 * canvasScale) continue;
            if (bp > idealEnd + maxSlicePx * 0.05) break;
            const dist = idealEnd - bp;
            const absDist = Math.abs(dist);
            const penalty = dist < 0 ? absDist * 3 : absDist;
            if (penalty < bestDist) {
              bestDist = penalty;
              bestBreak = bp;
            }
          }

          bestBreak = Math.min(bestBreak, canvas.height);
          slices.push({ srcY: currentY, srcH: bestBreak - currentY });
          currentY = bestBreak;
        }

        const totalPages = slices.length;
        slices.forEach((slice, page) => {
          if (page > 0) pdf.addPage();
          const destH = (slice.srcH / canvas.height) * imgHeight;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = slice.srcH;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, slice.srcY, canvas.width, slice.srcH, 0, 0, canvas.width, slice.srcH);
            pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, destH);
          }

          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(`Solo V3 • Página ${page + 1}/${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
        });
      }

      pdf.save(`relatorio-tecnico-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const message = `*📋 RELATÓRIO TÉCNICO AGRONÔMICO*\n*Área:* ${hectares} ha\n${clientName ? `*Cliente:* ${clientName}\n` : ''}${loteName ? `*Lote:* ${loteName}\n` : ''}\n*💰 RESUMO FINANCEIRO*\n• Custo Total: R$ ${totals.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Custo/ha: R$ ${totals.custoHectare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n*📋 ETAPAS*\n${sections.map((s, i) => `${i + 1}º - ${s.title}: R$ ${s.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')}\n\n${technicalNotes ? `*📝 Observações:*\n${technicalNotes}\n` : ''}\n_Relatório gerado pelo Solo V3. 2026_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `Relatório Técnico Agronômico - ${new Date().toLocaleDateString('pt-BR')}`;
    const body = `RELATÓRIO TÉCNICO AGRONÔMICO\nÁrea: ${hectares} ha\n${clientName ? `Cliente: ${clientName}\n` : ''}${loteName ? `Lote: ${loteName}\n` : ''}\nRESUMO FINANCEIRO\n- Custo Total: R$ ${totals.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Custo/ha: R$ ${totals.custoHectare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nDETALHAMENTO\n${sections.map((s, i) => `${i + 1}º - ${s.title}: R$ ${s.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')}\n\n${technicalNotes ? `OBSERVAÇÕES:\n${technicalNotes}\n` : ''}\n---\nRelatório gerado pelo Solo V3. 2026`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const isDataComplete = wizardData.soil !== null;

  if (!isDataComplete) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">Relatório Técnico</h2>
          <p className="text-muted-foreground mt-2">Complete os passos anteriores para gerar o relatório completo</p>
        </div>
        <div className="bg-white text-gray-800 border border-gray-300 rounded p-6 text-center">
          <p>Os dados de Análise de Solo são obrigatórios para gerar o relatório.</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('pt-BR');
  const populationPerHa = wizardData.seed?.populationPerHectare || 0;
  const rowSpacing = wizardData.seed?.rowSpacing || 0;
  const seedsPerMeter = wizardData.seed?.seedsPerMeter || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* Action bar - hidden in print */}
      <div className="flex flex-wrap gap-3 justify-center print-hide">
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} variant="outline" className="border-gray-400 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
          <Download className="h-4 w-4 mr-2" />
          {isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}
        </Button>
        <Button variant="outline" onClick={handleShareWhatsApp} className="border-gray-400 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
        <Button variant="outline" onClick={handleShareEmail} className="border-gray-400 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="border-gray-400 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Editable client info - hidden in print, shown in the doc */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print-hide">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do Cliente</label>
          <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-3 py-2 rounded border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço / Localidade</label>
          <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Ex: Fazenda Boa Vista, Patrocínio-MG" className="w-full px-3 py-2 rounded border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Lote / Talhão</label>
          <input type="text" value={loteName} onChange={e => setLoteName(e.target.value)} placeholder="Ex: Lote 12 - Talhão A" className="w-full px-3 py-2 rounded border border-border bg-background text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Referência do Setor</label>
          <input type="text" value={sectorRef} onChange={e => setSectorRef(e.target.value)} placeholder="Ex: Setor Norte" className="w-full px-3 py-2 rounded border border-border bg-background text-foreground text-sm" />
        </div>
      </div>

      {/* === DOCUMENT BODY === */}
      <div ref={reportRef} className="doc-container bg-white text-gray-900 rounded-lg shadow-sm border border-gray-200 mx-auto" style={{ maxWidth: '210mm', fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}>
        <div className="p-6 md:p-10 space-y-6">

          {/* ===== HEADER ===== */}
          <div className="border-b-2 border-gray-800 pb-4">
            <div className="flex items-center justify-between mb-4">
              <img src={LOGO_URL} alt="Solo" className="h-12 object-contain" />
              <div className="text-right text-xs text-gray-500">
                <p>Data: {today}</p>
                <p>Área: {hectares} ha</p>
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight text-center uppercase">
              Relatório Técnico Agronômico
            </h1>
            <p className="text-center text-sm text-gray-500 mt-1">Planejamento de Manejo e Adubação</p>
          </div>

          {/* ===== CLIENT INFO ===== */}
          <div className="doc-step-box">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
              Informações do Cliente
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="font-semibold text-gray-700">Nome:</span> <span className="text-gray-900">{clientName || '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Lote:</span> <span className="text-gray-900">{loteName || '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Endereço:</span> <span className="text-gray-900">{clientAddress || '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Data:</span> <span className="text-gray-900">{today}</span></div>
              <div><span className="font-semibold text-gray-700">Nº de plantas:</span> <span className="text-gray-900">{populationPerHa > 0 ? `${(populationPerHa * hectares).toLocaleString('pt-BR')} (${(populationPerHa / 1000).toFixed(1)} mil/ha)` : '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Área total:</span> <span className="text-gray-900">{hectares} ha</span></div>
              <div><span className="font-semibold text-gray-700">Espaçamento:</span> <span className="text-gray-900">{rowSpacing > 0 ? `${rowSpacing} cm entre linhas / ${seedsPerMeter > 0 ? `${seedsPerMeter} sem/m` : '—'}` : '—'}</span></div>
              <div><span className="font-semibold text-gray-700">Ref. do Setor:</span> <span className="text-gray-900">{sectorRef || '—'}</span></div>
            </div>
          </div>

          {/* ===== TEXTURA ESTIMADA via M.O. ===== */}
          {wizardData.soil && wizardData.soil.mo > 0 && (() => {
            const moVal = wizardData.soil!.mo;
            const textura = moVal < 15 ? 'arenosa' : moVal <= 30 ? 'media' : 'argilosa';
            const texConfig: Record<string, { bg: string; border: string; color: string; emoji: string; label: string; tip: string }> = {
              arenosa: { bg: 'bg-amber-50', border: 'border-amber-400', color: 'text-amber-800', emoji: '🏜️', label: 'ARENOSA', tip: 'Solo arenoso: cobertura parcelada em 4 aplicações (V2, V4, V6, V8) para minimizar perdas por lixiviação. P₂O₅ reduzido em 10%. Atenção ao Boro.' },
              media: { bg: 'bg-emerald-50', border: 'border-emerald-400', color: 'text-emerald-800', emoji: '🌱', label: 'MÉDIA', tip: 'Textura equilibrada. Cobertura em 3 aplicações (V2, V4, V8). Dose padrão de Fósforo mantida.' },
              argilosa: { bg: 'bg-rose-50', border: 'border-rose-400', color: 'text-rose-800', emoji: '🧱', label: 'ARGILOSA', tip: 'Solo argiloso retém nutrientes. Cobertura em 2 aplicações (V4, V8). P₂O₅ ajustado +25% por fixação.' },
            };
            const tc = texConfig[textura];
            return (
              <div className={`doc-step-box p-4 rounded-lg border-2 ${tc.bg} ${tc.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{tc.emoji}</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Textura Estimada (via M.O.)</h2>
                </div>
                <p className={`text-sm font-extrabold ${tc.color} mb-1`}>{tc.label}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{tc.tip}</p>
                <p className="text-[10px] text-gray-400 mt-1 italic">
                  M.O. = {moVal.toFixed(1)} g/dm³ · Classificação baseada na relação M.O. × Textura
                </p>
                {textura === 'arenosa' && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-amber-100 border border-amber-300">
                    <span className="text-xs">⚠</span>
                    <p className="text-[10px] text-amber-700 font-medium">Risco de Lixiviação de Boro — Monitorar nível foliar e repor via adubação foliar complementar.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ===== NUMBERED STEPS ===== */}
          {sections.map((section, index) => (
            <div key={section.title} className="doc-step-box">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                {index + 1}º Passo — {section.title}
              </h2>

              {section.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase">Produto</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase">Dose/ha</th>
                        <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 text-xs uppercase">Qtd. Total</th>
                        <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 text-xs uppercase">Custo Unit.</th>
                        <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 text-xs uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-3 py-2">
                            <span className="font-medium text-gray-900">{item.produto}</span>
                            <br />
                            <span className="text-xs text-gray-500">{item.categoria}</span>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 font-mono text-gray-800">{item.doseHa}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono text-gray-800">{item.quantidadeTotal}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right text-gray-800">R$ {item.custoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="border border-gray-300 px-3 py-2 font-semibold text-gray-700 text-right">Total da Etapa:</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-900">R$ {section.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Nenhuma necessidade identificada para esta etapa com base na análise de solo.</p>
              )}

              {/* Quando / Como */}
              {(section.quandoGeral || section.comoGeral) && (
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  {section.quandoGeral && <p><strong>Quando:</strong> {section.quandoGeral}</p>}
                  {section.comoGeral && <p><strong>Como:</strong> {section.comoGeral}</p>}
                </div>
              )}

              {/* Item-specific details */}
              {section.items.some(item => item.quando || item.como) && (
                <div className="mt-2 space-y-1 text-sm">
                  {section.items.filter(item => item.quando || item.como).map((item, idx) => (
                    <div key={idx} className="pl-3 border-l-2 border-gray-300 text-gray-600">
                      <span className="font-medium text-gray-700">{item.produto}:</span>
                      {item.quando && <span> <strong>Quando:</strong> {item.quando}</span>}
                      {item.como && <span> <strong>Como:</strong> {item.como}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* ===== FERTIGATION MONTHLY TABLE ===== */}
          {recommendations && (() => {
            // Phenological absorption weights per month (Sep-Mar typical corn cycle)
            const monthWeights: { mes: string; peso: number }[] = [
              { mes: 'Setembro', peso: 0.05 },
              { mes: 'Outubro', peso: 0.10 },
              { mes: 'Novembro', peso: 0.20 },
              { mes: 'Dezembro', peso: 0.25 },
              { mes: 'Janeiro', peso: 0.20 },
              { mes: 'Fevereiro', peso: 0.15 },
              { mes: 'Março', peso: 0.05 },
            ];

            // Total doses per hectare (kg/ha) derived from recommendations
            const ureiaTotal = recommendations.cobertura?.quantidadePorHectare || 0; // Ureia for N coverage
            const kclTotal = recommendations.correcaoK?.quantidadePorHectare || 0; // KCl for K correction
            const mapTotal = recommendations.adubacaoPlantio?.quantidadePorHectare || 0; // MAP base
            const calcinitTotal = Math.max(0, (ureiaTotal * 0.15)); // ~15% of N via Calcinit (Ca+N)
            const sulfatoZnTotal = wizardData.soil ? Math.max(0, 3 - wizardData.soil.zn) * 5 : 0; // Sulfato de Zn
            const sulfatoMnTotal = wizardData.soil ? Math.max(0, 5 - wizardData.soil.mn) * 3 : 0; // Sulfato de Mn
            const acidoBoricoTotal = wizardData.soil ? Math.max(0, 0.6 - wizardData.soil.b) * 4 : 0; // Ácido Bórico

            const allZero = ureiaTotal === 0 && kclTotal === 0 && mapTotal === 0;

            // Totals row
            const totalUreia = ureiaTotal * hectares;
            const totalKcl = kclTotal * hectares;
            const totalMap = mapTotal * hectares;
            const totalCalcinit = calcinitTotal * hectares;
            const totalSulfatos = (sulfatoZnTotal + sulfatoMnTotal) * hectares;
            const totalAcidoBorico = acidoBoricoTotal * hectares;

            const fmt = (v: number) => v > 0 ? v.toFixed(1) : '—';

            return (
              <div className="doc-step-box">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                  Cronograma Mensal de Fertirrigação (kg/ha)
                </h2>
                {allZero ? (
                  <p className="text-sm text-gray-500 italic">Nenhuma recomendação de fertirrigação calculada. Preencha os dados de solo e insumos.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase">Mês</th>
                            <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Ureia</th>
                            <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 text-xs uppercase">KCl</th>
                            <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 text-xs uppercase">MAP</th>
                            <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Calcinit</th>
                            <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Sulfatos</th>
                            <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 text-xs uppercase">Ác. Bórico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthWeights.map((mw, idx) => (
                            <tr key={mw.mes} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-2 py-1.5 font-medium text-gray-900">{mw.mes}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-gray-800">{fmt(ureiaTotal * mw.peso)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-gray-800">{fmt(kclTotal * mw.peso)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-gray-800">{fmt(mapTotal * mw.peso)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-gray-800">{fmt(calcinitTotal * mw.peso)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-gray-800">{fmt((sulfatoZnTotal + sulfatoMnTotal) * mw.peso)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-gray-800">{fmt(acidoBoricoTotal * mw.peso)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-200">
                            <td className="border border-gray-300 px-2 py-2 font-bold text-gray-800 uppercase text-xs">Total/ha</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-900">{fmt(ureiaTotal)}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-900">{fmt(kclTotal)}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-900">{fmt(mapTotal)}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-900">{fmt(calcinitTotal)}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-900">{fmt(sulfatoZnTotal + sulfatoMnTotal)}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-900">{fmt(acidoBoricoTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Compact purchase table below */}
                    <div className="mt-3">
                      <h3 className="text-xs font-bold uppercase text-gray-600 mb-1">Total a comprar para {hectares} ha:</h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                        {[
                          { nome: 'Ureia', total: totalUreia, unidade: totalUreia > 1000 ? `${(totalUreia / 50).toFixed(0)} Sc 50kg` : `${totalUreia.toFixed(1)} kg` },
                          { nome: 'KCl', total: totalKcl, unidade: totalKcl > 1000 ? `${(totalKcl / 50).toFixed(0)} Sc 50kg` : `${totalKcl.toFixed(1)} kg` },
                          { nome: 'MAP', total: totalMap, unidade: totalMap > 1000 ? `${(totalMap / 50).toFixed(0)} Sc 50kg` : `${totalMap.toFixed(1)} kg` },
                          { nome: 'Calcinit', total: totalCalcinit, unidade: totalCalcinit > 500 ? `${(totalCalcinit / 25).toFixed(0)} Sc 25kg` : `${totalCalcinit.toFixed(1)} kg` },
                          { nome: 'Sulfatos', total: totalSulfatos, unidade: `${totalSulfatos.toFixed(1)} kg` },
                          { nome: 'Ác. Bórico', total: totalAcidoBorico, unidade: `${totalAcidoBorico.toFixed(1)} kg` },
                        ].filter(p => p.total > 0).map((p, idx) => (
                          <div key={idx} className="border border-gray-300 rounded p-2 text-center bg-gray-50">
                            <p className="font-semibold text-gray-700">{p.nome}</p>
                            <p className="font-bold text-gray-900">{p.unidade}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ===== TOTAL A COMPRAR (shopping list) ===== */}
          <div className="doc-step-box">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
              Total a Comprar
            </h2>
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase">Produto</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 text-xs uppercase">Quantidade</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 text-xs uppercase">Custo Estimado</th>
                </tr>
              </thead>
              <tbody>
                {sections.flatMap(s => s.items).filter(i => i.subtotal > 0).map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-1.5 text-gray-900">{item.produto}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-right font-mono text-gray-800">{item.quantidadeTotal}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-right font-semibold text-gray-900">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200">
                  <td colSpan={2} className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-800 uppercase">Investimento Total:</td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-900 text-base">R$ {totals.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
              <div><strong>Custo/ha:</strong> R$ {totals.custoHectare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div><strong>Custo/ton:</strong> R$ {totals.custoTonelada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div><strong>Produtividade est.:</strong> {totals.produtividade} t/ha</div>
              <div><strong>Ponto equilíbrio:</strong> {totals.pontoEquilibrio.toFixed(1)} ton</div>
            </div>
          </div>

          {/* ===== SPRAYING INSTRUCTIONS ===== */}
          {wizardData.spraying && wizardData.spraying.products.length > 0 && (() => {
            const equipType = wizardData.spraying!.equipment.type;
            const tankCapacity = wizardData.spraying!.equipment.tankCapacity;
            const applicationRate = wizardData.spraying!.equipment.applicationRate;
            const eqNames: Record<string, string> = { trator: 'Trator', drone: 'Drone', bomba_costal: 'Bomba Costal (20L)' };
            const areaCoveredPerTank = applicationRate > 0 ? tankCapacity / applicationRate : 0;
            const bombasPerHectare = applicationRate > 0 ? applicationRate / tankCapacity : 0;
            const numberOfTanks = areaCoveredPerTank > 0 ? Math.ceil(hectares / areaCoveredPerTank) : 0;

            return (
              <div className="doc-step-box">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                  Orientações de Pulverização — {eqNames[equipType]}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Equipamento</p>
                    <p className="font-semibold text-gray-900">{eqNames[equipType]}</p>
                  </div>
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Tanque</p>
                    <p className="font-semibold text-gray-900">{tankCapacity} L</p>
                  </div>
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Taxa</p>
                    <p className="font-semibold text-gray-900">{applicationRate} L/ha</p>
                  </div>
                  <div className="border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Nº Tanques</p>
                    <p className="font-semibold text-gray-900">{numberOfTanks}</p>
                  </div>
                </div>

                <table className="w-full text-sm border-collapse border border-gray-300 mb-3">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Produto</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Tipo</th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-xs uppercase font-semibold text-gray-700">Dose/ha</th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-xs uppercase font-semibold text-gray-700">Por Tanque</th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-xs uppercase font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wizardData.spraying!.products.map((product, idx) => {
                      const qtyPerTank = product.quantityPerTank;
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-3 py-1.5 font-medium text-gray-900">{product.name}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{product.type}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right font-mono text-gray-800">{product.doseInput} {product.unit}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right font-mono font-semibold text-gray-900">{qtyPerTank.toFixed(2)} {product.unit.includes('kg') || product.unit.includes('g') ? 'kg' : 'L'}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right font-mono text-gray-800">{product.totalQuantity.toFixed(2)} {product.unit.includes('kg') || product.unit.includes('g') ? 'kg' : 'L'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Instruções de Preparo:</strong></p>
                  <ol className="list-decimal list-inside space-y-0.5 text-gray-600 pl-2">
                    <li>Encha o {equipType === 'bomba_costal' ? 'reservatório' : 'tanque'} com água até ~70% da capacidade ({(tankCapacity * 0.7).toFixed(0)}L).</li>
                    <li>Adicione os produtos na ordem: pós → líquidos → adjuvantes, agitando após cada adição.</li>
                    <li>Complete o volume até {tankCapacity}L.</li>
                    <li>Cada {equipType === 'bomba_costal' ? 'bomba' : 'tanque'} cobre {areaCoveredPerTank.toFixed(equipType === 'bomba_costal' ? 3 : 2)} ha.</li>
                    <li>Para {hectares} ha serão necessários aproximadamente {numberOfTanks} {equipType === 'bomba_costal' ? 'bombadas' : 'tanques'}.</li>
                  </ol>
                </div>
              </div>
            );
          })()}

          {/* ===== FOLIAR ANALYSIS ===== */}
          {wizardData.foliar && (wizardData.foliar.analysisResults || wizardData.foliar.visualDeficiencies) && (() => {
            const foliar = wizardData.foliar;
            const isVisual = foliar.mode === 'visual';
            return (
              <div className="doc-step-box">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
                  Análise Foliar — Estádio {foliar.phenologicalStage}
                </h2>
                <p className="text-xs text-gray-500 mb-2">{isVisual ? 'Diagnóstico visual por IA' : 'Análise laboratorial'}</p>

                {!isVisual && foliar.analysisResults && (
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Nutriente</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs uppercase font-semibold text-gray-700">Valor</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs uppercase font-semibold text-gray-700">Faixa Ideal</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs uppercase font-semibold text-gray-700">Status</th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Produto</th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Dose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foliar.analysisResults.map((r: any, idx: number) => (
                        <tr key={r.nutrient} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-3 py-1.5 font-medium text-gray-900">{r.nutrient}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center font-mono text-gray-800">{r.value} {r.unit}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-500">{r.min}-{r.max}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.status === 'deficiente' ? 'bg-red-100 text-red-800' : r.status === 'excesso' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                              {r.status === 'deficiente' ? 'DEFICIENTE' : r.status === 'excesso' ? 'EXCESSO' : 'ADEQUADO'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{r.status === 'deficiente' ? r.produto : '—'}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{r.status === 'deficiente' ? r.dose : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {isVisual && foliar.visualDeficiencies && foliar.visualDeficiencies.length > 0 && (
                  <>
                    {foliar.resumo && <p className="text-sm text-gray-600 italic mb-2">{foliar.resumo}</p>}
                    <table className="w-full text-sm border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Nutriente</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-xs uppercase font-semibold text-gray-700">Severidade</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-xs uppercase font-semibold text-gray-700">Confiança</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Produto</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs uppercase font-semibold text-gray-700">Dose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {foliar.visualDeficiencies.map((def, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-3 py-1.5 font-medium text-gray-900">{def.nutriente} ({def.simbolo})</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800">{def.severidade}</span>
                            </td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center font-mono text-gray-800">{(def.confianca * 100).toFixed(0)}%</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{def.produto_recomendado}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{def.dose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {isVisual && foliar.visualDeficiencies && foliar.visualDeficiencies.length === 0 && (
                  <p className="text-sm text-green-700 font-medium">✓ Nenhuma deficiência detectada — Planta aparentemente saudável.</p>
                )}

                {foliar.disclaimer && (
                  <p className="text-xs text-gray-500 mt-2 italic">⚠️ {foliar.disclaimer}</p>
                )}
              </div>
            );
          })()}

          {/* ===== OBSERVAÇÕES ===== */}
          <div className="doc-step-box">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">
              Observações
            </h2>
            <Textarea
              placeholder="Controle de pragas, plantas daninhas, recomendações especiais..."
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              className="min-h-[80px] resize-none bg-white text-gray-800 border-gray-300 focus:border-gray-500 text-sm"
            />
            <div className="mt-3 p-3 border-2 border-gray-800 rounded text-center">
              <p className="font-bold text-gray-900 text-sm uppercase">
                ⚠️ UTILIZAR EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI) EM TODAS AS APLICAÇÕES
              </p>
            </div>
          </div>

          {/* ===== SIGNATURE & SOURCES ===== */}
          <div className="doc-step-box border-t border-gray-300 pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-b border-gray-800 w-48 mx-auto mb-1 mt-8"></div>
                <p className="text-sm font-semibold text-gray-700">Responsável Técnico</p>
                <p className="text-xs text-gray-500">CREA / CFTA</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-800 w-48 mx-auto mb-1 mt-8"></div>
                <p className="text-sm font-semibold text-gray-700">Produtor</p>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600 uppercase">Fontes Consultadas:</p>
              <p>EMBRAPA — Empresa Brasileira de Pesquisa Agropecuária</p>
              <p>ESALQ/USP — Escola Superior de Agricultura "Luiz de Queiroz"</p>
              <p>INCAPER — Instituto Capixaba de Pesquisa, Assistência Técnica e Extensão Rural</p>
              <p>IAC — Instituto Agronômico de Campinas</p>
            </div>

            <div className="mt-4 text-center text-xs text-gray-400 border-t border-gray-200 pt-3">
              <p>Relatório gerado pelo Solo V3. 2026</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
